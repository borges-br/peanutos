import { prisma as defaultDb, prepareContractPeriod, issueContractInvoice, contractCoversPeriod, loadWorkspaceSmtpConfig } from '@peanut/db';
import { dateKey, calendarDateKey, LocalObjectStorage } from '@peanut/utils';
import { createHash } from 'node:crypto';
import { createWorkspaceMailTransport } from './email-settings';

type Db = typeof defaultDb;
type PdfQueue = { add(name: string, data: any, options: any): Promise<unknown> };
export type MailTransport = { sendMail(message: any): Promise<{ accepted?: Array<any>; rejected?: Array<any>; messageId?: string }> };

/** Scan is repeatable: unique contract/month, locked issuance and claimed deliveries. */
export async function runContractBilling(db: Db, pdfQueue: PdfQueue, store: LocalObjectStorage, now = new Date(), transport?: MailTransport | null) {
  const contracts = await db.contract.findMany({ where: { status: 'ACTIVE', type: { in: ['RECURRING_SUPPORT', 'HYBRID'] }, monthlyAmountCents: { gt: 0 } }, include: { workspace: true } });
  for (const contract of contracts) {
    const today = dateKey(now, contract.workspace.timeZone);
    if (calendarDateKey(contract.startDate, contract.workspace.timeZone) > today || (contract.endDate && calendarDateKey(contract.endDate, contract.workspace.timeZone) < today)) continue;
    try { await prepareContractPeriod(db, contract.id, contract.workspaceId, today.slice(0, 7), null); }
    catch (error: any) { console.warn(`[Contract Billing] Could not prepare ${contract.id}: ${error.message}`); }
  }

  const due = await db.billingScheduleEvent.findMany({ where: { approvedAt: { not: null }, scheduledFor: { lte: now }, status: 'DRAFT_READY', invoice: { status: 'DRAFT' }, contract: { billingAutoIssue: true } }, take: 100 });
  for (const event of due) {
    try { await issueContractInvoice(db, event.invoiceId!, event.workspaceId, now, true); }
    catch (error: any) { console.warn(`[Contract Billing] Could not issue ${event.id}: ${error.message}`); }
  }

  // Recover queue failures after a committed issuance without creating another invoice.
  const pdfs = await db.billingScheduleEvent.findMany({ where: { status: 'GENERATED_FUTURE_INVOICE', emailPdfFileObjectId: null, invoice: { status: { in: ['ISSUED', 'OVERDUE'] } } }, take: 100 });
  for (const event of pdfs) {
    await pdfQueue.add('generate-pdf', { workspaceId: event.workspaceId, actorUserId: event.approvedById, entityType: 'INVOICE', entityId: event.invoiceId, documentType: 'INVOICE' }, {
      jobId: `monthly-pdf-${event.id}`, attempts: 3, backoff: { type: 'exponential', delay: 10000 }, removeOnComplete: 100, removeOnFail: 100,
    });
  }
  await sendContractEmails(db, store, now, transport);
}

export async function sendContractEmails(db: Db, store: LocalObjectStorage, now = new Date(), transport?: MailTransport | null) {
  // A process may have stopped after SMTP accepted the message. Never retry blindly.
  await db.billingScheduleEvent.updateMany({ where: { emailStatus: 'SENDING', emailAttemptedAt: { lt: new Date(now.getTime() - 10 * 60000) } }, data: { emailStatus: 'UNKNOWN', emailLastError: 'O envio foi interrompido sem confirmação. Confira a caixa de saída antes de tentar novamente.' } });
  const candidates = await db.billingScheduleEvent.findMany({ where: {
    emailStatus: { in: ['QUEUED', 'FAILED', 'PAUSED'] }, emailAttempts: { lt: 5 }, emailPdfFileObjectId: { not: null },
    scheduledFor: { lte: now }, approvedAt: { not: null },
    OR: [{ emailNextAttemptAt: null }, { emailNextAttemptAt: { lte: now } }],
    invoice: { status: { in: ['ISSUED', 'OVERDUE'] } }, contract: { status: 'ACTIVE', billingAutoEmail: true },
  }, include: { invoice: true, contract: { include: { workspace: true } } }, orderBy: { scheduledFor: 'asc' }, take: 50 });
  for (const candidate of candidates) {
    if (!contractCoversPeriod(candidate.contract, candidate.periodKey, candidate.contract.workspace.timeZone)) continue;
    let config;
    try { config = await loadWorkspaceSmtpConfig(db, candidate.workspaceId); } catch { /* Keep credentials out of logs. */ }
    const sender = config ? (transport === undefined ? createWorkspaceMailTransport(config) : transport) : null;
    if (!sender || !config) {
      await db.billingScheduleEvent.update({ where: { id: candidate.id }, data: { emailStatus: 'PAUSED', emailLastError: 'Configure e ative o SMTP em Configurações > Integrações. Verifique também a chave mestra do servidor.' } });
      continue;
    }
    const claimed = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${candidate.invoiceId}::uuid AND "workspaceId" = ${candidate.workspaceId}::uuid FOR UPDATE`;
      const current = await tx.billingScheduleEvent.findUnique({ where: { id: candidate.id }, include: { invoice: true, contract: true } });
      if (!current?.invoice || !['ISSUED', 'OVERDUE'].includes(current.invoice.status) || !current.contract.billingAutoEmail || current.contract.status !== 'ACTIVE') return false;
      const result = await tx.billingScheduleEvent.updateMany({ where: { id: candidate.id, emailStatus: { in: ['QUEUED', 'FAILED', 'PAUSED'] }, emailAttempts: { lt: 5 }, OR: [{ emailNextAttemptAt: null }, { emailNextAttemptAt: { lte: now } }] }, data: { emailStatus: 'SENDING', emailAttemptedAt: now, emailAttempts: { increment: 1 }, emailLastError: null } });
      return result.count === 1;
    });
    if (!claimed) continue;
    let sending = false;
    let smtpReturned = false;
    try {
      const acceptedPreviously = new Set(candidate.emailAcceptedRecipients.map(email => email.toLowerCase()));
      const recipients = [...new Set(candidate.emailRecipients.map(email => email.toLowerCase()))].filter(email => !acceptedPreviously.has(email));
      if (!recipients.length || recipients.some(email => !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email))) throw new Error('Destinatários inválidos ou já processados.');
      const file = await db.fileObject.findFirst({ where: { id: candidate.emailPdfFileObjectId!, workspaceId: candidate.workspaceId, mimeType: 'application/pdf' } });
      if (!file) throw new Error('PDF da cobrança não encontrado.');
      // Verify that the attachment actually belongs to this invoice, not another file.
      const document = await db.generatedDocument.findFirst({ where: { workspaceId: candidate.workspaceId, entityType: 'INVOICE', entityId: candidate.invoiceId!, fileObjectId: file.id } });
      if (!document) throw new Error('PDF não pertence à cobrança.');
      const chunks: Buffer[] = [];
      for await (const chunk of await store.get(file.bucket, file.key)) chunks.push(Buffer.from(chunk));
      const content = Buffer.concat(chunks);
      if (BigInt(content.length) !== file.sizeBytes || createHash('sha256').update(content).digest('hex') !== file.sha256) throw new Error('O PDF não passou na verificação de integridade.');
      const invoice = candidate.invoice!;
      const domain = config.fromEmail.match(/@([a-z0-9.-]+)/i)?.[1] || 'peanut.invalid';
      const messageId = candidate.emailMessageId || `<contract-${candidate.id}@${domain}>`;
      await db.billingScheduleEvent.update({ where: { id: candidate.id }, data: { emailMessageId: messageId } });
      const zone = candidate.contract.workspace.timeZone;
      const due = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(invoice.dueDate);
      const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: candidate.currency || 'BRL' } as any).format(Number(invoice.totalAmount));
      sending = true;
      const info = await sender.sendMail({
        from: { name: config.fromName, address: config.fromEmail }, replyTo: config.replyTo, to: recipients, messageId,
        subject: `Fatura ${invoice.number} | ${candidate.periodKey} | ${candidate.contract.workspace.brandName || candidate.contract.workspace.name}`,
        text: `Olá,\n\nSegue em anexo a fatura ${invoice.number}, referente ao contrato ${candidate.contract.number}, competência ${candidate.periodKey}.\n\nTotal: ${total}\nVencimento: ${due}\n\nA mensalidade e os serviços/materiais adicionais deste mês estão discriminados no mesmo PDF.\n\nAtenciosamente,\n${candidate.contract.workspace.brandName || candidate.contract.workspace.name}\nFuso da emissão: ${zone}`,
        attachments: [{ filename: file.originalFilename, content, contentType: 'application/pdf' }],
        disableFileAccess: true, disableUrlAccess: true,
      });
      smtpReturned = true;
      if (!Array.isArray(info.accepted)) throw new Error('O transporte não confirmou os destinatários aceitos.');
      const normalize = (value: any) => String(typeof value === 'string' ? value : value.address || '').toLowerCase();
      const acceptedNow = new Set((info.accepted || []).map(normalize));
      const accepted = [...new Set([...acceptedPreviously, ...acceptedNow])];
      const rejected = candidate.emailRecipients.filter(email => !accepted.includes(email.toLowerCase()));
      const emailStatus = !rejected.length ? 'SENT' : accepted.length ? 'PARTIAL' : 'FAILED';
      await db.billingScheduleEvent.update({ where: { id: candidate.id }, data: {
        emailStatus, emailAcceptedRecipients: accepted, emailRejectedRecipients: rejected, emailSentAt: accepted.length ? now : null,
        emailNextAttemptAt: emailStatus === 'FAILED' ? new Date(now.getTime() + 5 * 60000) : null,
        emailLastError: rejected.length ? 'O servidor recusou um ou mais destinatários. Confira os endereços e solicite nova tentativa.' : null,
      } });
      await db.contractHistory.create({ data: { workspaceId: candidate.workspaceId, contractId: candidate.contractId, event: 'BILLING_EMAIL_PROCESSED', description: `Email da fatura ${invoice.number}: ${emailStatus}. Aceitos: ${accepted.length}; pendentes: ${rejected.length}.` } }).catch(() => console.warn(`[Contract Billing] Could not record email history for ${candidate.id}`));
    } catch (error: any) {
      const safeToRetry = !sending || (!smtpReturned && (['CONN', 'EHLO', 'HELO', 'STARTTLS', 'AUTH', 'MAIL FROM', 'RCPT TO'].includes(error.command) || Number(error.responseCode) >= 400));
      await db.billingScheduleEvent.update({ where: { id: candidate.id }, data: {
        emailStatus: safeToRetry ? 'FAILED' : 'UNKNOWN',
        emailLastError: safeToRetry ? 'Falha ao preparar ou transmitir o email. Verifique SMTP, destinatários e o PDF.' : 'Não foi possível confirmar a aceitação do email. Confira a caixa de saída antes de reenviar.',
        emailNextAttemptAt: safeToRetry ? new Date(now.getTime() + 5 * 60000) : null,
      } }).catch(() => {});
      console.warn(`[Contract Billing] Email ${candidate.id}: ${safeToRetry ? 'failed' : 'unknown'}`);
    }
  }
}
