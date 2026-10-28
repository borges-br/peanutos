// Disposable PostgreSQL container, tmpfs only, loopback only. No application DB is used.
const { execFileSync, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const name = `peanut-contract-billing-qa-${randomUUID().slice(0, 8)}`;
const password = randomUUID();
let container;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true }).trim();
try {
  container = docker(['run', '-d', '--rm', '--name', name, '--label', 'peanut.qa=contract-billing', '--memory', '512m', '--tmpfs', '/var/lib/postgresql/data:rw', '-p', '127.0.0.1::5432', '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_DB=peanut_contract_billing_qa', 'postgres:16-alpine']);
  if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Unexpected test container identity.');
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres', '-d', 'peanut_contract_billing_qa'], { windowsHide: true });
    if (result.status === 0) { ready = true; break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (!ready) throw new Error('Temporary PostgreSQL did not start.');
  const port = docker(['port', container, '5432/tcp']).match(/127\.0\.0\.1:(\d+)/)?.[1];
  if (!port) throw new Error('Test database is not bound to loopback.');
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/peanut_contract_billing_qa?schema=public`;
  const env = { ...process.env, DATABASE_URL: url, CONTRACT_BILLING_TEST_DATABASE_URL: url };
  const cli = createRequire(path.join(root, 'packages/db/package.json')).resolve('prisma/build/index.js');
  const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy', '--schema', path.join(root, 'packages/db/prisma/schema.prisma')], { cwd: root, env, stdio: 'inherit', windowsHide: true });
  if (migration.status !== 0) throw new Error('Migrations failed in the test database.');
  const result = spawnSync(process.execPath, ['--test', 'tests/contract-billing-postgres.test.cjs', 'tests/settings-postgres.test.cjs', 'tests/financial-postgres.test.cjs'], { cwd: root, env, stdio: 'inherit', windowsHide: true });
  process.exitCode = result.status === 0 ? 0 : 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (container && /^[a-f0-9]{64}$/.test(container)) {
    const label = docker(['inspect', '--format', '{{ index .Config.Labels "peanut.qa" }}', container]);
    if (label === 'contract-billing') docker(['rm', '-f', container]);
  }
}
