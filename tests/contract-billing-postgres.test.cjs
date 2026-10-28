const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient, prepareContractPeriod, updateContractInvoice, approveContractInvoice, issueContractInvoice, freezeContractDocument } = require('../packages/db/dist');
const url = process.env.CONTRACT_BILLING_TEST_DATABASE_URL;
if (!url) {
  test('PostgreSQL integration requires the isolated QA runner', { skip: true }, () => {});
} else {
  const target = new URL(url);
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname));
  assert.equal(target.pathname, '/peanut_contract_billing_qa');
  const db = new PrismaClient({ datasources: { db: { url } } });
  const workspaces = [];
  const now = new Date('2026-10-08T12:00:00.000Z');
  async function fixture() {
    const workspace = await db.workspace.create({ data: { name: 'Synthetic billing QA', slug: `billing-qa-${randomUUID()}`, timeZone: 'America/Sao_Paulo' } });
    workspaces.push(workspace.id);
    const user = await db.user.create({ data: { workspaceId: workspace.id, name: 'QA User', email: `${randomUUID()}@example.invalid`, passwordHash: 'test-only-not-a-password', role: 'OWNER' } });
    const client = await db.client.create({ data: { workspaceId: workspace.id, legalName: 'Synthetic QA Client', document: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14), email: 'finance@example.invalid' } });
    const contract = await db.contract.create({ data: { workspaceId: workspace.id, clientId: client.id, number: `CTR-QA-${randomUUID().slice(0, 8)}`, title: 'Fixed monthly support', status: 'ACTIVE', type: 'RECURRING_SUPPORT', startDate: new Date('2026-01-01T00:00:00Z'), monthlyAmountCents: 170031, billingDay: 8, billingIssueDay: 8, billingIssueTime: '09:00', billingAutoIssue: true, billingAutoEmail: true, billingEmailRecipients: ['finance@example.invalid'] } });
    return { workspace, user, client, contract };
  }
  test.after(async () => { await db.workspace.deleteMany({ where: { id: { in: workspaces } } }); await db.$disconnect(); await require('../packages/db/dist').prisma.$disconnect(); });

  test('real PostgreSQL locks and unique keys prevent duplicate monthly invoices', async () => {
    const f = await fixture();
    const events = await Promise.all(Array.from({ length: 8 }, () => prepareContractPeriod(db, f.contract.id, f.workspace.id, '2026-10', f.user.id)));
    assert.equal(new Set(events.map(event => event.invoiceId)).size, 1);
    assert.equal(await db.billingScheduleEvent.count({ where: { contractId: f.contract.id } }), 1);
    assert.equal(await db.invoice.count({ where: { contractId: f.contract.id } }), 1);
  });

  test('monthly extras, optional links, totals and new-month isolation persist in PostgreSQL', async () => {
    const f = await fixture();
    const event = await prepareContractPeriod(db, f.contract.id, f.workspace.id, '2026-10', f.user.id);
    const updated = await updateContractInvoice(db, event.invoiceId, f.workspace.id, { items: [...event.invoice.items, { type: 'SERVICE', description: 'Nobreak collection and delivery', quantity: 1, unit: 'UN', unitPrice: 125.50, billingKind: 'EXTRA' }] });
    assert.equal(String(updated.totalAmount), '1825.81');
    assert.equal(updated.items[1].sourceTicketId, null);
    const next = await prepareContractPeriod(db, f.contract.id, f.workspace.id, '2026-11', f.user.id);
    assert.equal(next.invoice.items.length, 1);
    assert.equal(String(next.invoice.totalAmount), '1700.31');
    const wrong = await fixture();
    await assert.rejects(updateContractInvoice(db, event.invoiceId, wrong.workspace.id, { observations: 'cross-workspace' }), /não encontrada/);
  });

  test('a concurrent edit and issuance cannot both commit an approved monthly invoice', async () => {
    const f = await fixture();
    const event = await prepareContractPeriod(db, f.contract.id, f.workspace.id, '2026-10', f.user.id);
    await approveContractInvoice(db, event.invoiceId, f.workspace.id, f.user.id);
    const results = await Promise.allSettled([
      updateContractInvoice(db, event.invoiceId, f.workspace.id, { observations: 'changed before sending' }),
      issueContractInvoice(db, event.invoiceId, f.workspace.id, now, true),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const invoice = await db.invoice.findUniqueOrThrow({ where: { id: event.invoiceId }, include: { billingScheduleEvent: true } });
    if (invoice.status === 'DRAFT') assert.equal(invoice.billingScheduleEvent.approvedAt, null);
    else assert.equal(invoice.status, 'ISSUED');
  });

  test('failed source validation rolls back without losing invoice items or approval', async () => {
    const f = await fixture();
    const event = await prepareContractPeriod(db, f.contract.id, f.workspace.id, '2026-10', f.user.id);
    await approveContractInvoice(db, event.invoiceId, f.workspace.id, f.user.id);
    await assert.rejects(updateContractInvoice(db, event.invoiceId, f.workspace.id, { items: [...event.invoice.items, { type: 'SERVICE', description: 'Invalid optional source', quantity: 1, unitPrice: 10, sourceTicketId: randomUUID() }] }), /não pertence/);
    const retained = await db.invoice.findUniqueOrThrow({ where: { id: event.invoiceId }, include: { items: true, billingScheduleEvent: true } });
    assert.equal(retained.items.length, 1);
    assert.ok(retained.billingScheduleEvent.approvedAt);
    assert.equal(String(retained.totalAmount), '1700.31');
  });

  test('contract details return recurrence/history and the controller protects financial data', async () => {
    const f = await fixture();
    await prepareContractPeriod(db, f.contract.id, f.workspace.id, '2026-10', f.user.id);
    const { ContractsService } = require('../apps/api/dist/contracts/contracts.service');
    const { ContractsController } = require('../apps/api/dist/contracts/contracts.controller');
    const service = new ContractsService({ log: async () => {} }, { emit: async () => {} });
    const details = await service.getById(f.contract.id, f.workspace.id);
    assert.equal(details.billingScheduleEvents.length, 1);
    assert.equal(details.history.length, 1);
    const controller = new ContractsController(service, {});
    const protectedDetails = await controller.getById(f.contract.id, { workspaceId: f.workspace.id, role: 'TECHNICIAN' });
    assert.equal(protectedDetails.monthlyAmountCents, 0);
    assert.deepEqual(protectedDetails.billingScheduleEvents, []);
    assert.deepEqual(protectedDetails.history, []);
    await assert.rejects(service.getById(f.contract.id, randomUUID()), /não encontrado/);
  });

  test('a valid contract without a custom SLA still links the ticket and expired quotas do not apply', async () => {
    const f = await fixture();
    const { SlaService } = require('../apps/api/dist/tickets/sla.service');
    const { ContractsQuotaService } = require('../apps/api/dist/contracts/contracts-quota.service');
    const result = await new SlaService().calculateSla(f.workspace.id, 'MEDIUM', now, f.client.id);
    assert.equal(result.contractId, f.contract.id);
    const quota = new ContractsQuotaService({ log: async () => {} });
    await db.contract.update({ where: { id: f.contract.id }, data: { endDate: new Date('2026-01-02T00:00:00Z') } });
    assert.equal(await quota.getActiveContract(f.workspace.id, f.client.id), null);
  });

  test('concurrent PDF jobs reuse the first immutable rendering snapshot', async () => {
    const f = await fixture();
    const event = await prepareContractPeriod(db, f.contract.id, f.workspace.id, '2026-10', f.user.id);
    await approveContractInvoice(db, event.invoiceId, f.workspace.id, f.user.id);
    await issueContractInvoice(db, event.invoiceId, f.workspace.id, now, true);
    const snapshots = await Promise.all([
      freezeContractDocument(db, event.invoiceId, f.workspace.id, { generatedAt: 'first', brand: 'first' }),
      freezeContractDocument(db, event.invoiceId, f.workspace.id, { generatedAt: 'second', brand: 'second' }),
    ]);
    assert.deepEqual(snapshots[0], snapshots[1]);
  });

  const { saveContractLineItem, removeContractLineItem, recurringAddonItems } = require('../packages/db/dist');
  const addon = overrides => ({ description: 'Synthetic recurring service', itemType: 'SERVICE', quantity: 1, unitPriceCents: 10000, recurring: true, billingRole: 'ADDON', startsOn: '2026-10-01', endsOn: null, endMode: 'OPEN', proration: 'NONE', ...overrides });
  const save = (f, input, itemId) => saveContractLineItem(db, f.workspace.id, f.contract.id, input, f.user.id, itemId);
  const period = (f, key='2026-10') => prepareContractPeriod(db, f.contract.id, f.workspace.id, key, f.user.id);

  test('base monthly fee, dated recurring services and one-off extras persist separately', async () => {
    const f = await fixture();
    for (const [index, amount] of [34900,59900,39900,13900].entries()) await save(f, addon({ description: `Recurring service ${index}`, unitPriceCents: amount }));
    const event = await period(f);
    assert.equal(event.invoice.items.filter(row => row.billingKind === 'BASE').length, 1);
    assert.equal(event.invoice.items.filter(row => row.billingKind === 'RECURRING').length, 4);
    assert.equal(String(event.invoice.totalAmount), '3186.31');
    await updateContractInvoice(db, event.invoiceId, f.workspace.id, { items: [...event.invoice.items, { type: 'SERVICE', description: 'One-off delivery', quantity: 1, unitPrice: 125.50 }] });
    const next = await period(f, '2026-11');
    assert.equal(String(next.invoice.totalAmount), '3186.31');
    assert.equal((await db.contract.findUniqueOrThrow({ where: { id: f.contract.id } })).monthlyAmountCents, 170031);
  });

  test('each item chooses full price or daily proration, including both boundary dates', async () => {
    const f = await fixture();
    await save(f, addon({ description: 'Full price', startsOn: '2026-10-16', endsOn: '2026-11-15', endMode: 'DATE' }));
    await save(f, addon({ description: 'Daily prorated', startsOn: '2026-10-16', endsOn: '2026-11-15', endMode: 'DATE', proration: 'DAILY' }));
    const oct = await period(f); const nov = await period(f, '2026-11'); const dec = await period(f, '2026-12');
    assert.equal(String(oct.invoice.totalAmount), '1851.92');
    assert.equal(String(nov.invoice.totalAmount), '1850.31');
    assert.equal(String(dec.invoice.totalAmount), '1700.31');
    const row = oct.invoice.items.find(item => item.description === 'Daily prorated');
    assert.equal(row.recurrenceSnapshot.days, 16); assert.equal(row.recurrenceSnapshot.periodDays, 31);
    assert.equal(String(row.totalPrice), '51.61');
    assert.match(row.recurrenceSnapshot.note, /16\/31 dias/);
  });

  test('leap-year days and fractional quantities round the prorated monthly charge to cents', async () => {
    const f = await fixture();
    await save(f, addon({ startsOn: '2028-02-15', endsOn: '2028-02-29', endMode: 'DATE', quantity: 2.5, unitPriceCents: 3999, proration: 'DAILY' }));
    const event = await period(f, '2028-02'); const item = event.invoice.items.find(row => row.billingKind === 'RECURRING');
    assert.equal(item.recurrenceSnapshot.periodDays, 29); assert.equal(item.recurrenceSnapshot.days, 15);
    assert.equal(item.recurrenceSnapshot.monthlyAmountCents, 9998);
    assert.equal(item.recurrenceSnapshot.chargedAmountCents, Math.round(9998*15/29));
    assert.equal(String(item.quantity), '1'); assert.equal(String(item.unitPrice), String(item.totalPrice));
  });

  test('open-ended and contract-ended rules are both bounded by the contract validity', async () => {
    const f = await fixture();
    await db.contract.update({ where: { id: f.contract.id }, data: { startDate: new Date('2026-10-10T00:00:00Z'), endDate: new Date('2026-10-20T00:00:00Z') } });
    await save(f, addon({ proration: 'DAILY', endMode: 'OPEN' }));
    await save(f, addon({ description: 'Contract end rule', proration: 'DAILY', endMode: 'CONTRACT' }));
    const event = await period(f);
    for (const row of event.invoice.items.filter(item => item.billingKind === 'RECURRING')) { assert.equal(row.recurrenceSnapshot.days, 11); assert.equal(row.recurrenceSnapshot.end, '2026-10-20'); }
    await assert.rejects(period(f, '2026-11'), /não está ativo/);
  });

  test('existing base items can be reclassified without duplication and invalid rules roll back', async () => {
    const f = await fixture();
    const item = await save(f, addon({ billingRole: 'BASE', unitPriceCents: 34900, startsOn: null }));
    await assert.rejects(save(f, { billingRole: 'ADDON', startsOn: '2026-02-30' }, item.id), /inválida/);
    assert.equal((await db.contractLineItem.findUniqueOrThrow({ where: { id: item.id } })).billingRole, 'BASE');
    const converted = await save(f, { billingRole: 'ADDON', startsOn: '2026-10-01' }, item.id);
    assert.equal(converted.id, item.id);
    const event = await period(f);
    assert.equal(event.invoice.items.length, 2); assert.equal(String(event.invoice.totalAmount), '2049.31');
    await assert.rejects(save(f, { endMode: 'DATE', endsOn: '2026-09-30' }, item.id), /anterior/);
    await assert.rejects(save(f, { recurring: false }, item.id), /marcado como recorrente/);
    const other = await fixture(); await assert.rejects(saveContractLineItem(db, other.workspace.id, f.contract.id, addon(), other.user.id), /não encontrado/);
  });

  test('rule edits invalidate drafts, explicit refresh preserves extras and issued items remain immutable', async () => {
    const f = await fixture(); const rule = await save(f, addon());
    const oct = await period(f); const nov = await period(f, '2026-11');
    await approveContractInvoice(db, oct.invoiceId, f.workspace.id, f.user.id); await issueContractInvoice(db, oct.invoiceId, f.workspace.id, now, true);
    await updateContractInvoice(db, nov.invoiceId, f.workspace.id, { items: [...nov.invoice.items, { type: 'SERVICE', description: 'One-off', quantity: 1, unitPrice: 25 }] });
    await approveContractInvoice(db, nov.invoiceId, f.workspace.id, f.user.id);
    await save(f, { unitPriceCents: 20000 }, rule.id);
    const stale = await db.billingScheduleEvent.findUniqueOrThrow({ where: { id: nov.id } });
    assert.equal(stale.needsRecurringRefresh, true); assert.equal(stale.approvedAt, null);
    await assert.rejects(approveContractInvoice(db, nov.invoiceId, f.workspace.id, f.user.id), /Atualize/);
    const refreshed = await updateContractInvoice(db, nov.invoiceId, f.workspace.id, { refreshBase: true });
    assert.equal(String(refreshed.totalAmount), '1925.31'); assert.equal(refreshed.billingScheduleEvent.needsRecurringRefresh, false);
    const issued = await db.invoice.findUniqueOrThrow({ where: { id: oct.invoiceId }, include: { items: true } });
    assert.equal(String(issued.items.find(item => item.billingKind === 'RECURRING').unitPrice), '100');
    await removeContractLineItem(db, f.workspace.id, f.contract.id, rule.id, f.user.id);
    const withoutRule = await updateContractInvoice(db, nov.invoiceId, f.workspace.id, { refreshBase: true });
    assert.equal(String(withoutRule.totalAmount), '1725.31');
    assert.equal(await db.contractHistory.count({ where: { contractId: f.contract.id, event: 'LINE_ITEM_REMOVED' } }), 1);
    assert.ok(issued.items.find(row => row.sourceContractLineItemId === rule.id));
  });

  test('recurring invoice rows cannot be forged or reclassified as one-off, and snapshots do not leak to technicians', async () => {
    const f = await fixture(); await save(f, addon()); const event = await period(f);
    const forged = event.invoice.items.map(row => row.billingKind === 'RECURRING' ? { ...row, unitPrice: 1 } : row);
    await assert.rejects(updateContractInvoice(db, event.invoiceId, f.workspace.id, { items: forged }), /itens fixos/);
    const reclassified = event.invoice.items.map(row => row.billingKind === 'RECURRING' ? { ...row, billingKind: 'EXTRA' } : row);
    await assert.rejects(updateContractInvoice(db, event.invoiceId, f.workspace.id, { items: reclassified }), /itens fixos/);
    const { InvoicesService } = require('../apps/api/dist/invoices/invoices.service');
    const protectedInvoice = new InvoicesService({}, {}).mapInvoiceForRole(event.invoice, 'TECHNICIAN');
    assert.equal(protectedInvoice.items[1].recurrenceSnapshot, null);
  });

  test('contract end changes invalidate draft snapshots and contract-ended proration is recalculated', async () => {
    const f = await fixture(); await save(f, addon({ proration: 'DAILY', endMode: 'CONTRACT' })); const event = await period(f);
    await approveContractInvoice(db, event.invoiceId, f.workspace.id, f.user.id);
    const { ContractsService } = require('../apps/api/dist/contracts/contracts.service');
    await new ContractsService({}, {}).update(f.contract.id, { endDate: '2026-10-20' }, f.workspace.id, f.user.id);
    await assert.rejects(approveContractInvoice(db, event.invoiceId, f.workspace.id, f.user.id), /Atualize/);
    const updated = await updateContractInvoice(db, event.invoiceId, f.workspace.id, { refreshBase: true });
    assert.equal(updated.items[1].recurrenceSnapshot.days, 20); assert.equal(String(updated.totalAmount), '1764.83');
  });

  test('concurrent rule changes and issuance serialize without mixing old approval with new amounts', async () => {
    const f = await fixture(); const rule = await save(f, addon()); const event = await period(f);
    await approveContractInvoice(db, event.invoiceId, f.workspace.id, f.user.id);
    const outcomes = await Promise.allSettled([issueContractInvoice(db, event.invoiceId, f.workspace.id, now, true), save(f, { unitPriceCents: 20000 }, rule.id)]);
    assert.equal(outcomes[1].status, 'fulfilled');
    const invoice = await db.invoice.findUniqueOrThrow({ where: { id: event.invoiceId }, include: { items: true, billingScheduleEvent: true } });
    assert.equal(String(invoice.items[1].unitPrice), '100');
    if (invoice.status === 'DRAFT') { assert.equal(invoice.billingScheduleEvent.approvedAt, null); assert.equal(invoice.billingScheduleEvent.needsRecurringRefresh, true); }
    else { assert.equal(invoice.status, 'ISSUED'); assert.equal(outcomes[0].status, 'fulfilled'); }
  });
}
