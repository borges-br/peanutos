// Run after building utils, documents, API and worker: node --test tests/storage-timezone.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Readable } = require('node:stream');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const apiRequire = Module.createRequire(path.join(root, 'apps/api/package.json'));
const { LocalObjectStorage, zonedDateTime, dateKey, calendarDateKey } = require('../packages/utils/dist');
const realDb = require('../packages/db/dist');
const documents = require('../packages/documents/dist');
const { transferFile, verifyFile } = require('../apps/api/scripts/migrate-storage.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'peanut-storage-test-'));
const previousPath = process.env.STORAGE_PATH;
process.env.STORAGE_PATH = temp;
const realDate = Date;
const instant = '2026-10-27T01:30:00.000Z';
global.Date = class extends realDate {
  constructor(...args) { super(...(args.length ? args : [instant])); }
  static now() { return new realDate(instant).getTime(); }
};
let workspace = { id: 'ws', name: 'Test', brandName: 'Test', timeZone: 'America/Sao_Paulo', logoFileObjectId: null };
let fileRows = [];
let generatedRows = [];
let auditRows = [];
let transactionError = false;
let visualSettings = null;
const source = {
  id: 'entity', workspaceId: 'ws', number: 'TEST-1', status: 'DRAFT', clientName: 'Cliente Teste',
  issueDate: new Date(instant), createdAt: new Date(instant), dueDate: new Date('2026-10-30T00:00:00Z'),
  validUntil: new Date('2026-10-30T00:00:00Z'), scheduledFor: new Date(instant), title: 'Serviço',
  subtotalServices: 10, subtotalMaterials: 0, discountAmount: 0, totalAmount: 10,
  items: [{ type: 'SERVICE', description: 'Teste', quantity: 1, unit: 'UN', unitPrice: 10, totalPrice: 10 }],
};
const db = {
  workspaceVisualSettings: { findUnique: async ({where}) => { assert.equal(where.workspaceId,'ws'); return visualSettings; } },
  billingCharge: { findMany: async () => [] },
  workspace: {
    findUnique: async () => workspace,
    update: async ({ where, data }) => { assert.equal(where.id, 'ws'); return workspace = { ...workspace, ...data }; },
  },
  invoice: { findFirst: async () => source, findMany: async () => [] },
  quote: { findFirst: async () => source },
  serviceOrder: { findFirst: async () => source },
  documentTemplateSetting: { findUnique: async () => null },
  user: { findUnique: async () => null },
  fileObject: {
    findFirst: async ({ where }) => fileRows.find(f => f.id === where.id && f.workspaceId === where.workspaceId) || null,
    findUnique: async ({ where }) => fileRows.find(f => f.id === where.id) || null,
    create: async ({ data }) => { const f = { id: `file-${fileRows.length}`, ...data }; fileRows.push(f); return f; },
  },
  generatedDocument: {
    findFirst: async ({ where }) => {
      if (!where.id) return null;
      const doc = generatedRows.find(d => d.id === where.id && d.workspaceId === where.workspaceId);
      return doc ? { ...doc, fileObject: fileRows.find(f => f.id === doc.fileObjectId) } : null;
    },
    create: async ({ data, include }) => {
      const doc = { id: `doc-${generatedRows.length}`, ...data };
      if (include?.fileObject) doc.fileObject = fileRows.find(f => f.id === data.fileObjectId);
      generatedRows.push(doc);
      return doc;
    },
  },
  auditLog: { create: async ({ data }) => { auditRows.push(data); return data; } },
  webhookEndpoint: { findMany: async () => [] },
  contract: { findMany: async () => [] }, ticket: { findMany: async () => [] },
  $transaction: async fn => { if (transactionError) throw new Error('simulated DB failure'); return fn(db); },
};
const workers = new Map();
const rendered = [];
const pdfBytes = Buffer.from('%PDF-1.4 test stub');
const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === '@peanut/db') return { prisma: db, getInvoiceBankLink: realDb.getInvoiceBankLink, getPublishedDocumentIdentity: realDb.getPublishedDocumentIdentity };
  if (id === '@peanut/documents') return {
    ...documents, renderA4Document: params => { rendered.push(params); return documents.renderA4Document(params); },
  };
  if (id === 'bullmq') return {
    Queue: class { async add() {} async getRepeatableJobs() { return []; } },
    Worker: class { constructor(name, processor) { workers.set(name, processor); } on() {} },
  };
  if (id === 'playwright') return { chromium: { launch: async () => ({
    newPage: async () => ({ setContent: async () => {}, pdf: async () => pdfBytes }), close: async () => {},
  }) } };
  return originalLoad.call(this, id, ...args);
};
const { InvoicesService } = require('../apps/api/dist/invoices/invoices.service');
const { QuotesService } = require('../apps/api/dist/quotes/quotes.service');
const { ServiceOrdersService } = require('../apps/api/dist/service-orders/service-orders.service');
const { StorageService } = require('../apps/api/dist/storage/storage.service');
const { FilesController } = require('../apps/api/dist/files/files.controller');
const { DocumentsService } = require('../apps/api/dist/documents/documents.service');
const { SettingsService } = require('../apps/api/dist/settings/settings.service');
const { SettingsController } = require('../apps/api/dist/settings/settings.controller');
require('../apps/worker/dist/main');
Module._load = originalLoad;
const audit = { log: async () => {} };
const events = { emit: async () => {} };
const store = new LocalObjectStorage(temp);
const digest = body => createHash('sha256').update(body).digest('hex');
const bytes = async stream => { const chunks = []; for await (const chunk of stream) chunks.push(chunk); return Buffer.concat(chunks); };

test.after(async () => {
  global.Date = realDate;
  if (previousPath === undefined) delete process.env.STORAGE_PATH; else process.env.STORAGE_PATH = previousPath;
  assert.ok(temp.startsWith(path.join(os.tmpdir(), 'peanut-storage-test-')));
  await fsp.rm(temp, { recursive: true, force: true });
});

test('storage preserves bytes across instances and never overwrites an existing key', async () => {
  const body = Buffer.from([0, 255, 1, 128]);
  await store.put('legacy-bucket', 'workspace/old image.png', body);
  const otherProcess = new LocalObjectStorage(temp);
  assert.deepEqual(await bytes(await otherProcess.get('legacy-bucket', 'workspace/old image.png')), body);
  await assert.rejects(store.put('legacy-bucket', 'workspace/old image.png', Buffer.from('changed')), { code: 'EEXIST' });
  assert.deepEqual(await bytes(await store.get('legacy-bucket', 'workspace/old image.png')), body);
});

test('storage rejects traversal, absolute paths, Windows drive paths and symbolic links', async () => {
  for (const [bucket, key] of [['..', 'x'], ['bucket', '../secret'], ['bucket', '/secret'], ['bucket', 'C:/secret'], ['bucket', 'a\\secret']]) {
    await assert.rejects(store.get(bucket, key));
    await assert.rejects(store.put(bucket, key, Buffer.from('bad')));
  }
  await fsp.mkdir(path.join(temp, 'symlink-test'));
  await fsp.symlink(path.join(temp, 'symlink-test'), path.join(temp, 'linked-bucket'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(store.put('linked-bucket', 'escape', Buffer.from('bad')), /simbólicos/);
});

test('migration verifies source and destination, resumes and preserves old bucket references', async () => {
  const body = Buffer.from('historical PDF bytes');
  const file = { bucket: 'old-bucket', key: 'ws/invoices/old.pdf', sizeBytes: BigInt(body.length), sha256: digest(body) };
  let reads = 0;
  const sourceStore = { get: async () => { reads++; return Readable.from([body]); } };
  assert.equal(await transferFile(file, store, sourceStore), 'copied_and_verified');
  assert.equal(await transferFile(file, store, sourceStore), 'already_verified');
  assert.equal(reads, 1);
  await verifyFile(store, file);
  await assert.rejects(transferFile({ ...file, key: 'missing.pdf' }, store), /ausente/);
  await assert.rejects(transferFile({ ...file, key: 'corrupt.pdf', sha256: digest(Buffer.from('wrong')) }, store, sourceStore), /confere/);
  await assert.rejects(store.get(file.bucket, 'corrupt.pdf'), { code: 'ENOENT' });
  await assert.rejects(transferFile({ ...file, sha256: digest(Buffer.from('wrong')) }, store, sourceStore), /diferente/);
  assert.deepEqual(await bytes(await store.get(file.bucket, file.key)), body);
});

test('time zone conversion handles day boundaries, date-only values and DST', () => {
  assert.equal(dateKey(new Date(instant), 'America/Sao_Paulo'), '2026-10-26');
  assert.equal(dateKey(new Date(instant), 'Asia/Tokyo'), '2026-10-27');
  assert.equal(calendarDateKey(new Date('2026-10-30T00:00:00Z'), 'America/Sao_Paulo'), '2026-10-30');
  assert.equal(zonedDateTime('2026-10-26T22:30', 'America/Sao_Paulo').toISOString(), instant);
  assert.equal(zonedDateTime('2026-10-27T10:30', 'Asia/Tokyo').toISOString(), instant);
  assert.equal(zonedDateTime('2026-07-01T09:00', 'America/New_York').toISOString(), '2026-07-01T13:00:00.000Z');
  assert.throws(() => zonedDateTime('2026-03-08T02:30', 'America/New_York'), /inexistente/);
  assert.throws(() => zonedDateTime('2026-02-30T10:00', 'UTC'), /inválida/);
});

test('settings persist the selected zone, reject invalid zones and audit the workspace', async () => {
  const service = new SettingsService(audit, new StorageService());
  await assert.rejects(service.updateGeneralSettings('ws', { timeZone: 'bad/zone' }, 'admin'));
  await assert.rejects(service.updateGeneralSettings('ws', { timeZone: null }, 'admin'));
  await service.updateGeneralSettings('ws', { timeZone: 'Asia/Tokyo' }, 'admin');
  assert.equal((await service.getGeneralSettings('ws')).timeZone, 'Asia/Tokyo');
  assert.equal(auditRows.at(-1).action, 'workspace.timezone_updated');
  assert.equal(auditRows.at(-1).workspaceId, 'ws');
  const { Reflector } = apiRequire('@nestjs/core');
  const { RolesGuard } = require('../apps/api/dist/auth/roles.guard');
  const guard = new RolesGuard(new Reflector());
  for (const role of ['OWNER', 'ADMIN', 'TECHNICIAN', 'READ_ONLY', 'FINANCIAL']) {
    const allowed = guard.canActivate({ getHandler: () => SettingsController.prototype.updateGeneralSettings, getClass: () => SettingsController, switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) });
    assert.equal(allowed, ['OWNER', 'ADMIN'].includes(role));
  }
});

test('actual API previews and worker PDF inputs agree in three zones for all three document types', async () => {
  const previewers = [
    ['INVOICE', new InvoicesService(audit, events), 'getInvoicePreviewHtml'],
    ['QUOTE', new QuotesService(audit, events), 'getQuotePreviewHtml'],
    ['SERVICE_ORDER', new ServiceOrdersService(audit, events), 'getServiceOrderPreviewHtml'],
  ];
  for (const zone of ['America/Sao_Paulo', 'UTC', 'Asia/Tokyo']) {
    workspace = { ...workspace, timeZone: zone };
    for (const [type, service, method] of previewers) {
      const html = await service[method]('entity', 'ws');
      const preview = rendered.at(-1);
      await workers.get('pdf-generation')({ id: 'test', data: { workspaceId: 'ws', actorUserId: null, entityId: 'entity', entityType: type, documentType: type } });
      const pdf = rendered.at(-1);
      assert.equal(preview.timeZone, zone);
      assert.equal(pdf.timeZone, zone);
      assert.equal(preview.generatedAt, documents.formatDateTime(new Date(instant), 'pt-BR', zone));
      assert.equal(preview.generatedAt, pdf.generatedAt);
      assert.equal(preview.data.issueDate, pdf.data.issueDate);
      assert.equal(preview.data.dueDate, pdf.data.dueDate);
      assert.ok(html.includes(zone));
      if (type !== 'SERVICE_ORDER') assert.equal(preview.data.dueDate, '30/10/2026');
      else assert.equal(preview.data.dueDate, documents.formatDateTime(new Date(instant), 'pt-BR', zone));
      assert.equal(JSON.parse(generatedRows.at(-1).metadata).timeZone, zone);
      await verifyFile(store, fileRows.at(-1));
    }
  }
});

test('published visual identity is identical in API previews and worker PDF snapshots', async () => {
  const config=structuredClone(apiRequire('@peanut/validators').DEFAULT_VISUAL_CONFIG);
  config.name='Empresa Visual';config.font='source-sans-3';config.documents.logoWidth=280;
  visualSettings={published:config};
  try {
    for(const [type,service,method] of [['INVOICE',new InvoicesService(audit,events),'getInvoicePreviewHtml'],['QUOTE',new QuotesService(audit,events),'getQuotePreviewHtml'],['SERVICE_ORDER',new ServiceOrdersService(audit,events),'getServiceOrderPreviewHtml']]) {
      const html=await service[method]('entity','ws'),preview=rendered.at(-1);
      await workers.get('pdf-generation')({id:'visual-test',data:{workspaceId:'ws',actorUserId:null,entityId:'entity',entityType:type,documentType:type}});
      const worker=rendered.at(-1);
      assert.equal(preview.brand.publicName,'Empresa Visual');assert.equal(worker.brand.publicName,'Empresa Visual');
      assert.deepEqual(preview.brand.visual,worker.brand.visual);assert.equal(worker.brand.visual.logoWidth,280);
      assert.match(html,/data:font\/ttf;base64/);
    }
  } finally { visualSettings=null; }
});

test('image upload and authenticated proxy use the record bucket and isolate workspaces', async () => {
  const body = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
  const storage = new StorageService();
  const result = await storage.uploadImage({ workspaceId: 'ws', actorUserId: null, folder: 'logos', data: body.toString('base64'), mimeType: 'image/svg+xml', filename: 'logo.svg' });
  const controller = new FilesController(storage);
  let sent;
  const response = { header() { return this; }, send(stream) { sent = stream; } };
  await controller.serveFile(result.fileObjectId, { workspaceId: 'ws' }, response);
  assert.deepEqual(await bytes(sent), body);
  await assert.rejects(controller.serveFile(result.fileObjectId, { workspaceId: 'other' }, response), /Arquivo não encontrado/);
  // Legacy buckets must be honored, not replaced with a global default.
  const old = fileRows.find(f => f.id === result.fileObjectId);
  old.bucket = 'historic-images';
  await store.put(old.bucket, old.key, body);
  await controller.serveFile(old.id, { workspaceId: 'ws' }, response);
  assert.deepEqual(await bytes(sent), body);
});

test('worker cleans an uncommitted file on database failure without changing prior documents', async () => {
  const before = fileRows.length;
  const pathsBefore = fs.readdirSync(temp, { recursive: true }).sort();
  transactionError = true;
  try {
    await assert.rejects(workers.get('pdf-generation')({ id: 'failing', data: { workspaceId: 'ws', actorUserId: null, entityId: 'entity', entityType: 'INVOICE' } }), /registrar/);
  } finally { transactionError = false; }
  assert.equal(fileRows.length, before);
  assert.deepEqual(fs.readdirSync(temp, { recursive: true }).sort(), pathsBefore);
  for (const file of fileRows) await verifyFile(store, file);
});

test('manual documents round trip with financial permissions and workspace isolation', async () => {
  const service = new DocumentsService(audit);
  const body = Buffer.from('private manual PDF');
  const document = await service.uploadManualDocument({
    documentType: 'INVOICE', filename: 'original.pdf', mimeType: 'application/pdf',
    data: body.toString('base64'), visibility: 'PRIVATE', entityType: 'WORKSPACE', entityId: 'ws',
  }, 'ws', 'admin');
  const downloaded = await service.getFileStream(document.id, 'ws', 'FINANCIAL', 'admin', 'attachment');
  assert.deepEqual(await bytes(downloaded.stream), body);
  await assert.rejects(service.getFileStream(document.id, 'ws', 'READ_ONLY', 'reader', 'inline'), /permissão/);
  await assert.rejects(service.getFileStream(document.id, 'other', 'OWNER', 'admin', 'attachment'), /não encontrado/);
});

test('audit failure after committing an upload cannot erase the committed file', async () => {
  const service = new DocumentsService({ log: async () => { throw new Error('audit unavailable'); } });
  await assert.rejects(service.uploadManualDocument({
    documentType: 'REPORT', filename: 'kept.txt', mimeType: 'text/plain',
    data: Buffer.from('preserved').toString('base64'), visibility: 'PRIVATE', entityType: 'WORKSPACE', entityId: 'ws',
  }, 'ws', 'admin'), /audit unavailable/);
  await verifyFile(store, fileRows.at(-1));
  assert.equal(generatedRows.at(-1).fileObjectId, fileRows.at(-1).id);
});

test('alert scheduler reads per-workspace intervals and thresholds without environment overrides or duplicate claims', async () => {
  const old = { workspace: { ...db.workspace }, invoice: db.invoice.findMany, contract: db.contract.findMany, ticket: db.ticket.findMany };
  const settings = [
    { id: 'workspace-a', invoiceDueSoonOffsetHours: 12, contractEndingSoonDays: 7, ticketFeedbackAfterHours: 12, automationIntervalMinutes: 15, lastAutomationSweepAt: new Date(Date.now() - 20 * 60000) },
    { id: 'workspace-b', invoiceDueSoonOffsetHours: 24, contractEndingSoonDays: 10, ticketFeedbackAfterHours: 48, automationIntervalMinutes: 60, lastAutomationSweepAt: new Date(Date.now() - 20 * 60000) },
  ];
  const queries = [];
  db.workspace.findMany = async () => settings.map(row => ({ ...row }));
  db.workspace.updateMany = async ({ where, data }) => {
    const current = settings.find(row => row.id === where.id);
    if (current.lastAutomationSweepAt?.getTime() !== where.lastAutomationSweepAt?.getTime()) return { count: 0 };
    Object.assign(current, data); return { count: 1 };
  };
  for (const [kind, table] of [['invoice', db.invoice], ['contract', db.contract], ['ticket', db.ticket]]) {
    table.findMany = async query => { queries.push({ kind, ...query }); return []; };
  }
  try {
    await workers.get('billing-schedule')({ data: {} });
    assert.equal(queries.length, 3);
    assert.ok(queries.every(query => query.where.workspaceId === 'workspace-a'));
    assert.equal(queries.find(query => query.kind === 'ticket').where.resolvedAt.lte.getTime(), Date.now() - 12 * 3600000);
    await workers.get('billing-schedule')({ data: {} });
    assert.equal(queries.length, 3);
    settings[1].automationIntervalMinutes = 5;
    await workers.get('billing-schedule')({ data: {} });
    assert.equal(queries.length, 6);
    assert.ok(queries.slice(3).every(query => query.where.workspaceId === 'workspace-b'));
    assert.equal(queries.findLast(query => query.kind === 'ticket').where.resolvedAt.lte.getTime(), Date.now() - 48 * 3600000);
  } finally { db.workspace = old.workspace; db.invoice.findMany = old.invoice; db.contract.findMany = old.contract; db.ticket.findMany = old.ticket; }
});
