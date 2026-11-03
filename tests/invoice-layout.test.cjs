// Build documents/db first. Real Chromium/PDF, synthetic billing data only.
const test = require("node:test"),
  assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  { createRequire } = require("node:module");
const { chromium } = createRequire(path.resolve("apps/worker/package.json"))(
  "playwright",
);
const {
  renderA4Document,
  prepareDocumentPage,
  invoiceBillingNote,
} = require("../packages/documents/dist");
const { recurringAddonItems } = require("../packages/db/dist");
const { seed, item, money } = require("./fixtures/invoice-layout.cjs");
const output = path.resolve("data/qa/invoice-pagination");
let browser;
test.before(async () => {
  const executablePath = [
    chromium.executablePath(),
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(fs.existsSync);
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  fs.mkdirSync(output, { recursive: true });
});
test.after(async () => {
  await browser?.close();
});

test("proration text requires the explicit per-item rule, including legacy snapshots", () => {
  assert.equal(
    invoiceBillingNote({
      billingProration: "NONE",
      billingNote: "Valor integral, sem rateio · 01/11/2026 a 30/11/2026",
    }),
    "01/11/2026 a 30/11/2026",
  );
  assert.equal(
    invoiceBillingNote({ billingNote: "Valor integral, sem rateio" }),
    "",
  );
  const daily =
    "1 × R$ 310,00/mês · Rateio: 16/31 dias · 16/10/2026 a 31/10/2026";
  assert.equal(
    invoiceBillingNote({ billingProration: "DAILY", billingNote: daily }),
    daily,
  );
  assert.equal(invoiceBillingNote({ billingNote: daily }), daily);
  assert(
    !/rateio/i.test(
      invoiceBillingNote({ billingProration: "NONE", billingNote: daily }),
    ),
  );
  const contract = {
    startDate: new Date("2026-01-01"),
    endDate: null,
    lineItems: ["NONE", "DAILY"].map((proration, index) => ({
      id: String(index),
      description: "Demo",
      billingRole: "ADDON",
      recurring: true,
      quantity: 1,
      unitPriceCents: 31000,
      startsOn: new Date("2026-10-16"),
      endMode: "OPEN",
      proration,
    })),
  };
  const [full, partial] = recurringAddonItems(
    contract,
    "2026-10",
    "America/Sao_Paulo",
  );
  assert(!/rateio/i.test(full.recurrenceSnapshot.note));
  assert.match(partial.recurrenceSnapshot.note, /Rateio: 16\/31 dias/);
  assert.equal(Number(full.unitPrice), 310);
  assert.equal(Number(partial.unitPrice), 160);
});

async function render(name, params) {
  const page = await browser.newPage();
  await page.route("**/*", (route) =>
    route.request().url().startsWith("data:")
      ? route.continue()
      : route.abort(),
  );
  const html = renderA4Document(params);
  const result = await prepareDocumentPage(page, html);
  const geometry = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".invoice-page"), (page) => {
      const area = page
          .querySelector(".invoice-page-body")
          .getBoundingClientRect(),
        footer = page
          .querySelector(".invoice-page-footer")
          .getBoundingClientRect();
      return {
        bottom: area.bottom,
        footer: footer.top,
        scroll: page.scrollWidth,
        width: page.clientWidth,
        rows: page.querySelectorAll("tbody>tr").length,
      };
    }),
  );
  for (const bounds of geometry) {
    assert(bounds.bottom <= bounds.footer + 1, JSON.stringify(bounds));
    assert(bounds.scroll <= bounds.width + 1, JSON.stringify(bounds));
  }
  const pdfPath = path.join(output, name + ".pdf");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  fs.writeFileSync(path.join(output, name + ".html"), await page.content());
  fs.writeFileSync(
    path.join(output, name + ".json"),
    JSON.stringify({ result, geometry }, null, 2),
  );
  return { page, result, pdfPath };
}

test("six billed items plus issuer, logo, totals and payment fit legibly on one A4 page", async () => {
  const { page, result } = await render(
    "representative-six-items",
    structuredClone(seed),
  );
  try {
    assert.equal(result.pages, 1);
    assert.equal(result.overflow, false);
    assert.equal(await page.locator(".block-financial-summary").count(), 1);
    assert.equal(await page.locator(".block-payment-info").count(), 1);
    assert.equal(await page.locator(".invoice-page-reference").count(), 0);
    assert(!/rateio/i.test(await page.locator("body").innerText()));
    assert.equal(await page.locator(".block-items-table tbody tr").count(), 6);
    assert(
      (await page
        .locator(".block-items-table tbody td")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 12,
    );
  } finally {
    await page.close();
  }
});

test("long tables retain every item and repeat their heading with exact summary references", async () => {
  const data = structuredClone(seed);
  data.data.items = Array.from({ length: 80 }, (_, i) =>
    item(
      `Serviço identificado ${String(i + 1).padStart(3, "0")} - descrição detalhada para leitura e conferência`,
      25.5,
    ),
  );
  data.data.totalAmount = data.data.subtotalServices = money(80 * 25.5);
  const { page, result } = await render("long-80-items", data);
  try {
    assert(result.pages > 1);
    assert(!result.overflow);
    const texts = await page
      .locator(".block-items-table tbody tr strong")
      .allTextContents();
    assert.equal(texts.length, 80);
    assert.equal(new Set(texts.map((t) => t.trim())).size, 80);
    assert.equal(await page.locator(".block-financial-summary").count(), 1);
    assert.equal(await page.locator(".block-payment-info").count(), 1);
    const target = await page
      .locator(".block-financial-summary")
      .evaluate((el) => el.closest(".invoice-page").dataset.pageNumber);
    assert.match(
      await page
        .locator(".invoice-page")
        .first()
        .locator(".invoice-page-reference")
        .innerText(),
      new RegExp("página " + target),
    );
    const tablePages = await page
      .locator(".invoice-page:has(.block-items-table)")
      .count();
    assert.equal(
      await page.locator(".block-items-table thead").count(),
      tablePages,
    );
  } finally {
    await page.close();
  }
});

test("closing-only page gets its own context, larger total and previous-page reference including discount", async () => {
  let selected;
  for (let count = 8; count <= 28; count++) {
    const data = structuredClone(seed);
    data.data.items = Array.from({ length: count }, (_, i) =>
      item(`Serviço ${i + 1} - atividade adicional`, 125.5),
    );
    data.data.discountAmount = money(100);
    data.data.discountReason = "Desconto comercial de demonstração.";
    data.data.subtotalServices = money(count * 125.5);
    data.data.totalAmount = money(count * 125.5 - 100);
    const page = await browser.newPage();
    const result = await prepareDocumentPage(page, renderA4Document(data));
    const closing = await page.locator(".invoice-closing-only").count();
    await page.close();
    if (closing) {
      selected = data;
      break;
    }
    assert(result.pages < 4);
  }
  assert(selected, "a fixture should exercise a separate financial closing");
  const { page, result } = await render("closing-separate-page", selected);
  try {
    assert.equal(result.pages, 2);
    const closing = page.locator(".invoice-closing-only");
    assert.match(await closing.innerText(), /Resumo financeiro e pagamento/);
    assert.match(await closing.innerText(), /FAT-DEMO-202611/);
    assert.match(await closing.innerText(), /Cliente Demonstração Projetos/);
    assert.match(await closing.innerText(), /10\/11\/2026/);
    assert.match(await closing.innerText(), /Desconto comercial/);
    assert.match(
      await page.locator(".invoice-page").first().innerText(),
      /Valor Total \/ Desconto: página 2/,
    );
    assert(
      (await closing
        .locator(".financial-total-value")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 32,
    );
  } finally {
    await page.close();
  }
});

test("full descriptions longer than a page are split without losing text or duplicating amounts", async () => {
  const data = structuredClone(seed);
  const description = Array.from(
    { length: 700 },
    (_, i) => `atividade-${i}`,
  ).join(" ");
  data.data.items = [item(description, 987.65)];
  data.data.totalAmount = data.data.subtotalServices = money(987.65);
  const { page, result } = await render("oversized-description", data);
  try {
    assert(result.pages > 1);
    assert(!result.overflow);
    const combined = (
      await page
        .locator(".block-items-table tbody tr td:first-child strong")
        .allTextContents()
    ).join("");
    assert.equal(combined, description);
    assert.equal(
      await page
        .locator(".block-items-table tbody td:last-child")
        .filter({ hasText: money(987.65) })
        .count(),
      1,
    );
  } finally {
    await page.close();
  }
});

test("optional blocks and regular invoices use the same pagination; service orders remain unaffected", async () => {
  const data = structuredClone(seed);
  delete data.data.billingPeriod;
  data.templateSettings.enabledBlocks.paymentInfo = false;
  data.templateSettings.enabledBlocks.footer = false;
  const { page, result } = await render("regular-without-payment", data);
  try {
    assert.equal(result.pages, 1);
    assert.equal(await page.locator(".block-payment-info").count(), 0);
    assert.equal(await page.locator(".block-footer").count(), 0);
  } finally {
    await page.close();
  }
  const serviceOrder = structuredClone(seed);
  serviceOrder.documentType = "SERVICE_ORDER";
  const other = await browser.newPage();
  try {
    assert.equal(
      await prepareDocumentPage(other, renderA4Document(serviceOrder)),
      null,
    );
    assert.equal(await other.locator(".invoice-page").count(), 0);
  } finally {
    await other.close();
  }
});
