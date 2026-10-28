// Browser regression against the built frontend with synthetic API responses.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { createServer } = require('node:net');
const root = path.resolve(__dirname, '..');
const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
const { chromium } = createRequire(path.join(root, 'apps/worker/package.json'))('playwright');
const { recurringBaseItems, recurringAddonItems, invoiceAmounts } = require('../packages/db/dist');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const contract = { id: id(3), workspaceId: id(1), clientId: id(2), title: 'Suporte mensal de demonstração', number: 'CTR-DEMO', status: 'ACTIVE', type: 'RECURRING_SUPPORT', startDate: '2026-01-01T00:00:00Z', endDate: null, monthlyAmountCents: 170031, currency: 'BRL', billingDay: 8, billingIssueDay: 8, billingIssueTime: '09:00', billingAutoIssue: true, billingAutoEmail: true, billingEmailRecipients: ['finance@example.invalid', 'director@example.invalid'], billingWhatsappNumbers: [], billingPaymentMethod: 'PIX', billingPixKey: 'demo-pix', client: { id: id(2), legalName: 'Cliente Demonstração', tradeName: 'Cliente Demonstração' }, lineItems: [{ id: id(10), description: 'Licença complementar', itemType: 'LICENSE', quantity: '1', unitPriceCents: 10000, totalPriceCents: 10000, recurring: true, billingRole: 'BASE' }], billingScheduleEvents: [], history: [], maxUsers: null, maxAssets: null };
const event = { id: id(5), contractId: contract.id, periodKey: '2026-10', scheduledFor: '2026-10-28T12:00:00Z', status: 'DRAFT_READY', invoiceId: id(6), amountCents: 170031, approvedAt: null, emailStatus: 'NOT_REQUESTED', emailRecipients: contract.billingEmailRecipients, emailLastError: null };
const invoice = { id: id(6), workspaceId: id(1), contractId: contract.id, clientId: contract.clientId, client: contract.client, number: 'FAT-DEMO-202610', status: 'DRAFT', issueDate: event.scheduledFor, dueDate: '2026-11-08T00:00:00Z', paymentMethod: 'PIX', pixKey: 'demo-pix', totalAmount: '1700.31', subtotalServices: '1700.31', subtotalMaterials: '0', subtotalMaterialCost: '0', netAmount: '1700.31', discountAmount: '0', observations: 'Competência 2026-10', items: [{ id: id(7), type: 'SERVICE', description: 'Suporte mensal contratado', billingKind: 'BASE', quantity: '1', unit: 'MÊS', unitPrice: '1700.31', totalPrice: '1700.31', unitCost: '0' }] };
const user = { id: id(4), workspaceId: id(1), name: 'Usuário de demonstração', email: 'owner@example.invalid', role: 'OWNER', timeZone: 'America/Sao_Paulo' };
const output = path.join(root, 'data/qa/contract-billing');
const invoiceResponse = () => ({ ...invoice, billingScheduleEvent: { ...event, contract: { number: contract.number, billingAutoIssue: true, billingAutoEmail: true, billingWhatsappNumbers: [] } } });
async function main() {
  const temporary = createServer();
  await new Promise(resolve => temporary.listen(0, '127.0.0.1', resolve));
  const port = temporary.address().port;
  await new Promise(resolve => temporary.close(resolve));
  const server = spawn(process.execPath, [webRequire.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: path.join(root, 'apps/web'), windowsHide: true, stdio: 'pipe' });
  let logs = '';
  server.stdout.on('data', chunk => { logs += chunk; }); server.stderr.on('data', chunk => { logs += chunk; });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/login`)).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error(`Frontend did not start: ${logs}`);
    const executablePath = [chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(file => fs.existsSync(file));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Tokyo' });
    await context.addInitScript(() => localStorage.setItem('peanut_token', 'synthetic-test-token'));
    await context.route('**/*', async route => {
      const request = route.request(); const url = new URL(request.url());
      if (!url.pathname.includes('/api/v1/')) {
        if (url.hostname === '127.0.0.1' && url.port === String(port)) return route.continue();
        return route.abort();
      }
      const endpoint = url.pathname.split('/api/v1')[1]; const method = request.method();
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let result = {};
      if (endpoint === '/auth/me') result = user;
      else if (endpoint === '/auth/refresh') result = { user, accessToken: 'synthetic-test-token' };
      else if (endpoint.startsWith(`/contracts/${contract.id}/line-items`)) {
        const input = request.postDataJSON();
        if (method === 'POST') { result = { id: id(11), ...input, totalPriceCents: Math.round(input.quantity * input.unitPriceCents) }; contract.lineItems.push(result); }
        else { result = contract.lineItems.find(row => row.id === endpoint.split('/').at(-1)); Object.assign(result, input, { totalPriceCents: Math.round(input.quantity * input.unitPriceCents) }); }
      }
      else if (endpoint === `/contracts/${contract.id}/periods`) {
        const agreement = { ...contract, startDate: new Date(contract.startDate), endDate: null, lineItems: contract.lineItems.map(row => ({ ...row, startsOn: row.startsOn ? new Date(row.startsOn) : null, endsOn: row.endsOn ? new Date(row.endsOn) : null })) };
        const amounts = invoiceAmounts([...recurringBaseItems(agreement), ...recurringAddonItems(agreement, '2026-10', user.timeZone)]);
        invoice.items = amounts.rows.map((row, index) => JSON.parse(JSON.stringify({ id: id(200 + index), ...row })));
        invoice.totalAmount = String(amounts.totals.totalAmount); invoice.subtotalServices = invoice.totalAmount; event.amountCents = Math.round(Number(invoice.totalAmount) * 100);
 contract.billingScheduleEvents = [{ ...event, invoice: { id: invoice.id, number: invoice.number, dueDate: invoice.dueDate } }]; result = event; }
      else if (endpoint === `/contracts/${contract.id}`) {
        if (method === 'PATCH') Object.assign(contract, request.postDataJSON());
        result = contract;
      } else if (endpoint === `/invoices/${invoice.id}/approve-monthly`) { event.approvedAt = new Date().toISOString(); result = event; }
      else if (endpoint === `/invoices/${invoice.id}`) {
        if (method === 'PATCH') {
          const input = request.postDataJSON();
          if (input.items) {
            const incoming = input.items.map(item => ({ ...item, ...(item.billingKind === 'RECURRING' ? { recurrenceSnapshot: invoice.items.find(row => row.sourceContractLineItemId === item.sourceContractLineItemId)?.recurrenceSnapshot } : {}) }));
            const calculated = invoiceAmounts(incoming);
            invoice.items = calculated.rows.map((item, index) => JSON.parse(JSON.stringify({ id: id(100 + index), ...item })));
            invoice.totalAmount = String(calculated.totals.totalAmount);
            invoice.subtotalServices = invoice.totalAmount; event.amountCents = Math.round(Number(invoice.totalAmount) * 100);
          }
          event.approvedAt = null;
        }
        result = invoiceResponse();
      } else if (endpoint.startsWith('/contracts-quota/')) result = { hasActiveContract: true, maxUsers: null, maxAssets: null };
      else if (endpoint.startsWith('/tickets') || endpoint.startsWith('/service-orders') || endpoint.startsWith('/audit-logs')) result = { data: [], meta: { total: 0 } };
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(result) });
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/dashboard/contracts/${contract.id}`);
    await page.getByRole('button', { name: 'Itens', exact: true }).click();
    await page.getByRole('button', { name: 'Editar Licença complementar', exact: true }).click();
    await page.getByLabel('Classificação da cobrança', { exact: true }).selectOption('ADDON');
    await page.getByLabel('Início do adicional', { exact: true }).fill('2026-10-16');
    await page.getByLabel('Término do adicional', { exact: true }).selectOption('DATE');
    await page.getByLabel('Data final do adicional', { exact: true }).fill('2026-11-15');
    await page.getByLabel('Cobrança no início e término', { exact: true }).selectOption('DAILY');
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'recurring-item-proration.png'), fullPage: true });
    await page.getByRole('button', { name: 'Salvar alterações do item', exact: true }).click();
    await page.getByText('Proporcional por dia', { exact: true }).waitFor();
    assert.equal(contract.lineItems[0].id, id(10)); assert.equal(contract.lineItems[0].billingRole, 'ADDON');
    assert.equal(contract.monthlyAmountCents, 170031);
    await page.getByLabel('Descrição do item', { exact: true }).fill('Serviço futuro sem rateio');
    await page.getByLabel('Valor unitário mensal (R$)', { exact: true }).fill('50');
    await page.getByLabel('Início do adicional', { exact: true }).fill('2026-12-01');
    await page.getByLabel('Término do adicional', { exact: true }).selectOption('OPEN');
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
    await page.getByRole('button', { name: 'Editar Serviço futuro sem rateio', exact: true }).waitFor();
    assert.equal(contract.lineItems[1].proration, 'NONE'); assert.equal(contract.lineItems[1].endsOn, null);
    fs.mkdirSync(output, { recursive: true });
    await page.getByRole('button', { name: 'Editar Serviço futuro sem rateio', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'recurring-items-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(output, 'recurring-items-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Recorrência', exact: true }).click();
    await page.getByLabel('Mensalidade fixa (R$)', { exact: true }).waitFor();
    await page.locator('input[value="1700.31"]').waitFor();
    assert.equal(await page.getByLabel('Mensalidade fixa (R$)', { exact: true }).inputValue(), '1700.31');
    await page.getByLabel('Competência', { exact: true }).fill('2026-10');
    await page.getByRole('button', { name: 'Preparar cobrança do mês' }).click();
    assert.equal(invoice.totalAmount, '1751.92');
    assert.equal(invoice.items[1].recurrenceSnapshot.days, 16);
    await page.getByRole('link', { name: invoice.number, exact: true }).waitFor();
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'contract-desktop.png'), fullPage: true });
    await page.getByRole('link', { name: invoice.number, exact: true }).click();
    await page.getByRole('heading', { name: 'Cobrança mensal · 2026-10' }).waitFor();
    await page.locator('input[value="2026-10-28T09:00"]').waitFor();
    assert.equal(await page.getByLabel('Emissão/envio (America/Sao_Paulo)', { exact: true }).inputValue(), '2026-10-28T09:00');
    await page.getByRole('button', { name: 'Itens', exact: true }).click();
    await page.getByRole('button', { name: /Editar itens/ }).click();
    assert.equal(await page.getByLabel('Descrição', { exact: true }).first().isDisabled(), true);
    assert.equal(await page.getByLabel('Descrição', { exact: true }).nth(1).isDisabled(), true);
    await page.getByRole('button', { name: /Adicionar item/ }).click();
    await page.getByLabel('Descrição', { exact: true }).nth(2).fill('Retirada e devolução de nobreak');
    await page.getByLabel('Unit. (R$)', { exact: true }).nth(2).fill('125.50');
    assert.equal(await page.getByLabel('Chamado relacionado (opcional)', { exact: true }).inputValue(), '');
    await page.getByRole('button', { name: 'Salvar itens', exact: true }).click();
    await page.getByRole('button', { name: /Editar itens/ }).waitFor();
    assert.equal(invoice.totalAmount, '1877.42');
    assert.equal(contract.monthlyAmountCents, 170031);
    await page.getByRole('button', { name: 'Conferir e agendar', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('Conferir e agendar') && button.disabled));
    await page.screenshot({ path: path.join(output, 'invoice-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'invoice-mobile.png'), fullPage: true });
    user.role = 'TECHNICIAN'; await page.reload();
    await page.getByRole('heading', { name: /Fatura/ }).first().waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Cobrança mensal · 2026-10' }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('UI passed: recurring item conversion, dates, per-item proration, open end, monthly snapshot, isolated extras, approval, time zone, restricted role and mobile screenshots.');
  } finally { if (browser) await browser.close(); server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
