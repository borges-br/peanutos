import { PrismaClient } from '@prisma/client';
import { DEFAULT_BILLING_EMAIL, validateBillingEmail, renderBillingEmail } from '@peanut/utils';
import { ContractBillingError } from './contract-billing';
import { getInvoiceBankLink } from './billing-gateway';

export async function resolveBillingEmailTemplate(db: any, workspaceId: string, templateId?: string | null) {
  const row = await db.emailTemplate.findFirst({ where: { workspaceId, active: true, ...(templateId ? { id: templateId } : { isDefault: true }) } });
  if (templateId && !row) throw new ContractBillingError('Modelo de email não está disponível neste workspace.');
  return row ? { name: row.name, subject: row.subject, body: row.body, templateId: row.id, revision: row.revision } : { ...DEFAULT_BILLING_EMAIL, templateId: null, revision: 0 };
}
export function invoiceEmailValues(invoice: any, contract: any, workspace: any, period: string) {
  return { cliente: invoice.client?.tradeName || invoice.client?.legalName || invoice.clientName || 'Cliente', fatura: invoice.number,
    contrato: contract?.number || 'Avulsa', competencia: period,
    total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(invoice.totalAmount)),
    vencimento: new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(invoice.dueDate),
    empresa: workspace.brandName || workspace.name, fuso: workspace.timeZone };
}
export async function saveBillingEmailTemplate(db: PrismaClient, workspaceId: string, actorUserId: string, input: any, id?: string) {
  let content; try { content = validateBillingEmail(input); } catch (e: any) { throw new ContractBillingError(e.message); }
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) throw new ContractBillingError('Nome do modelo inválido.');
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const before = id ? await tx.emailTemplate.findFirst({ where: { id, workspaceId, active: true } }) : null;
    if (id && !before) throw new ContractBillingError('Modelo não encontrado.');
    if (before && before.revision !== input.revision) throw new ContractBillingError('O modelo foi alterado por outra pessoa. Recarregue antes de salvar.');
    if (await tx.emailTemplate.findFirst({ where: { workspaceId, name: input.name.trim(), ...(id ? { id: { not: id } } : {}) } })) throw new ContractBillingError('Já existe um modelo com este nome. Escolha outro nome.');
    if (input.isDefault === true) await tx.emailTemplate.updateMany({ where: { workspaceId, isDefault: true }, data: { isDefault: false } });
    const data = { ...content, name: input.name.trim(), isDefault: input.isDefault === true, revision: (before?.revision || 0) + 1 };
    const row = id ? await tx.emailTemplate.update({ where: { id }, data }) : await tx.emailTemplate.create({ data: { workspaceId, ...data } });
    await tx.auditLog.create({ data: { workspaceId, actorUserId, action: 'financial.email_template_saved', entityType: 'EMAIL_TEMPLATE', entityId: row.id,
      beforeJson: before ? JSON.stringify(before) : null, afterJson: JSON.stringify(row), severity: 'INFO' } });
    return row;
  });
}
export async function previewInvoiceEmail(db: PrismaClient, workspaceId: string, invoiceId: string) {
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, workspaceId }, include: { workspace: true, client: true, billingScheduleEvent: { include: { contract: true } } } });
  if (!invoice) throw new ContractBillingError('Fatura não encontrada.');
  const event = invoice.billingScheduleEvent;
  const template = event?.emailTemplateSnapshot || await resolveBillingEmailTemplate(db, workspaceId, event?.contract.billingEmailTemplateId);
  const values = invoiceEmailValues(invoice, event?.contract, invoice.workspace, event?.periodKey || invoice.dueDate.toISOString().slice(0, 7));
  const bankLink = await getInvoiceBankLink(db, invoiceId);
  const content = (template as any).rendered || renderBillingEmail(template as any, { ...((template as any).values || values), link_pagamento: bankLink || '' });
  return { ...content, templateName: (template as any).name, frozen: !!event?.emailTemplateSnapshot, recipients: event?.emailRecipients || [], hasPdfAttachment: true, bankLinkPending: !bankLink };
}
