import { Prisma, PrismaClient } from '@prisma/client';
import { calendarDateKey } from '@peanut/utils';
import { ContractBillingError, monthBounds } from './contract-billing';

const invalid = (message: string): never => { throw new ContractBillingError(message); };
function civil(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return invalid(`${label} inválida.`);
  return value;
}
const displayDate = (value: string) => value.split('-').reverse().join('/');
const cents = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

/** All financial rules are copied into the invoice; issued snapshots never follow edits. */
export function recurringAddonItems(contract: any, period: string, zone: string) {
  const bounds = monthBounds(period);
  return (contract.lineItems || []).filter((item: any) => item.billingRole === 'ADDON' && item.recurring).flatMap((item: any) => {
    const start = [bounds.first, calendarDateKey(contract.startDate, zone), item.startsOn.toISOString().slice(0, 10)].sort().at(-1)!;
    const end = [bounds.last, ...(contract.endDate ? [calendarDateKey(contract.endDate, zone)] : []), ...(item.endMode === 'DATE' && item.endsOn ? [item.endsOn.toISOString().slice(0, 10)] : [])].sort()[0]!;
    if (start > end) return [];
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
    const nominalQuantity = new Prisma.Decimal(item.quantity);
    const monthlyCents = nominalQuantity.mul(item.unitPriceCents).toDecimalPlaces(0);
    const partial = item.proration === 'DAILY' && days < bounds.lastDay;
    const chargedCents = partial ? monthlyCents.mul(days).div(bounds.lastDay).toDecimalPlaces(0) : monthlyCents;
    const note = `${item.proration === 'DAILY' ? `${nominalQuantity.toString()} × ${cents(item.unitPriceCents)}/mês · Rateio: ${days}/${bounds.lastDay} dias` : 'Valor integral, sem rateio'} · ${displayDate(start)} a ${displayDate(end)}`;
    // Aggregate a partial month into one charge to avoid rounding unit prices before multiplication.
    return [{ type: 'SERVICE', description: item.description, quantity: partial ? new Prisma.Decimal(1) : nominalQuantity,
      unit: partial ? 'MÊS' : 'UN', unitPrice: new Prisma.Decimal(partial ? chargedCents : item.unitPriceCents).div(100),
      billingKind: 'RECURRING', sourceContractLineItemId: item.id,
      recurrenceSnapshot: { period, start, end, days, periodDays: bounds.lastDay, proration: item.proration, endMode: item.endMode,
        nominalQuantity: nominalQuantity.toString(), unitPriceCents: item.unitPriceCents, monthlyAmountCents: monthlyCents.toNumber(), chargedAmountCents: chargedCents.toNumber(), note },
    }];
  });
}

function normalize(input: any, previous?: any) {
  const data = { ...previous, ...input };
  if (!data.description?.trim() || data.description.trim().length > 255) return invalid('Descrição inválida.');
  const quantity = new Prisma.Decimal(data.quantity);
  if (!quantity.isFinite() || quantity.lte(0) || quantity.decimalPlaces() > 2 || quantity.gt('99999999.99')) return invalid('Quantidade inválida. Use até duas casas decimais.');
  if (!Number.isInteger(data.unitPriceCents) || data.unitPriceCents < 0 || data.unitPriceCents > 2147483647) return invalid('Valor unitário inválido.');
  const total = quantity.mul(data.unitPriceCents).toDecimalPlaces(0);
  if (total.gt(2147483647)) return invalid('Valor total do item excede o limite permitido.');
  const billingRole = data.billingRole || 'BASE', endMode = data.endMode || 'CONTRACT', proration = data.proration || 'NONE';
  if (!['BASE', 'ADDON'].includes(billingRole) || !['OPEN', 'CONTRACT', 'DATE'].includes(endMode) || !['NONE', 'DAILY'].includes(proration)) return invalid('Regra de recorrência inválida.');
  let startsOn: Date | null = null, endsOn: Date | null = null;
  if (billingRole === 'ADDON') {
    if (data.recurring === false) return invalid('O adicional recorrente precisa estar marcado como recorrente.');
    const start = civil(data.startsOn instanceof Date ? data.startsOn.toISOString().slice(0, 10) : data.startsOn, 'Data de início');
    startsOn = new Date(start + 'T00:00:00Z');
    if (endMode === 'DATE') {
      const end = civil(data.endsOn instanceof Date ? data.endsOn.toISOString().slice(0, 10) : data.endsOn, 'Data de término');
      if (end < start) return invalid('O término não pode ser anterior ao início.');
      endsOn = new Date(end + 'T00:00:00Z');
    }
  }
  return { description: data.description.trim(), itemType: data.itemType, quantity, unitPriceCents: data.unitPriceCents,
    totalPriceCents: total.toNumber(), recurring: data.recurring ?? true, billingRole, startsOn, endsOn, endMode, proration };
}

export async function saveContractLineItem(db: PrismaClient, workspaceId: string, contractId: string, input: any, actorUserId: string, itemId?: string, request: { ipAddress?: string; userAgent?: string } = {}) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM contracts WHERE id = ${contractId}::uuid AND "workspaceId" = ${workspaceId}::uuid FOR UPDATE`;
    if (!await tx.contract.findFirst({ where: { id: contractId, workspaceId } })) return invalid('Contrato não encontrado.');
    const before = itemId ? await tx.contractLineItem.findFirst({ where: { id: itemId, contractId, workspaceId } }) : null;
    if (itemId && !before) return invalid('Item do contrato não encontrado.');
    const data = normalize(input, before);
    const after = itemId ? await tx.contractLineItem.update({ where: { id: itemId }, data }) : await tx.contractLineItem.create({ data: { workspaceId, contractId, ...data } });
    await tx.billingScheduleEvent.updateMany({ where: { workspaceId, contractId, invoice: { status: 'DRAFT' } }, data: { approvedAt: null, approvedById: null, needsRecurringRefresh: true } });
    await tx.contractHistory.create({ data: { workspaceId, contractId, actorUserId, event: itemId ? 'LINE_ITEM_UPDATED' : 'LINE_ITEM_ADDED',
      description: `${itemId ? 'Item atualizado' : 'Item adicionado'}: ${after.description}. Rascunhos precisam atualizar os itens; faturas emitidas foram preservadas.`,
      before: before ? JSON.stringify(before) : null, after: JSON.stringify(after) } });
    await tx.auditLog.create({ data: { workspaceId, actorUserId, action: itemId ? 'contract.line_item_updated' : 'contract.line_item_added', entityType: 'CONTRACT', entityId: contractId,
      beforeJson: before ? JSON.stringify(before) : null, afterJson: JSON.stringify(after), ...request, severity: 'INFO' } });
    return after;
  });
}

export async function removeContractLineItem(db: PrismaClient, workspaceId: string, contractId: string, itemId: string, actorUserId: string, request: { ipAddress?: string; userAgent?: string } = {}) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM contracts WHERE id = ${contractId}::uuid AND "workspaceId" = ${workspaceId}::uuid FOR UPDATE`;
    if (!await tx.contract.findFirst({ where: { id: contractId, workspaceId } })) return invalid('Contrato não encontrado.');
    const before = await tx.contractLineItem.findFirst({ where: { id: itemId, contractId, workspaceId } });
    if (!before) return invalid('Item do contrato não encontrado.');
    await tx.contractLineItem.delete({ where: { id: itemId } });
    await tx.billingScheduleEvent.updateMany({ where: { workspaceId, contractId, invoice: { status: 'DRAFT' } }, data: { approvedAt: null, approvedById: null, needsRecurringRefresh: true } });
    await tx.contractHistory.create({ data: { workspaceId, contractId, actorUserId, event: 'LINE_ITEM_REMOVED', description: `Item removido: ${before.description}. Rascunhos precisam atualizar os itens; faturas emitidas foram preservadas.`, before: JSON.stringify(before) } });
    await tx.auditLog.create({ data: { workspaceId, actorUserId, action: 'contract.line_item_deleted', entityType: 'CONTRACT', entityId: contractId, beforeJson: JSON.stringify(before), ...request, severity: 'INFO' } });
    return { success: true };
  });
}
