// Real browser + built Next.js, synthetic API only; all external requests are blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { createServer } = require('node:net');
const root = path.resolve(__dirname, '..');
const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
const { chromium } = createRequire(path.join(root, 'apps/worker/package.json'))('playwright');
const output = path.join(root, 'data/qa/settings');
async function main() {
  const temporary = createServer(); await new Promise(resolve => temporary.listen(0, '127.0.0.1', resolve));
  const port = temporary.address().port; await new Promise(resolve => temporary.close(resolve));
  const server = spawn(process.execPath, [webRequire.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: path.join(root, 'apps/web'), windowsHide: true, stdio: 'pipe' });
  let logs = ''; server.stdout.on('data', chunk => logs += chunk); server.stderr.on('data', chunk => logs += chunk);
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/login`)).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 200)); }
    if (!ready) throw new Error(logs);
    const executablePath = [chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('peanut_token', 'synthetic-test-token'));
    const user = { id: 'user', workspaceId: 'workspace', name: 'Admin QA', role: 'OWNER', timeZone: 'America/Sao_Paulo' };
    let smtp = { enabled: false, host: 'smtp.example.invalid', port: 587, security: 'STARTTLS', username: 'qa@example.invalid', fromEmail: 'billing@example.invalid', fromName: 'Demo', replyTo: '', hasPassword: true, revision: 1, lastTestAt: null, lastTestStatus: null, lastTestError: null };
    let operations = { invoiceDueSoonOffsetHours: 72, contractEndingSoonDays: 15, ticketFeedbackAfterHours: 24, automationIntervalMinutes: 60, webhookMaxAttempts: 5, webhookTimeoutMs: 10000, sessionDurationMinutes: 45 };
    const patches = []; let emailReads = 0;
    await context.route('**/*', async route => {
      const request = route.request(); const url = new URL(request.url());
      if (!url.pathname.includes('/api/v1/')) {
        if (url.hostname === '127.0.0.1' && url.port === String(port)) return route.continue();
        return route.abort();
      }
      const endpoint = url.pathname.split('/api/v1')[1], method = request.method();
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let result = {};
      if (endpoint === '/auth/me') result = user;
      else if (endpoint === '/auth/refresh') result = { user, accessToken: 'synthetic-test-token' };
      else if (endpoint === '/settings/general') result = { timeZone: user.timeZone };
      else if (endpoint === '/settings/email') {
        if (method === 'PATCH') {
          const body = request.postDataJSON(); patches.push(body);
          assert.equal('passwordEncrypted' in body, false);
          const { password, clearPassword, ...rest } = body;
          smtp = { ...smtp, ...rest, revision: smtp.revision + 1, hasPassword: clearPassword ? false : password ? true : smtp.hasPassword };
        } else emailReads++;
        result = smtp;
      } else if (endpoint === '/settings/email/test') result = { jobId: 'synthetic-job' };
      else if (endpoint === '/settings/email/test/synthetic-job') { smtp.lastTestAt = new Date().toISOString(); smtp.lastTestStatus = 'SUCCESS'; result = { state: 'completed', result: { status: 'SUCCESS', message: 'Conexão e autenticação verificadas. Nenhum email foi enviado.' } }; }
      else if (endpoint === '/settings/operations') { if (method === 'PATCH') operations = request.postDataJSON(); result = operations; }
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(result) });
    });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/dashboard/configuracoes`);
    await page.getByRole('button', { name: 'INTEGRAÇÕES', exact: true }).click();
    await page.getByLabel('Servidor SMTP', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Nova senha SMTP').inputValue(), '');
    await page.getByLabel('Nome do remetente', { exact: true }).fill('Company QA');
    assert.equal(await page.getByRole('button', { name: 'Testar conexão salva' }).isDisabled(), true);
    await page.getByRole('button', { name: 'Salvar SMTP', exact: true }).click();
    await page.getByText('Configuração SMTP salva.', { exact: true }).waitFor();
    assert.equal('password' in patches[0], false);
    await page.getByLabel('Nova senha SMTP').fill('synthetic-test-password');
    await page.getByRole('button', { name: 'Salvar SMTP', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('input[autocomplete="new-password"]').value === '');
    assert.equal(patches[1].password, 'synthetic-test-password');
    await page.getByRole('button', { name: 'Testar conexão salva' }).click();
    await page.getByText('Conexão e autenticação verificadas. Nenhum email foi enviado.', { exact: true }).waitFor();
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'smtp-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: path.join(output, 'smtp-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'OPERAÇÃO', exact: true }).click();
    await page.getByLabel('Duração da sessão (minutos)', { exact: true }).fill('90');
    await page.getByRole('button', { name: 'Salvar operação' }).click();
    await page.getByText('Configurações de operação salvas.', { exact: true }).waitFor();
    assert.equal(operations.sessionDurationMinutes, 90);
    user.role = 'TECHNICIAN'; const before = emailReads; await page.reload();
    await page.getByRole('button', { name: 'INTEGRAÇÕES', exact: true }).click();
    await page.getByText('Apenas administradores podem configurar o SMTP.').waitFor();
    assert.equal(emailReads, before); assert.equal(await page.getByLabel('Servidor SMTP', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('Settings UI passed: password preservation/replacement, test without email, operation persistence, roles and responsive layout.');
  } finally { if (browser) await browser.close(); server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
