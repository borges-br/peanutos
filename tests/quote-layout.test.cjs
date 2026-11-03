// Build documents first. Real Chromium/PDF, synthetic quote data only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('apps/worker/package.json'))('playwright');
const { renderA4Document, prepareDocumentPage } = require('../packages/documents/dist');
const { seed, item, money } = require('./fixtures/invoice-layout.cjs');
const output = path.resolve('data/qa/quote-pagination');
let browser;

test.before(async () => {
  const executablePath = [chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  fs.mkdirSync(output, { recursive: true });
});
test.after(async () => { await browser?.close(); });

function quote() {
  const data = structuredClone(seed);
  data.documentType = data.templateSettings.documentType = 'QUOTE';
  delete data.data.billingPeriod;
  delete data.data.contractNumber;
  data.data.number = 'ORC-DEMO-202611';
  data.data.title = 'Proposta Comercial';
  data.data.status = 'SENT';
  data.data.items = [item('Contratação e estruturação inicial'), item('Entrega para testes e validação'), item('Implantação e treinamento inicial')];
  data.data.items.forEach(item => { delete item.billingKind; });
  data.data.totalAmount = data.data.subtotalServices = money(3 * 125.5);
  data.templateSettings.enabledBlocks.paymentInfo = false;
  data.templateSettings.enabledBlocks.terms = true;
  // A saved order can place the footer before terms. It must still end the PDF.
  data.templateSettings.blockOrder.push('terms', 'observations');
  data.templateSettings.blockOrder = [...new Set(data.templateSettings.blockOrder)];
  data.brand.footerText = data.brand.visual.footer = 'Documento Oficial.';
  data.data.terms = Array.from({ length: 19 }, (_, i) =>
    `${i + 1}. Condição comercial de demonstração: configuração dos serviços conforme os requisitos acordados, acompanhamento das atividades e validação das entregas com a equipe contratante. Encerramento da cláusula ${i + 1}.`
  ).join('\n');
  data.data.observations = 'Observação final: proposta demonstrativa para conferir todas as condições comerciais e o encerramento do documento.';
  return data;
}

async function render(name, data) {
  const page = await browser.newPage();
  await page.route('**/*', route => route.request().url().startsWith('data:') ? route.continue() : route.abort());
  const result = await prepareDocumentPage(page, renderA4Document(data));
  assert(result && !result.overflow);
  const geometry = await page.evaluate(() => Array.from(document.querySelectorAll('.invoice-page'), sheet => {
    const rect = sheet.getBoundingClientRect(), style = getComputedStyle(sheet);
    const left = rect.left + parseFloat(style.paddingLeft), right = rect.right - parseFloat(style.paddingRight);
    const bottom = rect.bottom - parseFloat(style.paddingBottom);
    const body = sheet.querySelector('.invoice-page-body').getBoundingClientRect();
    const footer = sheet.querySelector('.invoice-page-footer').getBoundingClientRect();
    const outside = [];
    const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const box of range.getClientRects()) {
        if (box.left < left - 1 || box.right > right + 1 || box.bottom > bottom + 1)
          outside.push(node.textContent.slice(0, 80));
      }
    }
    return { bodyBottom: body.bottom, footerTop: footer.top, footerBottom: footer.bottom, bottom, outside };
  }));
  for (const bounds of geometry) {
    assert(bounds.bodyBottom <= bounds.footerTop + 1, JSON.stringify(bounds));
    assert(Math.abs(bounds.footerBottom - bounds.bottom) < 1, JSON.stringify(bounds));
    assert.deepEqual(bounds.outside, []);
  }
  assert.equal(await page.locator('.invoice-page').count(), result.pages);
  const footerCount = data.templateSettings.enabledBlocks.footer ? 1 : 0;
  assert.equal(await page.locator('.block-footer').count(), footerCount);
  assert.equal(await page.locator('.invoice-page').last().locator('.block-footer').count(), footerCount);
  assert.equal((await page.locator('.block-terms > div').allTextContents()).join(''), data.data.terms);
  assert.equal((await page.locator('.block-observations > div').allTextContents()).join(''), data.data.observations);
  assert(!/versão do documento|document version|\bv13\b/i.test(await page.locator('body').innerText()));
  await page.pdf({ path: path.join(output, name + '.pdf'), format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  fs.writeFileSync(path.join(output, name + '.json'), JSON.stringify({ result, geometry }, null, 2));
  fs.writeFileSync(path.join(output, name + '.html'), await page.content());
  return { page, result };
}

test('19 quote conditions stay inside A4 margins and the official footer appears only on the last page', async () => {
  const { page, result } = await render('nineteen-conditions', quote());
  try { assert(result.pages >= 2); } finally { await page.close(); }
});

test('terms spanning several pages and an unbroken token retain every character', async () => {
  const data = quote();
  data.brand.visual.margin = 28;
  data.data.terms = Array.from({ length: 5 }, () => data.data.terms).join('\n\n') + '\n' + 'TOKEN'.repeat(200);
  const { page, result } = await render('oversized-terms', data);
  try { assert(result.pages > 3); } finally { await page.close(); }
});

test('a one-page quote and a disabled footer preserve the configured content', async () => {
  const data = quote();
  data.data.terms = 'Uma condição comercial curta.';
  data.data.observations = 'Conferência final.';
  data.data.items = [item('Serviço demonstrativo')];
  data.data.totalAmount = data.data.subtotalServices = money(125.5);
  data.brand.visual.headingSize = null;
  data.brand.visual.margin = 14;
  const single = await render('single-page', data);
  try { assert.equal(single.result.pages, 1); } finally { await single.page.close(); }
  data.templateSettings.enabledBlocks.footer = false;
  const disabled = await render('without-footer', data);
  await disabled.page.close();
});

test('large quote tables retain all rows before the final terms and footer', async () => {
  const data = quote();
  data.data.items = Array.from({ length: 60 }, (_, i) => item(`Serviço demonstrativo ${i + 1} - escopo comercial completo`));
  data.data.totalAmount = data.data.subtotalServices = money(60 * 125.5);
  const { page, result } = await render('sixty-items', data);
  try {
    assert(result.pages > 3);
    assert.equal(await page.locator('.block-items-table tbody tr').count(), 60);
  } finally { await page.close(); }
});
