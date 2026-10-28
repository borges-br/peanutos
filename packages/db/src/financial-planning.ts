import { Prisma, PrismaClient } from '@prisma/client';
import { calendarDateKey, dateKey } from '@peanut/utils';
import { contractBillingDates, contractCoversPeriod, monthBounds, recurringBaseItems, invoiceAmounts, ContractBillingError } from './contract-billing';
import { recurringAddonItems, oneOffItems } from './contract-items';

const amount = (value: any) => new Prisma.Decimal(value || 0).mul(100).toDecimalPlaces(0).toNumber();
export function shiftMonth(period: string, delta: number) {
  monthBounds(period);
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Read-only estimate. A saved invoice always takes precedence over the rule projection. */
export function contractPeriodSummary(contract: any, period: string, zone: string, event?: any) {
  monthBounds(period);
  const recurring = recurringAddonItems(contract, period, zone);
  let warning: string | null = null;
  try { recurringBaseItems(contract); } catch (e: any) { warning = e.message; }
  const projectedRecurringCents = recurring.reduce((sum: number, item: any) => sum + amount(item.quantity.mul(item.unitPrice)), 0);
  const invoice = event?.invoice;
  const sumKind = (kind: string) => (invoice?.items || []).filter((item: any) => (item.billingKind || 'EXTRA') === kind).reduce((sum: number, item: any) => sum + amount(item.totalPrice ?? new Prisma.Decimal(item.quantity).mul(item.unitPrice)), 0);
  const baseCents = invoice ? sumKind('BASE') : contract.monthlyAmountCents;
  const recurringCents = invoice ? sumKind('RECURRING') : projectedRecurringCents;
  const extraCents = invoice ? sumKind('EXTRA') : oneOffItems(contract, period).reduce((sum: number, item: any) => sum + amount(item.quantity.mul(item.unitPrice)), 0);
  const discountCents = invoice ? amount(invoice.discountAmount) : 0;
  return { period, baseCents, recurringCents, extraCents, discountCents,
    totalCents: invoice ? amount(invoice.totalAmount) : baseCents + recurringCents + extraCents,
    ruleTotalCents: contract.monthlyAmountCents + projectedRecurringCents,
    invoiceId: invoice?.id || null, invoiceStatus: invoice?.status || null,
    needsRecurringRefresh: !!event?.needsRecurringRefresh, warning,
    covered: contractCoversPeriod(contract, period, zone), source: invoice ? 'INVOICE' : 'PROJECTION',
    recurringItems: recurring.map((item: any) => ({ description: item.description, amountCents: amount(item.quantity.mul(item.unitPrice)), note: item.recurrenceSnapshot.note })),
  };
}

export async function getContractPeriodSummary(db: PrismaClient, workspaceId: string, contractId: string, period: string) {
  monthBounds(period);
  const contract = await db.contract.findFirst({ where: { id: contractId, workspaceId }, include: { workspace: true, lineItems: true } });
  if (!contract) throw new ContractBillingError('Contrato não encontrado.');
  const event = await db.billingScheduleEvent.findUnique({ where: { contractId_periodKey: { contractId, periodKey: period } }, include: { invoice: { include: { items: true } } } });
  return contractPeriodSummary(contract, period, contract.workspace.timeZone, event);
}

/** Contract/month identity prevents counting both a projected recurrence and its invoice. */
export function buildFinancialForecast(contracts: any[], invoices: any[], period: string, zone: string, now = new Date()) {
  monthBounds(period);
  const today = dateKey(now, zone);
  const rows: any[] = [], overdue: any[] = [], warnings: string[] = [];
  const label = (record: any) => record.client?.tradeName || record.client?.legalName || record.clientName || 'Cliente';
  for (const invoice of invoices) {
    if (!['DRAFT', 'ISSUED', 'OVERDUE'].includes(invoice.status)) continue;
    const dueDate = calendarDateKey(invoice.dueDate, zone);
    const row = { id: `invoice-${invoice.id}`, invoiceId: invoice.id, contractId: invoice.contractId,
      customer: label(invoice), description: invoice.number, dueDate, amountCents: amount(invoice.totalAmount),
      kind: invoice.status === 'DRAFT' ? 'DRAFT' : 'OPEN', status: invoice.status };
    if (dueDate.slice(0, 7) === period) rows.push(row);
    if (invoice.status !== 'DRAFT' && dueDate < today) overdue.push({ ...row, daysOverdue: Math.round((Date.parse(today) - Date.parse(dueDate)) / 86400000) });
  }
  for (const contract of contracts) {
    for (const competence of [shiftMonth(period, -1), period]) {
      if (!contractCoversPeriod(contract, competence, zone) || contract.currency !== 'BRL') continue;
      const event = (contract.billingScheduleEvents || []).find((item: any) => item.periodKey === competence);
      if (event && (event.invoiceId || ['CANCELLED', 'SKIPPED', 'GENERATED_FUTURE_INVOICE'].includes(event.status))) continue;
      const knownInvoices = new Set((contract.billingScheduleEvents || []).map((item: any) => item.invoiceId).filter(Boolean));
      const manualInvoice = invoices.some(invoice => invoice.contractId === contract.id && !knownInvoices.has(invoice.id) && invoice.status !== 'CANCELLED' && calendarDateKey(invoice.dueDate, zone).slice(0, 7) === period);
      if (manualInvoice) { warnings.push(`${contract.number}: há fatura vinculada sem competência identificada neste mês. Revise o vínculo; a projeção adicional foi omitida para evitar duplicidade.`); continue; }
      try {
        const dates = contractBillingDates(contract, competence, zone);
        const dueDate = calendarDateKey(dates.dueDate, zone);
        if (dueDate.slice(0, 7) !== period) continue;
        if (contract.endDate && dateKey(dates.scheduledFor, zone) > calendarDateKey(contract.endDate, zone)) continue;
        const totals = invoiceAmounts([...recurringBaseItems(contract), ...recurringAddonItems(contract, competence, zone), ...oneOffItems(contract, competence)]);
        rows.push({ id: `contract-${contract.id}-${competence}`, contractId: contract.id, invoiceId: null, customer: label(contract),
          description: `${contract.number} · ${competence}`, periodKey: competence, dueDate, amountCents: amount(totals.totals.totalAmount), kind: 'PROJECTED', status: 'A_PREPARAR' });
      } catch (e: any) { warnings.push(`${contract.number} (${competence}): ${e.message}`); }
    }
  }
  rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.customer.localeCompare(b.customer));
  const sum = (kind: string) => rows.filter(row => row.kind === kind).reduce((total, row) => total + row.amountCents, 0);
  return { period, today, rows, overdue, warnings: [...new Set(warnings)],
    projectedCents: sum('PROJECTED'), draftCents: sum('DRAFT'), openCents: sum('OPEN'),
    expectedCents: rows.reduce((total, row) => total + row.amountCents, 0),
    overdueCents: overdue.reduce((total, row) => total + row.amountCents, 0) };
}

export async function getFinancialForecast(db: PrismaClient, workspaceId: string, period?: string, now = new Date()) {
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { timeZone: true } });
  const selected = period || shiftMonth(dateKey(now, workspace.timeZone).slice(0, 7), 1);
  monthBounds(selected);
  return db.$transaction(async tx => {
    const contracts = await tx.contract.findMany({ where: { workspaceId, status: 'ACTIVE', type: { in: ['RECURRING_SUPPORT', 'HYBRID'] } }, include: { client: true, lineItems: true, billingScheduleEvents: { where: { periodKey: { in: [shiftMonth(selected, -1), selected] } } } } });
    const invoices = await tx.invoice.findMany({ where: { workspaceId, status: { in: ['DRAFT', 'ISSUED', 'OVERDUE', 'PAID'] } }, include: { client: true } });
    return buildFinancialForecast(contracts, invoices, selected, workspace.timeZone, now);
  }, { isolationLevel: 'RepeatableRead' });
}
