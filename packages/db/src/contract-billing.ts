import { Prisma, PrismaClient } from '@prisma/client';
import { calendarDateKey, dateKey, zonedDateTime } from '@peanut/utils';
import { randomUUID } from 'node:crypto';

export class ContractBillingError extends Error {}
const fail = (message: string): never => { throw new ContractBillingError(message); };
export type BillingDb = PrismaClient;

export function monthBounds(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return fail('Competência inválida. Use AAAA-MM.');
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return { first: `${period}-01`, last: `${period}-${lastDay}`, lastDay };
}

export function contractCoversPeriod(contract: { status: string; type: string; startDate: Date; endDate: Date | null }, period: string, zone: string) {
  const bounds = monthBounds(period);
  return contract.status === 'ACTIVE' && ['RECURRING_SUPPORT', 'HYBRID'].includes(contract.type) &&
    calendarDateKey(contract.startDate, zone) <= bounds.last &&
    (!contract.endDate || calendarDateKey(contract.endDate, zone) >= bounds.first);
}

export function contractBillingDates(contract: { billingDay: number; billingIssueDay: number | null; billingIssueTime: string; startDate: Date }, period: string, zone: string) {
  const { lastDay } = monthBounds(period);
  const day = (value: number) => `${period}-${String(Math.min(value, lastDay)).padStart(2, '0')}`;
  const start = calendarDateKey(contract.startDate, zone);
  const issueKey = [day(contract.billingIssueDay || contract.billingDay), start].sort().at(-1)!;
  const scheduledFor = zonedDateTime(`${issueKey}T${contract.billingIssueTime || '09:00'}`, zone);
  let dueKey = day(contract.billingDay);
  if (dueKey < issueKey) {
    const [year, month] = period.split('-').map(Number);
    const next = new Date(Date.UTC(year!, month!, 1)).toISOString().slice(0, 7);
    dueKey = `${next}-${String(Math.min(contract.billingDay, monthBounds(next).lastDay)).padStart(2, '0')}`;
  }
  // Preserve calendar dates in the convention used by the existing invoice forms.
  return { scheduledFor, dueDate: new Date(`${dueKey}T00:00:00.000Z`) };
}

export function recurringBaseItems(contract: { monthlyAmountCents: number; title: string; lineItems: Array<{ description: string; quantity: Prisma.Decimal; unitPriceCents: number; recurring: boolean }> }) {
  const recurring = contract.lineItems.filter(item => item.recurring);
  if (!recurring.length) return [{ type: 'SERVICE', description: contract.title, quantity: new Prisma.Decimal(1), unit: 'MÊS', unitPrice: new Prisma.Decimal(contract.monthlyAmountCents).div(100), billingKind: 'BASE' }];
  const sum = recurring.reduce((total, item) => total.add(new Prisma.Decimal(item.quantity).mul(item.unitPriceCents).toDecimalPlaces(0)), new Prisma.Decimal(0));
  if (!sum.equals(contract.monthlyAmountCents)) return fail('A soma dos itens fixos deve corresponder à mensalidade. Ajuste o contrato antes de preparar a competência.');
  return recurring.map(item => ({ type: 'SERVICE', description: item.description, quantity: new Prisma.Decimal(item.quantity), unit: 'UN', unitPrice: new Prisma.Decimal(item.unitPriceCents).div(100), billingKind: 'BASE' }));
}

export function invoiceAmounts(items: Array<any>, discount: Prisma.Decimal.Value = 0) {
  let services = new Prisma.Decimal(0), materials = new Prisma.Decimal(0), costs = new Prisma.Decimal(0);
  const rows = items.map((item, index) => {
    const quantity = new Prisma.Decimal(item.quantity);
    if (quantity.decimalPlaces() > 2 || new Prisma.Decimal(item.unitPrice).decimalPlaces() > 2 || new Prisma.Decimal(item.unitCost || 0).decimalPlaces() > 2) return fail('Use no máximo duas casas decimais nas quantidades e valores.');
    const unitPrice = new Prisma.Decimal(item.unitPrice).toDecimalPlaces(2);
    const unitCost = item.type === 'MATERIAL' ? new Prisma.Decimal(item.unitCost || 0).toDecimalPlaces(2) : new Prisma.Decimal(0);
    if (!quantity.isFinite() || quantity.lte(0) || !unitPrice.isFinite() || unitPrice.lt(0) || !unitCost.isFinite() || unitCost.lt(0)) return fail('Quantidade e valores dos itens devem ser válidos e não negativos.');
    const totalPrice = quantity.mul(unitPrice).toDecimalPlaces(2);
    const totalCost = quantity.mul(unitCost).toDecimalPlaces(2);
    if (item.type === 'MATERIAL') { materials = materials.add(totalPrice); costs = costs.add(totalCost); }
    else services = services.add(totalPrice);
    return {
      type: item.type || 'SERVICE', description: item.description, quantity, unit: item.unit || 'UN', unitPrice, unitCost, totalPrice, totalCost, sortOrder: index,
      billingKind: item.billingKind || 'EXTRA', sourceTicketId: item.sourceTicketId || null, sourceServiceOrderId: item.sourceServiceOrderId || null,
    };
  });
  const discountAmount = new Prisma.Decimal(discount).toDecimalPlaces(2);
  if (!discountAmount.isFinite() || discountAmount.lt(0) || discountAmount.gt(services.add(materials))) return fail('Desconto inválido ou maior que o subtotal.');
  const totalAmount = services.add(materials).sub(discountAmount);
  return { rows, totals: { subtotalServices: services, subtotalMaterials: materials, subtotalMaterialCost: costs, discountAmount, totalAmount, netAmount: totalAmount.sub(costs) } };
}

async function lockContract(tx: Prisma.TransactionClient, id: string, workspaceId: string) {
  await tx.$queryRaw`SELECT id FROM contracts WHERE id = ${id}::uuid AND "workspaceId" = ${workspaceId}::uuid FOR UPDATE`;
}
async function lockInvoice(tx: Prisma.TransactionClient, id: string, workspaceId: string) {
  await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${id}::uuid AND "workspaceId" = ${workspaceId}::uuid FOR UPDATE`;
}

export async function prepareContractPeriod(db: BillingDb, contractId: string, workspaceId: string, period: string, actorUserId: string | null) {
  monthBounds(period);
  return db.$transaction(async tx => {
    await lockContract(tx, contractId, workspaceId);
    const contract = await tx.contract.findFirst({ where: { id: contractId, workspaceId }, include: { client: true, workspace: true, lineItems: { orderBy: { createdAt: 'asc' } } } });
    if (!contract) return fail('Contrato não encontrado.');
    const existing = await tx.billingScheduleEvent.findUnique({ where: { contractId_periodKey: { contractId, periodKey: period } }, include: { invoice: { include: { items: true } } } });
    if (existing?.invoiceId || existing?.status === 'CANCELLED' || existing?.status === 'SKIPPED') return existing;
    if (existing?.status === 'GENERATED_FUTURE_INVOICE') return fail('Esta previsão antiga está marcada como faturada, mas não possui vínculo com a fatura. Revise o histórico antes de preparar outra cobrança.');
    const zone = contract.workspace.timeZone;
    if (!contractCoversPeriod(contract, period, zone)) return fail('Contrato não está ativo ou não cobre esta competência.');
    if (contract.currency !== 'BRL') return fail('A emissão de faturas recorrentes atualmente aceita contratos em BRL.');
    const dates = contractBillingDates(contract, period, zone);
    if (contract.endDate && dateKey(dates.scheduledFor, zone) > calendarDateKey(contract.endDate, zone)) return fail('A data de emissão está após o fim do contrato. Ajuste a programação.');
    const amounts = invoiceAmounts(recurringBaseItems(contract));
    const invoice = await tx.invoice.create({ data: {
      workspaceId, clientId: contract.clientId, clientName: contract.client.tradeName || contract.client.legalName,
      clientDocument: contract.client.document, clientEmail: contract.client.email, clientPhone: contract.client.phone,
      contractId, number: `FAT-${period.replace('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`, status: 'DRAFT', issueDate: dates.scheduledFor,
      dueDate: dates.dueDate, paymentMethod: contract.billingPaymentMethod, pixKey: contract.billingPixKey,
      observations: `Contrato ${contract.number} | Competência ${period}`, ...amounts.totals, items: { create: amounts.rows },
    }, include: { items: true } });
    const event = await tx.billingScheduleEvent.upsert({ where: { contractId_periodKey: { contractId, periodKey: period } },
      create: { workspaceId, contractId, clientId: contract.clientId, periodKey: period, ...datesToEvent(dates), status: 'DRAFT_READY', invoiceId: invoice.id, amountCents: Math.round(Number(invoice.totalAmount) * 100), currency: contract.currency, description: `Contrato ${contract.number} - ${period}`, emailRecipients: contract.billingEmailRecipients },
      update: { ...datesToEvent(dates), status: 'DRAFT_READY', invoiceId: invoice.id, amountCents: Math.round(Number(invoice.totalAmount) * 100), emailRecipients: contract.billingEmailRecipients },
      include: { invoice: { include: { items: true } } },
    });
    await tx.contractHistory.create({ data: { workspaceId, contractId, actorUserId, event: 'BILLING_PERIOD_PREPARED', description: `Competência ${period} preparada em rascunho (${invoice.number}).` } });
    return event;
  });
}
const datesToEvent = (dates: { scheduledFor: Date }) => ({ scheduledFor: dates.scheduledFor });

async function validateSources(tx: Prisma.TransactionClient, items: Array<any>, workspaceId: string, clientId: string | null) {
  for (const item of items) {
    if (item.sourceTicketId && !await tx.ticket.findFirst({ where: { id: item.sourceTicketId, workspaceId, clientId: clientId || undefined } })) return fail('Chamado do adicional não pertence ao cliente e workspace da fatura.');
    if (item.sourceServiceOrderId && !await tx.serviceOrder.findFirst({ where: { id: item.sourceServiceOrderId, workspaceId, clientId: clientId || undefined } })) return fail('O.S. do adicional não pertence ao cliente e workspace da fatura.');
  }
}

/** One row lock serializes editing, approval, cancellation and automatic issuance. */
export async function updateContractInvoice(db: BillingDb, invoiceId: string, workspaceId: string, input: any) {
  return db.$transaction(async tx => {
    await lockInvoice(tx, invoiceId, workspaceId);
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, workspaceId }, include: { items: { orderBy: { sortOrder: 'asc' } }, billingScheduleEvent: true } });
    if (!invoice?.billingScheduleEvent) return fail('Cobrança mensal não encontrada.');
    if (invoice.status !== 'DRAFT') return fail('Apenas cobranças em rascunho podem ser editadas.');
    let base: Array<any> = invoice.items.filter(item => item.billingKind === 'BASE');
    if (input.refreshBase) {
      const agreement = await tx.contract.findUniqueOrThrow({ where: { id: invoice.contractId! }, include: { lineItems: { orderBy: { createdAt: 'asc' } } } });
      base = recurringBaseItems(agreement);
    }
    const incoming = input.items || invoice.items;
    const incomingBase = incoming.filter((item: any) => item.billingKind === 'BASE');
    const signature = (items: Array<any>) => JSON.stringify(items.map(item => [item.description, new Prisma.Decimal(item.quantity).toString(), new Prisma.Decimal(item.unitPrice).toString(), item.type, item.unit]));
    if (!input.refreshBase && signature(base) !== signature(incomingBase)) return fail('Os itens fixos são uma cópia da mensalidade. Edite somente os adicionais desta competência.');
    const extras = incoming.filter((item: any) => item.billingKind !== 'BASE').map((item: any) => ({ ...item, billingKind: 'EXTRA' }));
    await validateSources(tx, extras, workspaceId, invoice.clientId);
    const amounts = invoiceAmounts([...base, ...extras], input.discountAmount ?? invoice.discountAmount);
    const dueDate = input.dueDate ? new Date(input.dueDate) : invoice.dueDate;
    const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : invoice.billingScheduleEvent.scheduledFor;
    if (isNaN(dueDate.getTime()) || isNaN(scheduledFor.getTime())) return fail('Datas da cobrança inválidas.');
    const contract = await tx.contract.findUniqueOrThrow({ where: { id: invoice.contractId! }, include: { workspace: true } });
    const zone = contract.workspace.timeZone;
    const issueKey = dateKey(scheduledFor, zone);
    if (issueKey < calendarDateKey(contract.startDate, zone) || (contract.endDate && issueKey > calendarDateKey(contract.endDate, zone))) return fail('Data de emissão fora da vigência do contrato.');
    if (calendarDateKey(dueDate, zone) < issueKey) return fail('O vencimento não pode ser anterior à emissão.');
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    await tx.billingScheduleEvent.update({ where: { id: invoice.billingScheduleEvent.id }, data: { approvedAt: null, approvedById: null, scheduledFor, amountCents: Math.round(Number(amounts.totals.totalAmount) * 100), ...(input.emailRecipients !== undefined ? { emailRecipients: input.emailRecipients } : {}) } });
    return tx.invoice.update({ where: { id: invoiceId }, data: { ...amounts.totals, dueDate, issueDate: scheduledFor, paymentMethod: input.paymentMethod ?? invoice.paymentMethod, pixKey: input.pixKey !== undefined ? input.pixKey : invoice.pixKey, observations: input.observations !== undefined ? input.observations : invoice.observations, discountReason: input.discountReason !== undefined ? input.discountReason : invoice.discountReason, items: { create: amounts.rows } }, include: { items: { orderBy: { sortOrder: 'asc' } }, billingScheduleEvent: true } });
  });
}

export async function approveContractInvoice(db: BillingDb, invoiceId: string, workspaceId: string, actorUserId: string) {
  return db.$transaction(async tx => {
    await lockInvoice(tx, invoiceId, workspaceId);
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, workspaceId }, include: { items: true, billingScheduleEvent: { include: { contract: { include: { workspace: true } } } } } });
    const event = invoice?.billingScheduleEvent;
    if (!invoice || !event || invoice.status !== 'DRAFT') return fail('Somente uma cobrança mensal em rascunho pode ser agendada.');
    if (!contractCoversPeriod(event.contract, event.periodKey, event.contract.workspace.timeZone)) return fail('O contrato não está ativo nesta competência.');
    if (!invoice.items.length || Number(invoice.totalAmount) <= 0) return fail('Revise os itens e o valor da cobrança antes de agendar.');
    if (event.contract.billingAutoEmail && !event.emailRecipients.length) return fail('Informe os emails dos destinatários antes de agendar.');
    await tx.contractHistory.create({ data: { workspaceId, contractId: event.contractId, actorUserId, event: 'BILLING_PERIOD_APPROVED', description: `Competência ${event.periodKey} conferida e agendada (${invoice.number}).` } });
    return tx.billingScheduleEvent.update({ where: { id: event.id }, data: { approvedAt: new Date(), approvedById: actorUserId } });
  });
}

export async function issueContractInvoice(db: BillingDb, invoiceId: string, workspaceId: string, now = new Date(), automatic = false) {
  return db.$transaction(async tx => {
    await lockInvoice(tx, invoiceId, workspaceId);
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, workspaceId }, include: { billingScheduleEvent: { include: { contract: { include: { workspace: true } } } } } });
    const event = invoice?.billingScheduleEvent;
    if (!invoice || !event) return fail('Cobrança mensal não encontrada.');
    if (invoice.status !== 'DRAFT') return invoice;
    if (!event.approvedAt) return fail('Confira e agende esta competência antes de emitir.');
    if (event.scheduledFor > now) return fail('A data programada de emissão ainda não chegou.');
    if (automatic && !event.contract.billingAutoIssue) return fail('Emissão automática desativada no contrato.');
    const zone = event.contract.workspace.timeZone;
    if (!contractCoversPeriod(event.contract, event.periodKey, zone) || calendarDateKey(event.contract.startDate, zone) > dateKey(now, zone) || (event.contract.endDate && calendarDateKey(event.contract.endDate, zone) < dateKey(now, zone))) return fail('Contrato suspenso ou fora da vigência.');
    await tx.billingScheduleEvent.update({ where: { id: event.id }, data: { status: 'GENERATED_FUTURE_INVOICE', emailStatus: event.contract.billingAutoEmail ? 'QUEUED' : 'NOT_REQUESTED' } });
    await tx.contractHistory.create({ data: { workspaceId, contractId: event.contractId, event: 'BILLING_PERIOD_ISSUED', description: `Fatura ${invoice.number} emitida para ${event.periodKey}.` } });
    return tx.invoice.update({ where: { id: invoiceId }, data: { status: 'ISSUED', issueDate: now } });
  });
}

/** Freeze the render inputs before generating a PDF, including concurrent jobs. */
export async function freezeContractDocument(db: BillingDb, invoiceId: string, workspaceId: string, snapshot: Prisma.InputJsonValue) {
  return db.$transaction(async tx => {
    await lockInvoice(tx, invoiceId, workspaceId);
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, workspaceId }, include: { billingScheduleEvent: true } });
    const event = invoice?.billingScheduleEvent;
    if (!event || invoice.status === 'DRAFT') return snapshot;
    if (event.documentSnapshot) return event.documentSnapshot;
    const updated = await tx.billingScheduleEvent.update({ where: { id: event.id }, data: { documentSnapshot: snapshot } });
    return updated.documentSnapshot!;
  });
}
