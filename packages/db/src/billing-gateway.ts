import { PrismaClient, Prisma } from '@prisma/client';
import { encryptString, decryptString, calendarDateKey, dateKey, zonedDateTime } from '@peanut/utils';
import { timingSafeEqual, createHash } from 'node:crypto';
import { AsaasProvider, BillingProvider, BillingProviderError, asaasPaymentUrl } from './asaas';
import { ContractBillingError } from './contract-billing';

type Db = PrismaClient;
const fail = (message: string): never => { throw new ContractBillingError(message); };
const cents = (value: any) => new Prisma.Decimal(value).mul(100).toDecimalPlaces(0).toNumber();
const publicConnection = (row: any) => ({ id: row.id, provider: row.provider, environment: row.environment, enabled: row.enabled, revision: row.revision,
  hasApiKey: !!row.apiKeyEncrypted, hasWebhookToken: !!row.webhookTokenEncrypted });
export async function listBillingConnections(db: Db, workspaceId: string) { return (await db.billingConnection.findMany({ where: { workspaceId }, orderBy: { environment: 'asc' } })).map(publicConnection); }
function decrypt(value: string | null) {
  if (!value?.startsWith('v1:gcm:')) return fail('Credencial inválida. Salve novamente a configuração.');
  try { return decryptString(value); } catch { return fail('Não foi possível abrir a credencial. Confira a chave mestra do servidor.'); }
}
export function billingProvider(connection: any): BillingProvider {
  if (connection.provider !== 'ASAAS') return fail('Provedor ainda não implementado.');
  return new AsaasProvider(connection.environment, decrypt(connection.apiKeyEncrypted));
}
export async function saveBillingConnection(db: Db, workspaceId: string, actorUserId: string, input: any) {
  if (input.provider !== 'ASAAS' || !['SANDBOX', 'PRODUCTION'].includes(input.environment) || typeof input.enabled !== 'boolean' || !Number.isInteger(input.revision)) return fail('Configuração de provedor inválida.');
  for (const key of ['apiKey', 'webhookToken']) if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 1000 || /\s/.test(input[key]))) return fail('Credencial inválida.');
  if (input.webhookToken && (input.webhookToken.length < 32 || input.webhookToken.length > 255 || input.webhookToken.startsWith('$aact'))) return fail('O token do webhook deve ter 32–255 caracteres, sem espaços, e ser diferente da chave de API.');
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const where = { workspaceId_provider_environment: { workspaceId, provider: input.provider, environment: input.environment } };
    const before = await tx.billingConnection.findUnique({ where });
    if ((before?.revision || 0) !== input.revision) return fail('A configuração mudou. Recarregue antes de salvar.');
    if (before && await tx.billingCharge.count({ where: { connectionId: before.id, state: 'CREATING' } })) return fail('Aguarde a criação de cobranças em andamento antes de alterar a conexão.');
    let apiKeyEncrypted = before?.apiKeyEncrypted || null, webhookTokenEncrypted = before?.webhookTokenEncrypted || null;
    try { if (input.apiKey) apiKeyEncrypted = encryptString(input.apiKey); if (input.webhookToken) webhookTokenEncrypted = encryptString(input.webhookToken); }
    catch { return fail('Configure APP_ENCRYPTION_KEY no servidor antes de salvar credenciais.'); }
    if (input.enabled && (!apiKeyEncrypted || !webhookTokenEncrypted)) return fail('Informe chave de API e token do webhook antes de ativar.');
    if (apiKeyEncrypted && webhookTokenEncrypted && decrypt(apiKeyEncrypted) === decrypt(webhookTokenEncrypted)) return fail('Use um token de webhook diferente da chave de API.');
    const row = await tx.billingConnection.upsert({ where, create: { workspaceId, provider: input.provider, environment: input.environment, enabled: input.enabled, apiKeyEncrypted, webhookTokenEncrypted },
      update: { enabled: input.enabled, apiKeyEncrypted, webhookTokenEncrypted, revision: { increment: 1 } } });
    await tx.auditLog.create({ data: { workspaceId, actorUserId, action: 'financial.gateway_configured', entityType: 'BILLING_CONNECTION', entityId: row.id, afterJson: JSON.stringify(publicConnection(row)), severity: 'INFO' } });
    return publicConnection(row);
  });
}

/** A unique durable reservation records the POST attempt before contacting the provider. */
export async function createInvoiceCharge(db: Db, workspaceId: string, invoiceId: string, connectionId: string, billingType: string, actorUserId?: string, adapter?: BillingProvider) {
  if (!['PIX', 'BOLETO'].includes(billingType)) return fail('Escolha Pix ou boleto.');
  const reserved = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId}::uuid AND "workspaceId" = ${workspaceId}::uuid FOR UPDATE`;
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, workspaceId }, include: { client: true, workspace: true } });
    if (!invoice || !['DRAFT', 'ISSUED', 'OVERDUE'].includes(invoice.status)) return fail('Faturas pagas e canceladas não geram cobranças.');
    const connection = await tx.billingConnection.findFirst({ where: { id: connectionId, workspaceId, enabled: true } });
    if (!connection) return fail('Conexão indisponível neste workspace.');
    if (connection.environment === 'PRODUCTION' && await tx.billingCharge.count({ where: { invoiceId, connectionId: { not: connectionId }, connection: { environment: 'PRODUCTION' }, state: { notIn: ['FAILED', 'CANCELLED', 'REFUNDED'] } } })) return fail('Já há cobrança em outro provedor. Concilie ou cancele antes de criar outra.');
    if (!invoice.clientId || !invoice.client) return fail('Vincule um cliente cadastrado à fatura.');
    const document = (invoice.client.document || '').replace(/\D/g, '');
    if (![11, 14].includes(document.length)) return fail('Confira o CPF/CNPJ do cliente antes de gerar a cobrança.');
    if (Number(invoice.totalAmount) <= 0) return fail('A cobrança precisa ter valor positivo.');
    if (cents(invoice.totalAmount) > 2147483647) return fail('Valor da cobrança excede o limite permitido.');
    const due = calendarDateKey(invoice.dueDate, invoice.workspace.timeZone);
    if (due < dateKey(new Date(), invoice.workspace.timeZone)) return fail('O vencimento está no passado. Revise a cobrança com o financeiro antes de gerar no gateway.');
    const existing = await tx.billingCharge.findUnique({ where: { invoiceId_connectionId: { invoiceId, connectionId } } });
    if (existing && !['FAILED', 'REQUESTED'].includes(existing.state) && !(invoice.status === 'DRAFT' && existing.state === 'CANCELLED' && !existing.externalId)) return { invoice, connection, charge: existing, document, existing: true };
    const state = invoice.status === 'DRAFT' ? 'REQUESTED' : 'CREATING';
    const charge = existing ? await tx.billingCharge.update({ where: { id: existing.id }, data: { state, lastError: null, billingType, amountCents: cents(invoice.totalAmount), dueDate: new Date(due) } }) : await tx.billingCharge.create({ data: {
      invoiceId, connectionId, externalReference: `peanut-${invoiceId}`, billingType, amountCents: cents(invoice.totalAmount), dueDate: new Date(due), state } });
    if (invoice.status === 'DRAFT') await tx.billingScheduleEvent.updateMany({ where: { invoiceId }, data: { approvedAt: null, approvedById: null, emailTemplateSnapshot: Prisma.DbNull } });
    await tx.auditLog.create({ data: { workspaceId, actorUserId, action: 'financial.charge_requested', entityType: 'INVOICE', entityId: invoiceId, afterJson: JSON.stringify({ chargeId: charge.id, environment: connection.environment, billingType }), severity: 'INFO' } });
    return { invoice, connection, charge, document, existing: false };
  });
  if (reserved.invoice.status === 'DRAFT') return reserved.charge;
  if (reserved.existing) {
    if (['CREATING', 'UNKNOWN'].includes(reserved.charge.state)) return fail('Há uma criação em andamento ou sem confirmação. Use Conciliar; não crie outra cobrança.');
    return reserved.charge;
  }
  const { invoice, connection, charge, document } = reserved;
  let postStarted = false;
  let paymentKnown = false;
  let expectedCustomerId = charge.externalCustomerId;
  try {
    const provider = adapter || billingProvider(connection);
    const found = await provider.findPayments(charge.externalReference);
    if (found.length > 1) return fail('Mais de uma cobrança encontrada para a fatura. Revise no ASAAS.');
    let payment = found[0];
    if (payment) {
      const matches = await provider.findCustomer(document);
      if (matches.length !== 1 || matches[0].id !== payment.customer) return fail('O cliente da cobrança encontrada não corresponde ao CPF/CNPJ da fatura. Revise no provedor.');
      expectedCustomerId = matches[0].id;
    }
    if (!payment) {
      let customer = await db.billingCustomer.findUnique({ where: { connectionId_clientId: { connectionId, clientId: invoice.clientId! } } });
      const customers = customer?.externalId ? [{ id: customer.externalId }] : await provider.findCustomer(document);
      if (customers.length > 1) return fail('Há cadastros duplicados para o CPF/CNPJ no ASAAS. Revise antes de cobrar.');
      let externalCustomer = customers[0];
      if (!externalCustomer) {
        customer = await db.$transaction(async tx => {
          await tx.$queryRaw`SELECT id FROM clients WHERE id = ${invoice.clientId}::uuid FOR UPDATE`;
          const current = await tx.billingCustomer.findUnique({ where: { connectionId_clientId: { connectionId, clientId: invoice.clientId! } } });
          if (current && ['CREATING', 'UNKNOWN', 'ACTIVE'].includes(current.state)) return fail('Cadastro em processamento ou sem confirmação. Aguarde e confira o cliente no ASAAS antes de repetir.');
          return tx.billingCustomer.upsert({ where: { connectionId_clientId: { connectionId, clientId: invoice.clientId! } },
            create: { connectionId, clientId: invoice.clientId!, state: 'CREATING' }, update: { state: 'CREATING' } });
        });
        postStarted = true;
        try { externalCustomer = await provider.createCustomer({ name: invoice.client!.legalName, cpfCnpj: document, externalReference: invoice.clientId, notificationDisabled: true }); }
        catch (e) { await db.billingCustomer.update({ where: { id: customer.id }, data: { state: e instanceof BillingProviderError && !e.uncertain ? 'FAILED' : 'UNKNOWN' } }); throw e; }
      }
      if (typeof externalCustomer?.id !== 'string') throw new BillingProviderError('Cadastro não confirmado pelo provedor.', true);
      expectedCustomerId = externalCustomer.id;
      await db.billingCustomer.upsert({ where: { connectionId_clientId: { connectionId, clientId: invoice.clientId! } },
        create: { connectionId, clientId: invoice.clientId!, state: 'ACTIVE', externalId: externalCustomer.id }, update: { state: 'ACTIVE', externalId: externalCustomer.id } });
      await db.billingCharge.update({ where: { id: charge.id }, data: { externalCustomerId: externalCustomer.id } });
      postStarted = true;
      payment = await provider.createPayment({ customer: externalCustomer.id, billingType, value: charge.amountCents / 100, dueDate: charge.dueDate.toISOString().slice(0, 10),
        description: `Fatura ${invoice.number}`, externalReference: charge.externalReference });
    }
    if (typeof payment?.id !== 'string') throw new BillingProviderError('Cobrança não confirmada pelo provedor.', true);
    paymentKnown = true;
    await db.billingCharge.update({ where: { id: charge.id }, data: { externalId: payment.id, externalCustomerId: expectedCustomerId, state: 'ACTIVE' } });
    return await reconcileInvoiceCharge(db, workspaceId, charge.id, provider);
  } catch (error: any) {
    const uncertain = paymentKnown || (error instanceof BillingProviderError ? error.uncertain : postStarted);
    await db.billingCharge.update({ where: { id: charge.id }, data: { state: uncertain ? 'UNKNOWN' : 'FAILED', lastError: error instanceof BillingProviderError || error instanceof ContractBillingError ? error.message : 'Falha ao registrar a cobrança. Concilie antes de repetir.' } });
    throw error instanceof BillingProviderError || error instanceof ContractBillingError ? error : new BillingProviderError('Não foi possível confirmar a criação. Use Conciliar.', true);
  }
}

export async function getInvoiceBankLink(db: any, invoiceId: string, requireReady = false) {
  const charges = await db.billingCharge.findMany({ where: { invoiceId, connection: { environment: 'PRODUCTION' }, state: { notIn: ['CANCELLED', 'REFUNDED'] } }, orderBy: { createdAt: 'desc' } });
  if (requireReady && charges.some((charge: any) => !['ACTIVE', 'OVERDUE', 'CONFIRMED', 'RECEIVED'].includes(charge.state))) return fail('Aguarde a geração ou conciliação da cobrança bancária antes de finalizar o PDF e enviar o email.');
  const link = charges.find((charge: any) => ['ACTIVE', 'OVERDUE', 'CONFIRMED', 'RECEIVED'].includes(charge.state))?.paymentUrl || null;
  if (requireReady && charges.length && !link) return fail('A cobrança ainda não tem um link de pagamento confirmado pelo provedor.');
  return link;
}

export async function processRequestedInvoiceCharges(db: Db, providerFactory = billingProvider) {
  const charges = await db.billingCharge.findMany({ where: { state: 'REQUESTED', invoice: { status: { in: ['ISSUED', 'OVERDUE'] } } }, include: { invoice: true }, take: 50 });
  for (const charge of charges) {
    try { const connection = await db.billingConnection.findUniqueOrThrow({ where: { id: charge.connectionId } }); await createInvoiceCharge(db, charge.invoice.workspaceId, charge.invoiceId, charge.connectionId, charge.billingType, undefined, providerFactory(connection)); }
    catch (e) {
      await db.billingCharge.updateMany({ where: { id: charge.id, state: 'REQUESTED' }, data: { state: 'FAILED', lastError: e instanceof ContractBillingError || e instanceof BillingProviderError ? e.message : 'Não foi possível gerar a cobrança. Confira a configuração e concilie antes de repetir.' } });
    }
  }
}

export async function reconcileInvoiceCharge(db: Db, workspaceId: string, chargeId: string, adapter?: BillingProvider) {
  const charge = await db.billingCharge.findFirst({ where: { id: chargeId, invoice: { workspaceId } }, include: { connection: true, invoice: { include: { client: true } } } });
  if (!charge) return fail('Cobrança não encontrada.');
  const provider = adapter || billingProvider(charge.connection);
  const matches = charge.externalId ? [await provider.getPayment(charge.externalId)] : await provider.findPayments(charge.externalReference);
  if (matches.length !== 1 || !matches[0]?.id) return fail('Não foi possível identificar uma única cobrança. Confira no ASAAS; nenhuma criação será repetida automaticamente.');
  const payment = matches[0];
  let expectedCustomerId = charge.externalCustomerId;
  if (!expectedCustomerId) {
    const document = charge.invoice.client?.document?.replace(/\D/g, '');
    if (!document) return fail('Cliente da cobrança precisa de revisão cadastral.');
    const customers = await provider.findCustomer(document);
    if (customers.length !== 1) return fail('Não foi possível identificar um único cliente no provedor.');
    expectedCustomerId = customers[0].id;
  }
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${charge.invoiceId}::uuid FOR UPDATE`;
    const current = await tx.billingCharge.findUniqueOrThrow({ where: { id: charge.id }, include: { invoice: { include: { workspace: true } } } });
    if (current.updatedAt.getTime() !== charge.updatedAt.getTime()) return fail('Outra conciliação ocorreu. Atualize a situação novamente.');
    const mismatch = payment.externalReference !== current.externalReference || cents(payment.originalValue ?? payment.value) !== current.amountCents || payment.billingType !== current.billingType || payment.dueDate !== current.dueDate.toISOString().slice(0, 10) || expectedCustomerId !== payment.customer || (payment.deleted && payment.status === 'RECEIVED');
    const partialRefund = Array.isArray(payment.refunds) && payment.refunds.length > 0 && payment.status !== 'REFUNDED';
    if (mismatch || partialRefund) return tx.billingCharge.update({ where: { id: current.id }, data: { state: 'REVIEW', lastError: mismatch ? 'Valor, cliente ou referência diverge da fatura. Revise antes de dar baixa.' : 'Há estorno parcial ou em processamento. Revisão financeira necessária.', providerStatus: payment.status } });
    const status = payment.status;
    const state = payment.deleted ? 'CANCELLED' : ({ PENDING: 'ACTIVE', OVERDUE: 'OVERDUE', CONFIRMED: 'CONFIRMED', RECEIVED: 'RECEIVED', REFUNDED: 'REFUNDED' } as any)[status] || 'REVIEW';
    const principal = status === 'RECEIVED' ? current.amountCents : status === 'REFUNDED' ? 0 : current.receivedCents;
    const net = status === 'RECEIVED' ? cents(payment.netValue) : status === 'REFUNDED' ? 0 : current.netReceivedCents;
    if (net < 0 || net > cents(payment.value)) return fail('Valor líquido inconsistente retornado pelo provedor.');
    if (charge.connection.environment === 'PRODUCTION' && principal !== current.receivedCents) {
      const paidDate = payment.creditDate || payment.paymentDate;
      const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(paidDate || '') ? zonedDateTime(paidDate, current.invoice.workspace.timeZone) : new Date();
      const previousGross = principal === 0 ? await tx.billingReceipt.aggregate({ where: { chargeId: current.id }, _sum: { grossCents: true } }) : null;
      await tx.billingReceipt.create({ data: { chargeId: current.id, principalCents: principal - current.receivedCents,
        grossCents: principal > 0 ? cents(payment.value) : -(previousGross?._sum.grossCents || current.receivedCents), netCents: principal > 0 ? net : null,
        occurredAt, description: principal > 0 ? 'Recebimento confirmado no provedor' : 'Estorno da baixa anterior; conferir tarifas no provedor' } });
      if (current.invoice.status !== 'CANCELLED') await tx.invoice.update({ where: { id: current.invoiceId }, data: principal >= cents(current.invoice.totalAmount)
        ? { status: 'PAID', paidAt: occurredAt }
        : { status: calendarDateKey(current.invoice.dueDate, current.invoice.workspace.timeZone) < dateKey(new Date(), current.invoice.workspace.timeZone) ? 'OVERDUE' : 'ISSUED', paidAt: null } });
    }
    const updated = await tx.billingCharge.update({ where: { id: current.id }, data: { externalId: payment.id, externalCustomerId: payment.customer, state, providerStatus: status,
      paymentUrl: asaasPaymentUrl(payment.invoiceUrl), bankSlipUrl: asaasPaymentUrl(payment.bankSlipUrl), receivedCents: principal, netReceivedCents: net,
      lastError: state === 'REVIEW' ? 'Situação do provedor exige revisão.' : null } });
    if (current.state !== state || current.receivedCents !== principal) await tx.auditLog.create({ data: { workspaceId, action: 'financial.charge_reconciled', entityType: 'INVOICE', entityId: current.invoiceId,
      afterJson: JSON.stringify({ chargeId: current.id, state, environment: charge.connection.environment, receivedCents: principal }), severity: 'INFO' } });
    return updated;
  });
}

export async function acceptAsaasWebhook(db: Db, connectionId: string, token: unknown, body: any) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(connectionId)) return fail('Webhook não autorizado.');
  const connection = await db.billingConnection.findUnique({ where: { id: connectionId } });
  if (!connection || typeof token !== 'string' || token.length > 1000) return fail('Webhook não autorizado.');
  const expected = decrypt(connection.webhookTokenEncrypted);
  const hash = (value: string) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(hash(token), hash(expected))) return fail('Webhook não autorizado.');
  if (typeof body?.id !== 'string' || body.id.length > 200 || typeof body.event !== 'string' || body.event.length > 100) return fail('Evento inválido.');
  if (!body.event.startsWith('PAYMENT_')) return { accepted: true, ignored: true };
  if (typeof body.payment?.id !== 'string' || body.payment.id.length > 100) return fail('Cobrança do evento inválida.');
  await db.billingGatewayEvent.createMany({ data: { connectionId, externalEventId: body.id, paymentId: body.payment.id, event: body.event }, skipDuplicates: true });
  return { accepted: true };
}

/** Durable inbox; the HTTP handler acknowledges storage, while the worker verifies the canonical provider state. */
export async function processBillingGatewayEvents(db: Db, now = new Date(), providerFactory = billingProvider) {
  const stale = new Date(now.getTime() - 5 * 60000);
  await db.billingCharge.updateMany({ where: { state: 'CREATING', updatedAt: { lt: stale } }, data: { state: 'UNKNOWN', lastError: 'A criação não foi confirmada. Concilie antes de repetir.' } });
  await db.billingCustomer.updateMany({ where: { state: 'CREATING', updatedAt: { lt: stale } }, data: { state: 'UNKNOWN' } });
  const events = await db.billingGatewayEvent.findMany({ where: { processedAt: null, nextAttemptAt: { lte: now }, attempts: { lt: 10 } }, take: 50, orderBy: { createdAt: 'asc' }, include: { connection: true } });
  for (const event of events) {
    const claim = await db.billingGatewayEvent.updateMany({ where: { id: event.id, processedAt: null, nextAttemptAt: { lte: now } }, data: { attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + 5 * 60000) } });
    if (!claim.count) continue;
    try {
      const charge = await db.billingCharge.findUnique({ where: { connectionId_externalId: { connectionId: event.connectionId, externalId: event.paymentId } } });
      if (charge) await reconcileInvoiceCharge(db, event.connection.workspaceId, charge.id, providerFactory(event.connection));
      else {
        // Do not consume an event arriving before the POST response has been persisted.
        const creating = await db.billingCharge.count({ where: { connectionId: event.connectionId, state: { in: ['CREATING', 'UNKNOWN'] } } });
        if (creating) throw new Error('Cobrança ainda não vinculada.');
      }
      await db.billingGatewayEvent.update({ where: { id: event.id }, data: { processedAt: now, lastError: null } });
    } catch { await db.billingGatewayEvent.update({ where: { id: event.id }, data: { lastError: 'Falha na conciliação. Confira conexão, referência e situação no provedor.' } }); }
  }
}
