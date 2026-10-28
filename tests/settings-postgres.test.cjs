const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const path = require('node:path');
const apiRequire = createRequire(path.resolve('apps/api/package.json'));
apiRequire('reflect-metadata');
const { PrismaClient, prisma, saveWorkspaceEmailSettings, publicEmailSettings, loadWorkspaceSmtpConfig } = require('../packages/db/dist');
const { SettingsService } = require('../apps/api/dist/settings/settings.service');
const { SettingsController } = require('../apps/api/dist/settings/settings.controller');
const { RolesGuard } = require('../apps/api/dist/auth/roles.guard');
const { AuthService } = require('../apps/api/dist/auth/auth.service');
const { testWorkspaceEmailConnection, createWorkspaceMailTransport } = require('../apps/worker/dist/email-settings');
const { workspaceEmailSettingsSchema } = apiRequire('@peanut/validators');
const url = process.env.CONTRACT_BILLING_TEST_DATABASE_URL;
if (!url) test('settings integration requires isolated QA database', { skip: true }, () => {});
else {
  const target = new URL(url);
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname));
  assert.equal(target.pathname, '/peanut_contract_billing_qa');
  const db = new PrismaClient({ datasources: { db: { url } } });
  const workspaces = [];
  const keyBefore = process.env.APP_ENCRYPTION_KEY;
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  const service = new SettingsService({}, {});
  const input = revision => ({ enabled: true, host: 'smtp.example.invalid', port: 587, security: 'STARTTLS', username: 'test@example.invalid', password: ' synthetic password with spaces ', fromEmail: 'billing@example.invalid', fromName: 'QA Company', replyTo: '', revision });
  async function fixture() {
    const ws = await db.workspace.create({ data: { name: 'Synthetic settings QA', slug: randomUUID() } });
    workspaces.push(ws.id);
    const user = await db.user.create({ data: { workspaceId: ws.id, name: 'QA Admin', email: `${randomUUID()}@example.invalid`, passwordHash: 'test-only', role: 'ADMIN' } });
    return { ws, user };
  }
  test.after(async () => {
    await db.workspace.deleteMany({ where: { id: { in: workspaces } } }); await db.$disconnect(); await prisma.$disconnect();
    if (keyBefore === undefined) delete process.env.APP_ENCRYPTION_KEY; else process.env.APP_ENCRYPTION_KEY = keyBefore;
  });
  test('SMTP is encrypted, tenant-scoped and omitted from public responses and audit records', async () => {
    const { ws, user } = await fixture(); const other = await fixture();
    const saved = await saveWorkspaceEmailSettings(db, ws.id, input(0), user.id);
    assert.equal(saved.hasPassword, true);
    assert.equal('password' in saved, false); assert.equal('passwordEncrypted' in saved, false);
    const row = await db.workspaceEmailSettings.findUniqueOrThrow({ where: { workspaceId: ws.id } });
    assert.match(row.passwordEncrypted, /^v1:gcm:/);
    assert.ok(!row.passwordEncrypted.includes(input(0).password));
    assert.equal((await loadWorkspaceSmtpConfig(db, ws.id)).password, input(0).password);
    assert.equal(await loadWorkspaceSmtpConfig(db, other.ws.id), null);
    const audit = await db.auditLog.findMany({ where: { workspaceId: ws.id } });
    assert.ok(!JSON.stringify(audit).includes(input(0).password));
    assert.ok(!JSON.stringify(audit).includes(row.passwordEncrypted));
    assert.equal((await service.getEmailSettings(ws.id)).hasPassword, true);
  });
  test('blank password preserves, replacement rotates and stale writers cannot overwrite credentials', async () => {
    const { ws, user } = await fixture();
    await saveWorkspaceEmailSettings(db, ws.id, input(0), user.id);
    const before = await db.workspaceEmailSettings.findUniqueOrThrow({ where: { workspaceId: ws.id } });
    await saveWorkspaceEmailSettings(db, ws.id, { ...input(1), password: '' }, user.id);
    assert.equal((await db.workspaceEmailSettings.findUniqueOrThrow({ where: { workspaceId: ws.id } })).passwordEncrypted, before.passwordEncrypted);
    await assert.rejects(saveWorkspaceEmailSettings(db, ws.id, { ...input(1), password: 'wrong stale password' }, user.id), /outra pessoa/);
    await saveWorkspaceEmailSettings(db, ws.id, { ...input(2), password: 'replacement' }, user.id);
    assert.equal((await loadWorkspaceSmtpConfig(db, ws.id)).password, 'replacement');
    await saveWorkspaceEmailSettings(db, ws.id, { ...input(3), enabled: false, password: '', clearPassword: true }, user.id);
    assert.equal(publicEmailSettings(await db.workspaceEmailSettings.findUnique({ where: { workspaceId: ws.id } })).hasPassword, false);
    assert.equal(await loadWorkspaceSmtpConfig(db, ws.id), null);
  });
  test('invalid TLS, injected headers and HTTP ciphertext are rejected; missing master key fails closed', async () => {
    for (const bad of [{ security: 'NONE' }, { fromName: 'Name\r\nBcc: malicious@example.invalid' }, { host: 'smtp://host/path' }, { passwordEncrypted: 'raw' }]) {
      assert.equal(workspaceEmailSettingsSchema.safeParse({ ...input(0), ...bad }).success, false);
    }
    const { ws, user } = await fixture(); const key = process.env.APP_ENCRYPTION_KEY;
    process.env.APP_ENCRYPTION_KEY = 'invalid';
    try { await assert.rejects(saveWorkspaceEmailSettings(db, ws.id, input(0), user.id), /chave mestra/); }
    finally { process.env.APP_ENCRYPTION_KEY = key; }
    assert.equal(await db.workspaceEmailSettings.count({ where: { workspaceId: ws.id } }), 0);
  });
  test('connection test only verifies, sanitizes errors, closes transport and discards stale results', async () => {
    const { ws, user } = await fixture();
    await saveWorkspaceEmailSettings(db, ws.id, input(0), user.id);
    let sends = 0, closed = 0, verifies = 0;
    const factory = () => ({ verify: async () => { verifies++; }, close: () => closed++, sendMail: async () => sends++ });
    assert.equal((await testWorkspaceEmailConnection(ws.id, 1, db, factory)).status, 'SUCCESS');
    assert.equal(verifies, 1); assert.equal(closed, 1); assert.equal(sends, 0);
    const failed = await testWorkspaceEmailConnection(ws.id, 1, db, () => ({ verify: async () => { throw new Error(input(0).password); }, close: () => {} }));
    assert.equal(failed.status, 'FAILED'); assert.ok(!JSON.stringify(failed).includes(input(0).password));
    assert.equal((await testWorkspaceEmailConnection(ws.id, 0, db, factory)).status, 'STALE');
    const transport = createWorkspaceMailTransport(await loadWorkspaceSmtpConfig(db, ws.id));
    assert.equal(transport.options.requireTLS, true); assert.equal(transport.options.secure, false); transport.close();
  });
  test('settings endpoints enforce administrator roles and ignore caller-supplied workspace selection', async () => {
    const reflector = new (apiRequire('@nestjs/core').Reflector)(); const guard = new RolesGuard(reflector);
    for (const method of ['getEmail', 'updateEmail', 'testEmail', 'emailTest', 'getOperations', 'updateOperations']) {
      for (const role of ['OWNER', 'ADMIN', 'TECHNICIAN', 'FINANCIAL', 'READ_ONLY']) {
        const context = { getHandler: () => SettingsController.prototype[method], getClass: () => SettingsController, switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) };
        assert.equal(guard.canActivate(context), ['OWNER', 'ADMIN'].includes(role));
      }
    }
    const controller = new SettingsController({ updateEmailSettings: (...args) => args });
    const forwarded = controller.updateEmail({ workspaceId: 'session-workspace', id: 'session-user' }, { workspaceId: 'injected-workspace' });
    assert.equal(forwarded[0], 'session-workspace');
    assert.equal(workspaceEmailSettingsSchema.safeParse({ ...input(0), workspaceId: randomUUID() }).success, false);
  });
  test('operational settings persist with audit and token expiry follows database, not legacy env', async () => {
    const { ws, user } = await fixture(); const before = await service.getOperationSettings(ws.id);
    await service.updateOperationSettings(ws.id, { ...before, sessionDurationMinutes: 90, automationIntervalMinutes: 15, webhookMaxAttempts: 3, webhookTimeoutMs: 12000 }, user.id);
    assert.equal((await service.getOperationSettings(ws.id)).webhookMaxAttempts, 3);
    await assert.rejects(service.updateOperationSettings(ws.id, { ...before, sessionDurationMinutes: 0 }, user.id));
    const old = process.env.JWT_EXPIRES_IN; process.env.JWT_EXPIRES_IN = '1s';
    try {
      const token = await new AuthService({}).refreshToken(user.id);
      const claims = apiRequire('jsonwebtoken').decode(token.accessToken);
      assert.equal(claims.exp - claims.iat, 90 * 60);
    } finally { if (old === undefined) delete process.env.JWT_EXPIRES_IN; else process.env.JWT_EXPIRES_IN = old; }
  });

  test('legacy importer dry-run preserves the database; import encrypts credentials and leaves SMTP disabled', async () => {
    const fs = require('node:fs'); const os = require('node:os'); const { spawnSync } = require('node:child_process');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'peanut-settings-qa-'));
    const file = path.join(directory, 'legacy.env');
    const { ws } = await fixture();
    fs.writeFileSync(file, 'SMTP_HOST=smtp.example.invalid\nSMTP_PORT=587\nSMTP_USER=test@example.invalid\nSMTP_PASS=synthetic-import-password\nSMTP_FROM="QA Billing <billing@example.invalid>"\nJWT_EXPIRES_IN=2h\nWEBHOOK_MAX_ATTEMPTS=3\n');
    const args = ['apps/api/scripts/import-env-settings.cjs', `--workspace=${ws.id}`, `--file=${file}`];
    const run = extra => spawnSync(process.execPath, [...args, ...extra], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', windowsHide: true });
    try {
      const dry = run([]); assert.equal(dry.status, 0, dry.stderr);
      assert.equal(await db.workspaceEmailSettings.count({ where: { workspaceId: ws.id } }), 0);
      const applied = run(['--apply']); assert.equal(applied.status, 0, applied.stderr);
      assert.ok(!applied.stdout.includes('synthetic-import-password'));
      const row = await db.workspaceEmailSettings.findUniqueOrThrow({ where: { workspaceId: ws.id } });
      assert.equal(row.enabled, false); assert.match(row.passwordEncrypted, /^v1:gcm:/);
      assert.equal((await loadWorkspaceSmtpConfig(db, ws.id, true)).password, 'synthetic-import-password');
      assert.equal((await service.getOperationSettings(ws.id)).sessionDurationMinutes, 120);
      assert.equal(run(['--apply']).status, 1);
      assert.equal(fs.readFileSync(file, 'utf8').includes('synthetic-import-password'), true);
    } finally { fs.rmSync(file); fs.rmdirSync(directory); }
  });

  test('SMTP test job payloads omit credentials and job results cannot cross workspace boundaries', async () => {
    const { ws, user } = await fixture(); await saveWorkspaceEmailSettings(db, ws.id, input(0), user.id);
    const isolatedService = new SettingsService({}, {}); let queued;
    isolatedService.emailTests = {
      add: async (_name, data) => { queued = data; return { id: 'qa-job' }; },
      getJob: async () => ({ data: { workspaceId: ws.id }, getState: async () => 'completed', returnvalue: { status: 'SUCCESS' } }),
    };
    await isolatedService.testEmailConnection(ws.id);
    assert.deepEqual(queued, { workspaceId: ws.id, revision: 1 });
    await assert.rejects(isolatedService.getEmailTest(randomUUID(), 'qa-job'), /não encontrado/);
    assert.equal((await isolatedService.getEmailTest(ws.id, 'qa-job')).result.status, 'SUCCESS');
  });
}
