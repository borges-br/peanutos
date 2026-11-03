// Real shared renderers + headless browser, with fictional content only.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const root = path.resolve(__dirname, ".."),
  output = path.join(root, "data/qa/circuito-release");
const { chromium } = createRequire(path.join(root, "apps/worker/package.json"))(
  "playwright",
);
const { DEFAULT_VISUAL_CONFIG } = createRequire(
  path.join(root, "apps/web/package.json"),
)("@peanut/validators");
const {
  getPublishedDocumentIdentity,
  emailAppearance,
} = require("../packages/db/dist");
const {
  renderA4Document,
  prepareDocumentPage,
} = require("../packages/documents/dist");
const {
  renderBillingEmail,
  DEFAULT_BILLING_EMAIL,
} = require("../packages/utils/dist");
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const brand = await getPublishedDocumentIdentity(
    {
      workspaceVisualSettings: { findUnique: async () => null },
      workspace: {
        findUnique: async () => ({ brandName: null, logoFileObjectId: null }),
      },
    },
    "synthetic",
  );
  const blocks = [
    "header",
    "logo",
    "companyInfo",
    "clientInfo",
    "documentTitle",
    "itemsTable",
    "financialSummary",
    "paymentInfo",
    "footer",
  ];
  const html = renderA4Document({
    documentType: "INVOICE",
    timeZone: "America/Sao_Paulo",
    generatedAt: "03/11/2026, 09:00:00",
    locale: "pt-BR",
    brand: {
      ...brand,
      legalName: "Empresa Demonstração Ltda.",
      email: "contato@example.invalid",
      footerText: "Documento fictício para validação visual. Sem valor fiscal.",
    },
    client: {
      tradeName: "Estúdio Aurora",
      legalName: "Cliente Demonstração Ltda.",
      email: "financeiro@example.invalid",
    },
    responsible: null,
    templateSettings: {
      documentType: "INVOICE",
      templateKey: "standard",
      layoutVariant: "default",
      enabledBlocks: Object.fromEntries(blocks.map((b) => [b, true])),
      blockOrder: blocks,
      settings: {},
    },
    data: {
      number: "FAT-DEMO-1103",
      status: "DRAFT",
      issueDate: "03/11/2026",
      dueDate: "10/11/2026",
      billingPeriod: "2026-11",
      paymentMethod: "TRANSFER",
      items: [
        {
          type: "SERVICE",
          description: "Suporte e manutenção de infraestrutura",
          quantity: "1",
          unit: "UN",
          unitPrice: "R$ 1.250,00",
          totalPrice: "R$ 1.250,00",
          billingKind: "BASE",
        },
      ],
      totalAmount: "R$ 1.250,00",
      subtotalServices: "R$ 1.250,00",
      subtotalMaterials: "R$ 0,00",
    },
  });
  const logo = fs.readFileSync(
    path.join(root, "apps/web/public/brand/peanut-os/v1/logo-light.png"),
  );
  const email = renderBillingEmail(
    DEFAULT_BILLING_EMAIL,
    {
      empresa: "Peanut OS",
      cliente: "Estúdio Aurora",
      fatura: "FAT-DEMO-1103",
      contrato: "CTR-DEMO",
      competencia: "2026-11",
      total: "R$ 1.250,00",
      vencimento: "10/11/2026",
      fuso: "America/Sao_Paulo",
    },
    emailAppearance(DEFAULT_VISUAL_CONFIG, {
      url: "data:image/png;base64," + logo.toString("base64"),
      width: 492,
      height: 95,
    }),
  );
  fs.writeFileSync(path.join(output, "document.html"), html);
  fs.writeFileSync(path.join(output, "email.html"), email.html);
  const executablePath = [
    chromium.executablePath(),
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(fs.existsSync);
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({
      viewport: { width: 920, height: 1100 },
    });
    await page.route("**/*", (r) => r.abort());
    await prepareDocumentPage(page, html);
    assert.equal(
      await page
        .locator("img")
        .evaluateAll((images) =>
          images.every((i) => i.complete && i.naturalWidth > 0),
        ),
      true,
    );
    await page.pdf({
      path: path.join(output, "document.pdf"),
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await page.setContent(email.html);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode()));
    });
    await page.screenshot({
      path: path.join(output, "email.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(output, "email-mobile.png"),
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    );
    console.log(
      "Default document PDF and responsive email rendered with real application code; no network requests or delivery.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
