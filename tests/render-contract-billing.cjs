// Synthetic visual fixtures for the shared renderer. Does not read client data.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { renderA4Document } = require('../packages/documents/dist');
const { chromium } = createRequire(path.resolve(__dirname, '../apps/worker/package.json'))('playwright');
const output = path.resolve(__dirname, '../data/qa/contract-billing');
const money = number => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
const makeItem = (description, price, billingKind) => ({ type: 'SERVICE', description, quantity: '1', unit: 'UN', unitPrice: money(price), totalPrice: money(price), billingKind });
const seed = {
  documentType: 'INVOICE', timeZone: 'America/Sao_Paulo', generatedAt: '27/10/2026, 09:00:00', locale: 'pt-BR',
  brand: { publicName: 'Empresa Demonstração', brandSubtitle: 'Serviços de TI', legalName: 'Empresa Demonstração Ltda.', taxId: '00000000000000', email: 'contato@example.invalid', phone: '15000000000', address: 'Endereço fictício para teste', footerText: 'Exemplo fictício para validação de layout' },
  client: { tradeName: 'Cliente Demonstração', legalName: 'Cliente Demonstração Ltda.', document: '00000000000000', email: 'financeiro@example.invalid' }, responsible: null,
  templateSettings: { documentType: 'INVOICE', templateKey: 'standard', layoutVariant: 'default', enabledBlocks: Object.fromEntries(['header', 'logo', 'companyInfo', 'clientInfo', 'documentTitle', 'itemsTable', 'financialSummary', 'paymentInfo', 'footer'].map(key => [key, true])), blockOrder: ['header', 'logo', 'companyInfo', 'clientInfo', 'documentTitle', 'itemsTable', 'financialSummary', 'paymentInfo', 'footer'], settings: {} },
};
async function main() {
  const executablePath = [chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  fs.mkdirSync(output, { recursive: true });
  try {
    const short = [makeItem('Mensalidade de suporte e manutenção', 1700.31, 'BASE'), makeItem('Automação complementar', 349, 'EXTRA'), makeItem('Manutenção adicional de servidor A', 599, 'EXTRA'), makeItem('Manutenção adicional de servidor B', 399, 'EXTRA'), makeItem('Apoio técnico complementar', 139, 'EXTRA'), makeItem('Retirada e devolução de nobreak para conserto', 125.50, 'EXTRA')];
    for (const [name, items] of [['monthly-short', short], ['monthly-long', [short[0], ...Array.from({ length: 80 }, (_, index) => makeItem(`Serviço adicional ${index + 1} - descrição detalhada para validar múltiplas páginas e quebra da tabela`, 25.50, 'EXTRA'))]]]) {
      const total = name === 'monthly-short' ? 3311.81 : 1700.31 + 80 * 25.50;
      const html = renderA4Document({ ...seed, data: { number: 'FAT-DEMO-202610', status: 'ISSUED', issueDate: '27/10/2026', dueDate: '05/11/2026', billingPeriod: '2026-10', contractNumber: 'CTR-DEMO', paymentMethod: 'PIX', pixKey: 'chave-ficticia@example.invalid', items, totalAmount: money(total), subtotalServices: money(total), subtotalMaterials: money(0) } });
      fs.writeFileSync(path.join(output, `${name}.html`), html);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.pdf({ path: path.join(output, `${name}.pdf`), format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      await page.close();
    }
    console.log('Synthetic PDF fixtures rendered in data/qa/contract-billing.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
