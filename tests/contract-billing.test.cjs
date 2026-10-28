// Build @peanut/db, @peanut/documents and peanut-worker first.
// Persistence is simulated here; no production database, mailbox or WhatsApp is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { Readable } = require('node:stream');
const { createHash } = require('node:crypto');
const { createServer } = require('node:net');
const path = require('node:path');
const { Prisma, prepareContractPeriod, updateContractInvoice, approveContractInvoice, issueContractInvoice, contractBillingDates, contractCoversPeriod, recurringBaseItems, invoiceAmounts } = require('../packages/db/dist');
const { sendContractEmails, runContractBilling } = require('../apps/worker/dist/contract-billing');
const workerRequire = createRequire(path.resolve(__dirname, '../apps/worker/package.json'));
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ws = id(1), client = id(2), contractId = id(3), actor = id(4);
const now = new Date('2026-10-08T12:00:00.000Z');
const pdf = Buffer.from('%PDF-1.4\nSynthetic test invoice\n%%EOF');
const sha = createHash('sha256').update(pdf).digest('hex');

function fixture() {
  const contract = {
    id: contractId, workspaceId: ws, clientId: client, number: 'CTR-TEST', title: 'Suporte mensal', status: 'ACTIVE', type: 'RECURRING_SUPPORT',
    startDate: new Date('2026-01-01T00:00:00Z'), endDate: null, monthlyAmountCents: 170031, currency: 'BRL',
    billingIssueDay: 8, billingDay: 8, billingIssueTime: '09:00', billingAutoIssue: true, billingAutoEmail: true,
    billingEmailRecipients: ['finance@example.invalid', 'director@example.invalid'], billingWhatsappNumbers: [], billingPaymentMethod: 'PIX', billingPixKey: 'test-pix-key',
    workspace: { id: ws, name: 'Synthetic Company', brandName: 'Synthetic Company', timeZone: 'America/Sao_Paulo' },
    client: { id: client, legalName: 'Synthetic Client', tradeName: 'Synthetic Client', email: 'finance@example.invalid', document: null, phone: null },
    lineItems: [],
  };
  const state = { contract, invoices: [], events: [], history: [], files: [], documents: [], tickets: [], orders: [], locks: 0 };
  let counter = 10;
  const invoiceView = row => row ? { ...row, billingScheduleEvent: eventView(state.events.find(event => event.invoiceId === row.id)) } : null;
  const eventView = row => row ? { ...row, contract: state.contract } : null;
  const compare = (value, condition) => {
    if (condition === null || typeof condition !== 'object' || condition instanceof Date) return value === condition;
    if ('not' in condition && value === condition.not) return false;
    if ('in' in condition && !condition.in.includes(value)) return false;
    if ('lt' in condition && !(value < condition.lt)) return false;
    if ('lte' in condition && !(value <= condition.lte)) return false;
    if ('gt' in condition && !(value > condition.gt)) return false;
    return true;
  };
  const match = (row, where = {}) => row && Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some(part => match(row, part));
    if (key === 'invoice') return match(state.invoices.find(invoice => invoice.id === row.invoiceId), value);
    if (key === 'contract') return match(state.contract, value);
    if (key === 'contractId_periodKey') return row.contractId === value.contractId && row.periodKey === value.periodKey;
    return value === undefined || compare(row[key], value);
  });
  const assign = (row, data) => {
    for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
    return row;
  };
  let transactionTail = Promise.resolve();
  const db = {
    workspaceEmailSettings: { findUnique: async () => ({ enabled: true, host: 'smtp.example.invalid', port: 587, security: 'STARTTLS', username: '', passwordEncrypted: null, fromEmail: 'billing@example.invalid', fromName: 'Billing Test', revision: 1 }) },
    $queryRaw: async () => { state.locks++; return []; },
    $transaction: fn => {
      const operation = transactionTail.then(() => fn(db));
      transactionTail = operation.catch(() => {});
      return operation;
    },
    contract: {
      findFirst: async ({ where }) => match(state.contract, where) ? state.contract : null,
      findUnique: async ({ where }) => state.contract.id === where.id ? state.contract : null,
      findUniqueOrThrow: async ({ where }) => { assert.equal(where.id, contractId); return state.contract; },
      findMany: async ({ where }) => match(state.contract, where) ? [state.contract] : [],
    },
    invoice: {
      create: async ({ data }) => { const row = { id: id(counter++), ...data, items: data.items.create.map((item, index) => ({ ...item, id: id(counter++), sortOrder: index })) }; state.invoices.push(row); return invoiceView(row); },
      findFirst: async ({ where }) => invoiceView(state.invoices.find(row => match(row, where))),
      update: async ({ where, data }) => {
        const row = state.invoices.find(invoice => invoice.id === where.id);
        const { items, ...rest } = data;
        assign(row, rest);
        if (items) row.items = items.create.map(item => ({ ...item, id: id(counter++) }));
        return invoiceView(row);
      },
    },
    invoiceItem: { deleteMany: async ({ where }) => { state.invoices.find(row => row.id === where.invoiceId).items = []; return { count: 1 }; } },
    billingScheduleEvent: {
      findUnique: async ({ where }) => {
        const row = state.events.find(event => match(event, where));
        return row ? { ...eventView(row), invoice: state.invoices.find(invoice => invoice.id === row.invoiceId) } : null;
      },
      findMany: async ({ where, take = 100 }) => state.events.filter(row => match(row, where)).slice(0, take).map(row => ({ ...eventView(row), invoice: state.invoices.find(invoice => invoice.id === row.invoiceId) })),
      upsert: async ({ where, create, update }) => {
        let row = state.events.find(event => match(event, where));
        if (row) assign(row, update);
        else { row = { id: id(counter++), emailStatus: 'NOT_REQUESTED', emailRecipients: [], emailAcceptedRecipients: [], emailRejectedRecipients: [], emailAttempts: 0, approvedAt: null, emailAttemptedAt: null, emailNextAttemptAt: null, emailPdfFileObjectId: null, ...create }; state.events.push(row); }
        return { ...eventView(row), invoice: state.invoices.find(invoice => invoice.id === row.invoiceId) };
      },
      update: async ({ where, data }) => assign(state.events.find(row => match(row, where)), data),
      updateMany: async ({ where, data }) => { const rows = state.events.filter(row => match(row, where)); rows.forEach(row => assign(row, data)); return { count: rows.length }; },
    },
    ticket: { findFirst: async ({ where }) => state.tickets.find(row => match(row, where)) || null },
    serviceOrder: { findFirst: async ({ where }) => state.orders.find(row => match(row, where)) || null },
    contractHistory: { create: async ({ data }) => { state.history.push(data); return data; } },
    fileObject: { findFirst: async ({ where }) => state.files.find(row => match(row, where)) || null },
    generatedDocument: { findFirst: async ({ where }) => state.documents.find(row => match(row, where)) || null },
  };
  const store = { get: async () => Readable.from([pdf]) };
  return { db, state, store };
}
async function prepared(f = fixture(), period = '2026-10') {
  const event = await prepareContractPeriod(f.db, contractId, ws, period, actor);
  return { ...f, event, invoice: f.state.invoices.find(row => row.id === event.invoiceId) };
}
async function issued(f) {
  await approveContractInvoice(f.db, f.invoice.id, ws, actor);
  await issueContractInvoice(f.db, f.invoice.id, ws, now, true);
  const event = f.state.events[0];
  event.emailPdfFileObjectId = id(500);
  f.state.files.push({ id: id(500), workspaceId: ws, mimeType: 'application/pdf', bucket: 'private', key: 'test.pdf', originalFilename: 'test.pdf', sizeBytes: BigInt(pdf.length), sha256: sha });
  f.state.documents.push({ workspaceId: ws, entityType: 'INVOICE', entityId: f.invoice.id, fileObjectId: id(500) });
  return f;
}
const extra = overrides => ({ type: 'SERVICE', description: 'Retirada e devolução de nobreak', quantity: 1, unit: 'UN', unitPrice: 125.50, billingKind: 'EXTRA', ...overrides });

test('preparing the same month concurrently produces one draft and one agreement snapshot', async () => {
  const f = fixture();
  const events = await Promise.all(Array.from({ length: 5 }, () => prepareContractPeriod(f.db, contractId, ws, '2026-10', actor)));
  assert.equal(f.state.invoices.length, 1);
  assert.equal(f.state.events.length, 1);
  assert.equal(new Set(events.map(event => event.invoiceId)).size, 1);
  assert.equal(f.state.invoices[0].items[0].billingKind, 'BASE');
  assert.equal(String(f.state.invoices[0].totalAmount), '1700.31');
  assert.equal(f.state.locks, 5);
});

test('extras belong to their month, links are optional and fixed rows cannot be changed', async () => {
  const f = await prepared();
  await updateContractInvoice(f.db, f.invoice.id, ws, { items: [...f.invoice.items, extra()] });
  assert.equal(String(f.state.invoices[0].totalAmount), '1825.81');
  assert.equal(f.state.invoices[0].items[1].sourceTicketId, null);
  assert.equal(f.state.contract.monthlyAmountCents, 170031);
  const next = await prepareContractPeriod(f.db, contractId, ws, '2026-11', actor);
  assert.equal(next.invoice.items.length, 1);
  assert.equal(String(next.invoice.totalAmount), '1700.31');
  const altered = f.state.invoices[0].items.map(item => ({ ...item, unitPrice: 1 }));
  await assert.rejects(updateContractInvoice(f.db, f.invoice.id, ws, { items: altered }), /itens fixos/);
});

test('optional ticket and service order links are constrained to the same client and workspace', async () => {
  const f = await prepared();
  f.state.tickets.push({ id: id(50), workspaceId: ws, clientId: client });
  f.state.orders.push({ id: id(51), workspaceId: ws, clientId: client }, { id: id(52), workspaceId: id(999), clientId: client });
  await updateContractInvoice(f.db, f.invoice.id, ws, { items: [...f.invoice.items, extra({ sourceTicketId: id(50), sourceServiceOrderId: id(51) })] });
  assert.equal(f.state.invoices[0].items[1].sourceTicketId, id(50));
  await assert.rejects(updateContractInvoice(f.db, f.invoice.id, ws, { items: [...f.invoice.items.filter(row => row.billingKind === 'BASE'), extra({ sourceServiceOrderId: id(52) })] }), /não pertence/);
  await assert.rejects(updateContractInvoice(f.db, f.invoice.id, id(999), {}), /não encontrada/);
});

test('approval is invalidated by edits; early issuance and editing issued invoices are rejected', async () => {
  const f = await prepared();
  await assert.rejects(issueContractInvoice(f.db, f.invoice.id, ws, now, true), /Confira/);
  await approveContractInvoice(f.db, f.invoice.id, ws, actor);
  await assert.rejects(issueContractInvoice(f.db, f.invoice.id, ws, new Date('2026-10-08T11:59:59Z'), true), /ainda não chegou/);
  await updateContractInvoice(f.db, f.invoice.id, ws, { observations: 'Adicional revisado' });
  assert.equal(f.state.events[0].approvedAt, null);
  await approveContractInvoice(f.db, f.invoice.id, ws, actor);
  await issueContractInvoice(f.db, f.invoice.id, ws, now, true);
  await assert.rejects(updateContractInvoice(f.db, f.invoice.id, ws, { observations: 'Changed' }), /rascunho/);
  await issueContractInvoice(f.db, f.invoice.id, ws, now, true);
  assert.equal(f.state.history.filter(row => row.event === 'BILLING_PERIOD_ISSUED').length, 1);
});

test('refreshing a draft base preserves extras and never changes already prepared future months', async () => {
  const f = await prepared();
  await updateContractInvoice(f.db, f.invoice.id, ws, { items: [...f.invoice.items, extra()] });
  const next = await prepareContractPeriod(f.db, contractId, ws, '2026-11', actor);
  f.state.contract.monthlyAmountCents = 200000;
  await updateContractInvoice(f.db, f.invoice.id, ws, { refreshBase: true });
  assert.equal(String(f.state.invoices[0].totalAmount), '2125.5');
  assert.equal(f.state.invoices[0].items[1].billingKind, 'EXTRA');
  assert.equal(String(next.invoice.totalAmount), '1700.31');
});

test('validity, suspended contracts, recipients and fixed item consistency are enforced', async () => {
  const f = fixture();
  f.state.contract.startDate = new Date('2026-11-01T00:00:00Z');
  await assert.rejects(prepareContractPeriod(f.db, contractId, ws, '2026-10', actor), /não cobre/);
  f.state.contract.startDate = new Date('2026-01-01T00:00:00Z');
  f.state.contract.status = 'SUSPENDED';
  await assert.rejects(prepareContractPeriod(f.db, contractId, ws, '2026-10', actor), /não está ativo/);
  f.state.contract.status = 'ACTIVE';
  f.state.contract.lineItems = [{ recurring: true, description: 'Wrong amount', quantity: new Prisma.Decimal(1), unitPriceCents: 1 }];
  assert.throws(() => recurringBaseItems(f.state.contract), /soma/);
  f.state.contract.lineItems = [];
  const month = await prepared(f);
  f.state.events[0].emailRecipients = [];
  await assert.rejects(approveContractInvoice(f.db, month.invoice.id, ws, actor), /destinatários/);
  assert.equal(contractCoversPeriod({ ...f.state.contract, endDate: new Date('2026-09-30T00:00:00Z') }, '2026-10', 'America/Sao_Paulo'), false);
});

test('month-end billing and cross-month due dates honor the selected zone', () => {
  const agreement = { billingDay: 31, billingIssueDay: 31, billingIssueTime: '09:00', startDate: new Date('2026-01-01T00:00:00Z') };
  const february = contractBillingDates(agreement, '2027-02', 'America/Sao_Paulo');
  assert.equal(february.scheduledFor.toISOString(), '2027-02-28T12:00:00.000Z');
  assert.equal(february.dueDate.toISOString(), '2027-02-28T00:00:00.000Z');
  const tokyo = contractBillingDates({ ...agreement, billingDay: 5, billingIssueDay: 25 }, '2026-10', 'Asia/Tokyo');
  assert.equal(tokyo.scheduledFor.toISOString(), '2026-10-25T00:00:00.000Z');
  assert.equal(tokyo.dueDate.toISOString(), '2026-11-05T00:00:00.000Z');
});

test('decimal totals and internal material costs are recalculated without accepting client totals', () => {
  const computed = invoiceAmounts([extra({ quantity: 3, unitPrice: 0.10, totalPrice: 999 }), extra({ type: 'MATERIAL', unitPrice: 10, unitCost: 4 })], 0.10);
  assert.equal(String(computed.totals.totalAmount), '10.2');
  assert.equal(String(computed.totals.netAmount), '6.2');
  assert.throws(() => invoiceAmounts([extra({ quantity: 1.001 })]), /duas casas/);
  assert.throws(() => invoiceAmounts([extra()], 9999), /Desconto/);
});

test('scheduler prepares drafts, requires approval and queues one invoice per period', async () => {
  const f = fixture(); const jobs = new Map();
  const queue = { add: async (name, data, options) => jobs.set(options.jobId, { name, data }) };
  await runContractBilling(f.db, queue, f.store, now, null);
  assert.equal(f.state.invoices[0].status, 'DRAFT');
  assert.equal(jobs.size, 0);
  await approveContractInvoice(f.db, f.state.invoices[0].id, ws, actor);
  await runContractBilling(f.db, queue, f.store, now, null);
  await runContractBilling(f.db, queue, f.store, now, null);
  assert.equal(f.state.invoices.length, 1);
  assert.equal(f.state.invoices[0].status, 'ISSUED');
  assert.equal(jobs.size, 1);
});

test('email attaches the correct PDF once and never resends accepted recipients', async () => {
  const f = await issued(await prepared()); const messages = [];
  const transport = { sendMail: async message => { messages.push(message); return { accepted: message.to, rejected: [] }; } };
  await sendContractEmails(f.db, f.store, now, transport);
  await sendContractEmails(f.db, f.store, now, transport);
  assert.equal(messages.length, 1);
  assert.equal(f.state.events[0].emailStatus, 'SENT');
  assert.deepEqual(messages[0].attachments[0].content, pdf);
  assert.deepEqual(messages[0].to, f.state.contract.billingEmailRecipients);
  assert.ok(messages[0].subject.includes('2026-10'));
  assert.equal(messages[0].disableUrlAccess, true);
});

test('partial acceptance is visible and a requested retry targets only rejected recipients', async () => {
  const f = await issued(await prepared()); const messages = [];
  const transport = { sendMail: async message => { messages.push(message); return messages.length === 1 ? { accepted: [message.to[0]], rejected: [message.to[1]] } : { accepted: message.to, rejected: [] }; } };
  await sendContractEmails(f.db, f.store, now, transport);
  assert.equal(f.state.events[0].emailStatus, 'PARTIAL');
  await sendContractEmails(f.db, f.store, now, transport);
  assert.equal(messages.length, 1);
  f.state.events[0].emailStatus = 'QUEUED';
  await sendContractEmails(f.db, f.store, now, transport);
  assert.deepEqual(messages[1].to, ['director@example.invalid']);
  assert.equal(f.state.events[0].emailStatus, 'SENT');
});

test('disabled workspace SMTP pauses pending delivery without spending attempts and resumes from database settings', async () => {
  const f = await issued(await prepared()); let calls = 0;
  const configured = f.db.workspaceEmailSettings.findUnique;
  f.db.workspaceEmailSettings.findUnique = async () => ({ ...await configured(), enabled: false });
  const transport = { sendMail: async message => { calls++; assert.equal(message.from.address, 'billing@example.invalid'); return { accepted: message.to }; } };
  await sendContractEmails(f.db, f.store, now, transport);
  assert.equal(f.state.events[0].emailStatus, 'PAUSED'); assert.equal(f.state.events[0].emailAttempts, 0); assert.equal(calls, 0);
  f.db.workspaceEmailSettings.findUnique = configured;
  await sendContractEmails(f.db, f.store, now, transport);
  assert.equal(f.state.events[0].emailStatus, 'SENT'); assert.equal(calls, 1);
});

test('ambiguous SMTP outcomes require review, while known connection failures use bounded retries', async () => {
  const f = await issued(await prepared()); let calls = 0;
  const ambiguous = { sendMail: async () => { calls++; throw Object.assign(new Error('timeout'), { command: 'DATA', code: 'ETIMEDOUT' }); } };
  await sendContractEmails(f.db, f.store, now, ambiguous);
  assert.equal(f.state.events[0].emailStatus, 'UNKNOWN');
  await sendContractEmails(f.db, f.store, new Date(now.getTime() + 3600000), ambiguous);
  assert.equal(calls, 1);
  const known = await issued(await prepared());
  const failed = { sendMail: async () => { throw Object.assign(new Error('connection refused'), { command: 'CONN', code: 'ECONNECTION' }); } };
  await sendContractEmails(known.db, known.store, now, failed);
  assert.equal(known.state.events[0].emailStatus, 'FAILED');
  await sendContractEmails(known.db, known.store, now, failed);
  assert.equal(known.state.events[0].emailAttempts, 1);
  known.state.events[0].emailAttempts = 5;
  await sendContractEmails(known.db, known.store, new Date(now.getTime() + 3600000), failed);
  assert.equal(known.state.events[0].emailAttempts, 5);
});

test('invalid PDF integrity, cancellation and stale send claims cannot cause a delivery', async () => {
  const f = await issued(await prepared()); let calls = 0;
  const transport = { sendMail: async () => { calls++; return { accepted: [] }; } };
  f.state.files[0].sha256 = 'bad';
  await sendContractEmails(f.db, f.store, now, transport);
  assert.equal(calls, 0);
  f.state.invoices[0].status = 'CANCELLED';
  await sendContractEmails(f.db, f.store, new Date(now.getTime() + 600000), transport);
  assert.equal(calls, 0);
  f.state.events[0].emailStatus = 'SENDING'; f.state.events[0].emailAttemptedAt = new Date(now.getTime() - 20 * 60000);
  await sendContractEmails(f.db, f.store, now, transport);
  assert.equal(f.state.events[0].emailStatus, 'UNKNOWN');
});

test('SMTP integration uses a loopback capture server and generates a real MIME PDF attachment', async () => {
  let message = '';
  const server = createServer(socket => {
    socket.write('220 localhost test SMTP\r\n');
    let buffer = '', dataMode = false;
    socket.on('data', chunk => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const index = buffer.indexOf('\r\n'); const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (dataMode) { if (line === '.') { dataMode = false; socket.write('250 accepted for local test\r\n'); } else message += line + '\r\n'; }
        else if (/^EHLO/.test(line)) socket.write('250 localhost\r\n');
        else if (/^DATA/.test(line)) { dataMode = true; socket.write('354 send data\r\n'); }
        else if (/^QUIT/.test(line)) { socket.end('221 bye\r\n'); }
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const transport = workerRequire('nodemailer').createTransport({ host: '127.0.0.1', port: server.address().port, secure: false, ignoreTLS: true });
  try {
    const f = await issued(await prepared());
    await sendContractEmails(f.db, f.store, now, transport);
    assert.equal(f.state.events[0].emailStatus, 'SENT');
    assert.ok(message.includes('Content-Type: application/pdf'));
    assert.ok(message.includes(pdf.toString('base64')));
    assert.ok(message.includes('finance@example.invalid'));
  } finally { transport.close(); await new Promise(resolve => server.close(resolve)); }
});
