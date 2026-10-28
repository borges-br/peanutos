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
}
