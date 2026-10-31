// Real frontend and renderer. --postgres forwards branding/assets/authored-document
// requests through real Nest controllers and PostgreSQL; authentication and the
// existing business-module responses remain synthetic.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { spawn } = require("node:child_process"),
  { createRequire } = require("node:module"),
  { createServer } = require("node:net"),
  { randomUUID } = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  webRequire = createRequire(path.join(root, "apps/web/package.json"));
const { chromium } = createRequire(path.join(root, "apps/worker/package.json"))(
  "playwright",
);
const {
  DEFAULT_VISUAL_CONFIG,
  visualConfigSchema,
  visualIssues,
  TEMPLATE_BLOCKS,
  documentVisualConfig,
  normalizeVisualConfig,
} = webRequire("@peanut/validators");
const {
  renderEditorialDocument,
  renderA4Document,
} = require("../packages/documents/dist");
const extended = process.argv.includes("--extended"),
  assetInput = path.join(root, "data/qa/branding/assets"),
  output = path.join(
    root,
    extended ? "data/qa/branding-v2" : "data/qa/branding",
  ),
  pdfOutput = path.join(
    root,
    extended ? "output/pdf/branding-v2" : "output/pdf",
  );
const user = {
  id: randomUUID(),
  workspaceId: randomUUID(),
  name: "Equipe de demonstração",
  role: "OWNER",
  timeZone: "America/Sao_Paulo",
};
const client = {
  id: randomUUID(),
  legalName: "Rede Horizonte",
  tradeName: "Rede Horizonte",
};
const quote = {
  id: randomUUID(),
  clientId: client.id,
  number: "OR-EXEMPLO-024",
  totalAmount: "2400",
  items: [],
};
const assets = [],
  imageByUrl = new Map();
for (const [slot, file] of Object.entries({
  logoLight: "signature-light.svg",
  logoDark: "signature-dark.svg",
  iconLight: "symbol-light.svg",
  iconDark: "symbol-dark.svg",
})) {
  const id = randomUUID(),
    url = "/api/v1/files/" + randomUUID(),
    data = fs.readFileSync(path.join(assetInput, file));
  assets.push({
    id,
    url,
    title: `${slot.startsWith("icon") ? "Símbolo" : "Assinatura"} · ${slot.endsWith("Dark") ? "fundo escuro" : "fundo claro"}`,
    mimeType: "image/svg+xml",
    slot,
  });
  imageByUrl.set(url, { data, mimeType: "image/svg+xml" });
}
const config = structuredClone(DEFAULT_VISUAL_CONFIG);
Object.assign(config, {
  name: "BORGES",
  subtitle: "Consultoria e integração tecnológica",
  font: "source-sans-3",
  theme: "light",
});
config.navigation = {
  mode: "expanded",
  sidebarWidth: 304,
  logoWidth: 240,
  logoHeight: 56,
  iconSize: 40,
  padding: 24,
};
config.interface = {
  radius: 8,
  density: "comfortable",
  spacing: 24,
  shadow: "none",
};
config.dark = {
  canvas: "#1E2A38",
  surface: "#263545",
  raised: "#354557",
  text: "#F4F7FA",
  muted: "#C2CDD8",
  border: "#526171",
  action: "#90CAF9",
  onAction: "#1E2A38",
  sidebar: "#263545",
};
config.documents = {
  ...config.documents,
  style: "editorial",
  footer: "BORGES / empresa.example / contato@example.invalid",
};
for (const asset of assets) config.assets[asset.slot] = asset.id;
Object.assign(config, normalizeVisualConfig(config));
let draft = structuredClone(config),
  published = structuredClone(config),
  revision = 2,
  publishedVersion = 1;
const versions = [
    {
      version: 1,
      createdAt: "2026-10-30T15:00:00Z",
      config: structuredClone(config),
    },
  ],
  documents = [],
  requests = [];
const templates = {};
const defaultTemplate = () => ({
  enabledBlocks: Object.fromEntries(
    TEMPLATE_BLOCKS.map((b) => [
      b,
      [
        "header",
        "logo",
        "companyInfo",
        "clientInfo",
        "documentTitle",
        "itemsTable",
        "financialSummary",
        "observations",
        "footer",
      ].includes(b),
    ]),
  ),
  blockOrder: [...TEMPLATE_BLOCKS],
});
const state = () => ({
  draft,
  published,
  revision,
  publishedVersion,
  assets,
  versions,
});
const asData = (assetId) => {
  const a = assets.find((a) => a.id === assetId),
    i = a && imageByUrl.get(a.url);
  return i ? `data:${i.mimeType};base64,${i.data.toString("base64")}` : null;
};
function renderDocument(c, type, doc, template) {
  const company = {
    name: c.name,
    logo: asData(c.assets.logoLight),
    email: "contato@example.invalid",
    website: "empresa.example",
  };
  if ((type === "REPORT" || type === "PROPOSAL") && !template)
    return renderEditorialDocument({
      title:
        doc?.title ||
        (type === "REPORT"
          ? "Relatório técnico de infraestrutura"
          : "Proposta técnica e comercial"),
      kind: type,
      number: doc?.status === "FINAL" ? "RT-EXEMPLO-001" : "PRÉVIA",
      date: "30/10/2026",
      status: doc?.status || "DRAFT",
      project: doc?.project || "Integração dos sistemas da operação",
      client: client.legalName,
      company,
      visual: documentVisualConfig(c),
      sections:
        doc?.sections ||
        (type === "REPORT"
          ? [
              {
                title: "Contexto",
                body: "Avaliação demonstrativa da integração dos sistemas e da continuidade dos serviços.",
              },
              {
                title: "Diagnóstico",
                body: "Registros duplicados entre sistemas aumentam o retrabalho. A rotina de recuperação precisa ser documentada.",
              },
              {
                title: "Recomendação",
                body: "Centralizar cadastros e validar periodicamente a recuperação dos backups.",
              },
              {
                title: "Validação e limites",
                body: "Dados fictícios para avaliação visual. Nenhum ambiente real foi analisado.",
              },
              {
                title: "Próximos passos",
                body: "Revisar o diagnóstico com a equipe e definir responsáveis, prioridades e prazos.",
              },
            ]
          : [
              {
                title: "Objetivo",
                body: "Integrar processos e informações para reduzir retrabalho e facilitar a gestão da operação.",
              },
              {
                title: "Escopo e entregas",
                body: "Diagnóstico dos processos\nPlano de integração\nImplantação acompanhada e documentação",
              },
              {
                title: "Limites e dependências",
                body: "A execução depende da disponibilização dos acessos e da validação das entregas pela equipe.",
              },
              {
                title: "Condições comerciais",
                body: "Valores e prazos definidos no orçamento vinculado à proposta.",
              },
              {
                title: "Próximos passos",
                body: "Revisar o escopo e confirmar as condições para início do projeto.",
              },
            ]),
      quote: doc?.quoteId
        ? {
            number: quote.number,
            total: "R$ 2.400,00",
            items: [
              {
                description: "Diagnóstico e plano de integração",
                quantity: "16",
                total: "R$ 2.400,00",
              },
            ],
          }
        : null,
    });
  const blocks = [
    "header",
    "logo",
    "companyInfo",
    "clientInfo",
    "documentTitle",
    "itemsTable",
    "financialSummary",
    "observations",
    "footer",
  ];
  return renderA4Document({
    documentType: type,
    brand: {
      publicName: c.name,
      logoUrl: company.logo,
      documentPrimaryColor: c.documents.accent,
      visual: documentVisualConfig(c),
    },
    responsible: null,
    client: { tradeName: client.legalName },
    data: {
      number: "EXEMPLO-001",
      status: "DRAFT",
      issueDate: "30/10/2026",
      dueDate: "10/11/2026",
      totalAmount: "R$ 2.400,00",
      items: [
        {
          type: "SERVICE",
          description: "Diagnóstico e documentação",
          quantity: "16",
          unit: "H",
          unitPrice: "R$ 150,00",
          totalPrice: "R$ 2.400,00",
        },
      ],
      observations: "Documento com dados fictícios.",
    },
    templateSettings: {
      documentType: type,
      templateKey: "standard",
      layoutVariant: "default",
      enabledBlocks:
        template?.enabledBlocks ||
        Object.fromEntries(blocks.map((b) => [b, true])),
      blockOrder: template?.blockOrder || blocks,
    },
    generatedAt: "30/10/2026",
  });
}
async function main() {
  let postgresFixture;
  if (process.argv.includes("--postgres")) {
    postgresFixture = await require("./branding-fixture.cjs").createFixture();
    const tenant = await postgresFixture.tenant("BORGES");
    const branded = await postgresFixture.branded(tenant);
    Object.assign(user, {
      id: tenant.users.OWNER.id,
      workspaceId: tenant.ws.id,
    });
    Object.assign(client, tenant.client);
    Object.assign(quote, tenant.quote);
    Object.assign(config, normalizeVisualConfig(branded.config));
    assets.splice(0, assets.length, ...branded.assets);
    imageByUrl.clear();
    for (const [slot, id] of Object.entries(config.assets)) {
      const a = assets.find((a) => a.id === id);
      const name = `${slot.startsWith("icon") ? "symbol" : "signature"}-${slot.endsWith("Dark") ? "dark" : "light"}.svg`;
      imageByUrl.set(a.url, {
        mimeType: a.mimeType,
        data: fs.readFileSync(path.join(assetInput, name)),
      });
    }
    const current = (
      await postgresFixture.request(user, "GET", "/settings/visual")
    ).json();
    draft = current.draft;
    published = current.published;
    revision = current.revision;
    publishedVersion = current.publishedVersion;
    versions.splice(0, versions.length, ...current.versions);
  }
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(pdfOutput, { recursive: true });
  const probe = createServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  const server = spawn(
    process.execPath,
    [
      webRequire.resolve("next/dist/bin/next"),
      process.argv.includes("--dev") ? "dev" : "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    { cwd: path.join(root, "apps/web"), windowsHide: true, stdio: "pipe" },
  );
  let logs = "";
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  let browser, reviewPage;
  const checks = [];
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(`http://127.0.0.1:${port}/login`)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!ready) throw new Error(logs);
    const executablePath = [
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      chromium.executablePath(),
    ].find(fs.existsSync);
    browser = await chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1100 },
    });
    await context.addInitScript(() =>
      localStorage.setItem("peanut_token", "synthetic-branding"),
    );
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (!url.pathname.includes("/api/v1/"))
        return url.hostname === "127.0.0.1" && url.port === String(port)
          ? route.continue()
          : route.abort();
      const endpoint = url.pathname.split("/api/v1")[1],
        method = req.method(),
        headers = {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        };
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
      const body = req.postData() ? JSON.parse(req.postData()) : null;
      requests.push({ endpoint, method });
      let result = {};
      const fail = (status, message) =>
        route.fulfill({
          status,
          headers,
          contentType: "application/json",
          body: JSON.stringify({ message }),
        });
      if (
        postgresFixture &&
        (/^\/(settings\/visual|authored-documents)(?:\/|$)/.test(endpoint) ||
          endpoint.startsWith("/files/"))
      ) {
        const response = await postgresFixture.server.inject({
          method,
          url: "/api/v1" + endpoint + url.search,
          headers: {
            authorization: `Bearer ${user.id}`,
            ...(body ? { "content-type": "application/json" } : {}),
          },
          ...(body ? { payload: body } : {}),
        });
        const contentType = String(
          response.headers["content-type"] || "application/octet-stream",
        );
        if (
          contentType.includes("application/json") &&
          response.statusCode < 400
        ) {
          const value = response.json();
          if (value.draft) {
            draft = value.draft;
            published = value.published;
            revision = value.revision;
            publishedVersion = value.publishedVersion;
            assets.splice(0, assets.length, ...value.assets);
            versions.splice(0, versions.length, ...value.versions);
          }
          if (endpoint === "/settings/visual/assets" && method === "POST") {
            assets.unshift(value);
            imageByUrl.set(value.url, {
              mimeType: body.mimeType,
              data: Buffer.from(
                body.data.replace(/^data:[^;]+;base64,/, ""),
                "base64",
              ),
            });
          }
          if (endpoint.startsWith("/authored-documents") && value.id) {
            const index = documents.findIndex((d) => d.id === value.id);
            if (index < 0) documents.push(value);
            else documents[index] = value;
          }
        }
        return route.fulfill({
          status: response.statusCode,
          headers,
          contentType,
          body: response.rawPayload,
        });
      }
      if (imageByUrl.has(url.pathname)) {
        const i = imageByUrl.get(url.pathname);
        return route.fulfill({
          headers,
          contentType: i.mimeType,
          body: i.data,
        });
      }
      if (endpoint === "/auth/me") result = user;
      else if (endpoint === "/auth/refresh")
        result = { user, accessToken: "synthetic-branding" };
      else if (endpoint === "/settings/visual/active")
        result = { config: published, assets, version: publishedVersion };
      else if (endpoint === "/settings/visual") result = state();
      else if (endpoint === "/settings/visual/draft") {
        if (body.revision !== revision)
          return fail(
            409,
            "Outra pessoa alterou a marca. Recarregue antes de salvar.",
          );
        const checked = visualConfigSchema.safeParse(body.config);
        if (!checked.success) return fail(400, "Configuração inválida.");
        draft = checked.data;
        revision++;
        result = state();
      } else if (endpoint === "/settings/visual/publish") {
        if (body.revision !== revision)
          return fail(409, "Conflito de revisão.");
        if (visualIssues(draft).length)
          return fail(400, "Contraste insuficiente.");
        published = structuredClone(draft);
        revision++;
        publishedVersion++;
        versions.unshift({
          version: publishedVersion,
          createdAt: new Date().toISOString(),
          config: structuredClone(draft),
        });
        result = state();
      } else if (endpoint === "/settings/visual/restore") {
        draft = structuredClone(
          versions.find((v) => v.version === body.version).config,
        );
        revision++;
        result = state();
      } else if (endpoint === "/settings/visual/assets") {
        const id = randomUUID(),
          url = "/api/v1/files/" + randomUUID(),
          a = {
            id,
            url,
            title: body.title,
            mimeType: body.mimeType,
            parentAssetId: body.parentAssetId,
          };
        assets.unshift(a);
        imageByUrl.set(url, {
          mimeType: body.mimeType,
          data: Buffer.from(
            body.data.replace(/^data:[^;]+;base64,/, ""),
            "base64",
          ),
        });
        result = a;
      } else if (endpoint === "/settings/visual/preview")
        return route.fulfill({
          headers,
          contentType: "text/html",
          body: renderDocument(body.config, body.documentType),
        });
      else if (endpoint.startsWith("/document-templates/")) {
        const parts = endpoint.split("/"),
          type = parts[2];
        if (parts[3] === "preview")
          return route.fulfill({
            headers,
            contentType: "text/html",
            body: renderDocument(published, type, null, body),
          });
        if (parts[3] === "reset") templates[type] = defaultTemplate();
        else if (method === "PATCH") templates[type] = body;
        result = templates[type] || defaultTemplate();
      } else if (endpoint.startsWith("/clients"))
        result = { data: [client], total: 1 };
      else if (endpoint.startsWith("/quotes"))
        result = { data: [quote], total: 1 };
      else if (endpoint === "/authored-documents/preview")
        return route.fulfill({
          headers,
          contentType: "text/html",
          body: renderDocument(published, body.kind, body),
        });
      else if (endpoint === "/authored-documents" && method === "GET")
        result = documents;
      else if (endpoint === "/authored-documents" && method === "POST") {
        result = {
          ...body,
          id: randomUUID(),
          revision: 1,
          status: "DRAFT",
          updatedAt: new Date().toISOString(),
        };
        documents.push(result);
      } else if (endpoint.startsWith("/authored-documents/")) {
        const parts = endpoint.split("/"),
          d = documents.find((d) => d.id === parts[2]);
        if (!d) return fail(404, "Documento não encontrado.");
        if (parts[3] === "preview")
          return route.fulfill({
            headers,
            contentType: "text/html",
            body: d.frozenHtml || renderDocument(published, d.kind, d),
          });
        if (parts[3] === "finalize") {
          d.status = "FINAL";
          d.revision++;
          d.frozenHtml = renderDocument(published, d.kind, d);
        } else if (method === "PUT") {
          Object.assign(d, body, { revision: d.revision + 1 });
        }
        result = d;
      }
      return route.fulfill({
        headers,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    const page = await context.newPage(),
      errors = [];
    reviewPage = page;
    page.on("pageerror", (e) => errors.push(e.message));
    const go = async (pathName) => {
      await page.goto(`http://127.0.0.1:${port}${pathName}`);
      await page.locator("h1").waitFor();
      await page.waitForTimeout(250);
    };
    const screenshot = async (name) => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      await page.screenshot({
        path: path.join(output, name),
        fullPage: true,
        animations: "disabled",
      });
    };
    await go("/dashboard/configuracoes/marca");
    await page.getByLabel("Nome exibido no sistema").waitFor();
    fs.writeFileSync(
      path.join(output, "button-colors.json"),
      JSON.stringify(
        await page.locator("button").evaluateAll((buttons) =>
          buttons.slice(0, 25).map((b) => ({
            text: b.textContent,
            color: getComputedStyle(b).color,
            background: getComputedStyle(b).backgroundColor,
            disabled: b.disabled,
          })),
        ),
        null,
        2,
      ),
    );
    await page.locator(".brand-asset img").first().waitFor();
    if (extended) {
      await page.locator(".brand-presets summary").click();
      await page.getByRole("button", { name: /^Institucional/ }).click();
      const previewAction = page
        .locator(".brand-live-preview")
        .getByRole("button", { name: "Novo cliente", exact: true });
      await page.waitForFunction(
        () =>
          getComputedStyle(
            document.querySelector(
              '.brand-live-preview [data-ui-button="primary"]',
            ),
          ).backgroundColor === "rgba(0, 0, 0, 0)",
      );
      await page.getByRole("button", { name: "Desfazer", exact: true }).click();
      await page.waitForFunction(
        () =>
          getComputedStyle(
            document.querySelector(
              '.brand-live-preview [data-ui-button="primary"]',
            ),
          ).backgroundColor !== "rgba(0, 0, 0, 0)",
      );
      await page.getByRole("button", { name: "Refazer", exact: true }).click();
      assert.equal(
        await previewAction.evaluate((el) => getComputedStyle(el).borderRadius),
        "2px",
      );
      await page.getByRole("button", { name: "Desfazer", exact: true }).click();
      assert.equal(
        await page.getByLabel("Nome exibido no sistema").inputValue(),
        "BORGES",
      );
      checks.push(
        "Presets change the preview, preserve the identity and support undo/redo",
      );
      await page.locator(".brand-presets summary").click();
    }
    await screenshot("01-identidade-desktop.png");
    await page.getByRole("tab", { name: "Navegação", exact: true }).click();
    await screenshot("02-navegacao-expandida.png");
    if (extended) {
      await page
        .getByRole("button", { name: "Usar paleta escura", exact: true })
        .click();
      await page
        .getByLabel("Alinhamento da marca na sidebar")
        .selectOption("center");
      await page
        .getByLabel("Ícones da navegação", { exact: true })
        .selectOption("filled");
      await page
        .getByRole("slider", {
          name: "Peso dos ícones da navegação",
          exact: true,
        })
        .press("ArrowRight");
      const expectedSvg = fs.readFileSync(
        path.join(assetInput, "signature-dark.svg"),
        "utf8",
      );
      await page.waitForFunction(async (expected) => {
        try {
          const img = document.querySelector(".brand-preview-mark img");
          return img?.src && (await (await fetch(img.src)).text()) === expected;
        } catch {
          return false;
        }
      }, expectedSvg);
      await page
        .getByRole("heading", {
          name: "Cores próprias da sidebar",
          exact: true,
        })
        .scrollIntoViewIfNeeded();
      await screenshot("15-sidebar-independente.png");
      checks.push(
        "Light content and dark sidebar select the dark-surface artwork independently",
      );
      await page
        .getByRole("tab", { name: "Cores e interface", exact: true })
        .click();
      await page
        .locator(".brand-live-preview")
        .getByRole("button", { name: "Componentes", exact: true })
        .click();
      for (const [name, file, height] of [
        ["Essencial", "16-estilo-essencial.png", "44px"],
        ["Institucional", "17-estilo-institucional.png", "48px"],
        ["Operação", "18-estilo-operacao.png", "44px"],
      ]) {
        if (!(await page.locator(".brand-presets").evaluate((el) => el.open)))
          await page.locator(".brand-presets summary").click();
        await page
          .getByRole("button", { name: new RegExp("^" + name) })
          .click();
        await page
          .locator(".brand-live-preview")
          .getByRole("button", { name: "Componentes", exact: true })
          .click();
        const field = page.getByLabel("Cliente de exemplo");
        await page.waitForFunction(
          (height) =>
            getComputedStyle(
              document.querySelector('input[aria-label="Cliente de exemplo"]'),
            ).minHeight === height,
          height,
        );
        await field.fill("Rede Horizonte");
        const appearance = await page
          .locator(".brand-live-preview")
          .evaluate((root) => ({
            buttonBackground: getComputedStyle(
              root.querySelector('[data-ui-button="primary"]'),
            ).backgroundColor,
            valueFont: getComputedStyle(
              root.querySelector("[data-brand-value]"),
            ).fontFamily,
          }));
        assert.equal(
          appearance.buttonBackground === "rgba(0, 0, 0, 0)",
          name === "Institucional",
        );
        assert.equal(
          appearance.valueFont.includes("monospace"),
          name === "Operação",
        );
        await screenshot(file);
        await page.locator(".brand-live-preview").screenshot({
          path: path.join(output, file.replace("estilo-", "preview-")),
          animations: "disabled",
        });
        await page
          .locator(".brand-live-preview")
          .getByRole("button", { name: "Lista", exact: true })
          .click();
        const rowColor = await page
          .locator(".brand-preview-list > div")
          .nth(2)
          .evaluate((el) => getComputedStyle(el).backgroundColor);
        const rowHex =
          name === "Operação" ? config.light.raised : config.light.surface;
        assert.equal(
          rowColor,
          `rgb(${rowHex
            .slice(1)
            .match(/../g)
            .map((c) => parseInt(c, 16))
            .join(", ")})`,
        );
      }
      await page.getByRole("button", { name: /^Institucional/ }).click();
      await page
        .locator(".brand-live-preview")
        .getByRole("button", { name: "Lista", exact: true })
        .click();
      await page.locator(".brand-presets summary").click();
      await page.getByRole("tab", { name: "Navegação", exact: true }).click();
      checks.push(
        "Three component presets render distinct button, field, table and data typography styles",
      );
    }
    await page.getByLabel("Modo no computador").selectOption("compact");
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Rascunho salvo" })
      .waitFor();
    assert.equal(
      await page.locator(".workspace-brand").getAttribute("data-mode"),
      "expanded",
    );
    checks.push("Draft save does not change the active sidebar");
    await page
      .getByRole("button", { name: "Aplicar à empresa", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Marca aplicada" })
      .waitFor();
    assert.equal(
      await page.locator(".workspace-brand").getAttribute("data-mode"),
      "compact",
    );
    await screenshot("03-navegacao-compacta.png");
    await page.getByLabel("Modo no computador").selectOption("expanded");
    await page
      .getByRole("button", { name: "Aplicar à empresa", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Marca aplicada" })
      .waitFor();
    await page
      .getByRole("tab", { name: "Cores e interface", exact: true })
      .click();
    await page.getByLabel("Tema da prévia").selectOption("dark");
    await screenshot("04-tema-escuro-previa.png");
    await page.getByLabel("Tema inicial").selectOption("dark");
    await page
      .getByRole("button", { name: "Aplicar à empresa", exact: true })
      .click();
    await page.waitForFunction(
      () => document.documentElement.dataset.visualScheme === "dark",
    );
    await screenshot("04-tema-escuro-aplicado.png");
    fs.writeFileSync(
      path.join(output, "dark-contrast.json"),
      JSON.stringify(
        await page.evaluate(() => ({
          palette: {
            muted: getComputedStyle(document.documentElement).getPropertyValue(
              "--color-on-surface-variant",
            ),
            onAction: getComputedStyle(
              document.documentElement,
            ).getPropertyValue("--color-on-primary-fixed"),
          },
          buttons: [...document.querySelectorAll(".brand-studio button")].map(
            (b) => ({
              text: b.textContent,
              color: getComputedStyle(b).color,
              background: getComputedStyle(b).backgroundColor,
              opacity: getComputedStyle(b).opacity,
              disabled: b.disabled,
              className: b.className,
            }),
          ),
        })),
        null,
        2,
      ),
    );
    if (process.argv.includes("--theme-only")) return;
    await page.getByLabel("Tema inicial").selectOption("light");
    await page
      .getByRole("button", { name: "Aplicar à empresa", exact: true })
      .click();
    await page.waitForFunction(
      () => document.documentElement.dataset.visualScheme === "light",
    );
    await page.getByRole("tab", { name: "Identidade", exact: true }).click();
    await page
      .getByRole("button", { name: "Adicionar imagem", exact: true })
      .click();
    await page
      .getByLabel("Arquivo", { exact: true })
      .setInputFiles(path.join(assetInput, "signature.png"));
    await page
      .getByLabel("Nome na biblioteca")
      .fill("Assinatura recortada · exemplo");
    await page.getByLabel("Recortar e redimensionar").check();
    await page.getByLabel("Proporção", { exact: true }).selectOption("3");
    await screenshot("05-editor-imagem.png");
    await page
      .getByRole("button", { name: "Salvar na biblioteca", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const cropped = assets.find(
      (a) => a.title === "Assinatura recortada · exemplo",
    );
    assert.equal(cropped.mimeType, "image/png");
    assert(cropped.parentAssetId);
    const preserved = assets.find((a) => a.id === cropped.parentAssetId);
    assert(preserved);
    assert.deepEqual(
      imageByUrl.get(preserved.url).data,
      fs.readFileSync(path.join(assetInput, "signature.png")),
    );
    checks.push(
      "Raster crop preserves the uploaded original and links its PNG variation",
    );
    if (extended) {
      await page
        .getByLabel("Buscar na biblioteca")
        .fill("Assinatura recortada · exemplo");
      await page
        .locator(".brand-asset")
        .filter({
          has: page.getByText("Assinatura recortada · exemplo", {
            exact: true,
          }),
        })
        .getByRole("button", { name: "Ajustar imagem", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Girar 90°", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Espelhar horizontalmente", exact: true })
        .click();
      await page
        .getByLabel("Nome na biblioteca")
        .fill("Variação girada e espelhada");
      await screenshot("19-ajustes-imagem.png");
      await page
        .getByRole("button", { name: "Salvar na biblioteca", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      const rotated = assets.find(
        (a) => a.title === "Variação girada e espelhada",
      );
      assert.equal(rotated.parentAssetId, cropped.id);
      const dimensions = (b) => ({
        width: b.readUInt32BE(16),
        height: b.readUInt32BE(20),
      });
      const input = dimensions(imageByUrl.get(cropped.url).data),
        result = dimensions(imageByUrl.get(rotated.url).data);
      assert.equal(result.width, input.height);
      assert.equal(result.height, input.width);
      checks.push(
        "Rotation and mirroring create a correctly sized derived image without replacing its source",
      );
      await page.getByLabel("Buscar na biblioteca").fill("");
    }
    await page.getByRole("tab", { name: "Documentos", exact: true }).click();
    if (extended) {
      await page
        .getByLabel("Fonte do corpo do documento")
        .selectOption("source-sans-3");
      await page
        .getByLabel("Fonte dos títulos do documento")
        .selectOption("source-sans-3");
      await page
        .getByLabel("Texto do documento", { exact: true })
        .selectOption("11");
      await page
        .getByLabel("Título principal do documento", { exact: true })
        .selectOption("28");
      await page
        .getByRole("button", { name: "Aplicar à empresa", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Marca aplicada" })
        .waitFor();
    }
    await page.getByLabel("Tipo de prévia").selectOption("document");
    await page.locator("iframe").waitFor();
    await page
      .frameLocator("iframe")
      .getByRole("heading", {
        name: "Proposta técnica e comercial",
        exact: true,
      })
      .waitFor();
    await screenshot("06-marca-documentos.png");
    for (const [type, name] of [
      ["PROPOSAL", "proposta-borges"],
      ["REPORT", "relatorio-borges"],
      ...(extended ? [["REPORT", "relatorio-borges-longo"]] : []),
    ]) {
      await page.getByLabel("Documento de exemplo").selectOption(type);
      await page
        .frameLocator("iframe")
        .getByRole("heading", {
          name:
            type === "REPORT"
              ? "Relatório técnico de infraestrutura"
              : "Proposta técnica e comercial",
          exact: true,
        })
        .waitFor();
      const html = renderDocument(
        published,
        type,
        name.endsWith("-longo")
          ? {
              sections: Array.from({ length: 14 }, (_, i) => ({
                title: `Área de avaliação ${i + 1}`,
                body: "Cenário fictício para revisão de documentos extensos. A equipe registra os processos avaliados, as dependências observadas e os próximos passos. As recomendações serão revistas com os responsáveis antes de qualquer execução.\n".repeat(
                  3,
                ),
              })),
            }
          : undefined,
      );
      fs.writeFileSync(path.join(output, name + ".html"), html);
      const paper = await context.newPage();
      await paper.setContent(html);
      await paper.evaluate(() => document.fonts.ready);
      await paper.screenshot({
        path: path.join(output, name + ".png"),
        fullPage: true,
      });
      await paper.pdf({
        path: path.join(pdfOutput, name + ".pdf"),
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      await paper.close();
    }
    await page.getByLabel("Documento de exemplo").selectOption("INVOICE");
    await page
      .frameLocator("iframe")
      .getByText("EXEMPLO-001", { exact: false })
      .first()
      .waitFor();
    await screenshot("07-fatura-marca.png");
    if (extended) {
      const a4 = await page
        .frameLocator("iframe")
        .locator(".brand-document-title")
        .evaluate((el) => ({
          size: parseFloat(getComputedStyle(el).fontSize),
          font: getComputedStyle(el).fontFamily,
        }));
      assert(Math.abs(a4.size - (28 * 96) / 72) < 0.1);
      assert(a4.font.includes("Source Sans 3"));
    }
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByLabel("Tipo de prévia").selectOption("mobile");
      await page.waitForTimeout(150);
      const fit = await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      );
      assert(fit, `Horizontal overflow at ${width}`);
      if (width < 768) {
        assert.equal(
          await page.locator(".workspace-brand-mobile:visible").count(),
          1,
        );
        assert.equal(await page.locator(".brand-expanded:visible").count(), 0);
        const mark = await page
          .locator(".app-topbar .workspace-brand-mobile img")
          .boundingBox();
        assert(
          mark && mark.width >= 39 && mark.height >= 39,
          `Compact icon shrank at ${width}: ${JSON.stringify(mark)}`,
        );
      }
      await screenshot(`08-celular-${width}.png`);
      await page.locator(".brand-studio-preview").scrollIntoViewIfNeeded();
      await screenshot(`08-celular-preview-${width}.png`);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page
      .getByRole("button", { name: "Abrir navegação", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Navegação principal" }).waitFor();
    assert.equal(await page.locator(".brand-expanded:visible").count(), 0);
    assert(
      (await page.locator(".workspace-brand-mobile:visible").count()) >= 1,
    );
    await screenshot("09-celular-menu.png");
    await page.getByRole("button", { name: "Fechar navegação" }).click();
    checks.push(
      "Expanded desktop identity uses only the compact icon in the mobile header and drawer",
    );
    await page.setViewportSize({ width: 1600, height: 1100 });
    await go("/dashboard/documentos/elaborar?kind=REPORT");
    await page.getByLabel("Cliente", { exact: true }).selectOption(client.id);
    await page
      .getByLabel("Projeto", { exact: true })
      .fill("Integração dos sistemas da operação");
    const reportBodies = [
      "Avaliação demonstrativa da infraestrutura, dos processos e da continuidade dos serviços da Rede Horizonte.",
      "Foram identificadas informações duplicadas e oportunidades de integração entre sistemas. A rotina de recuperação precisa ser documentada.",
      "Centralizar cadastros, documentar integrações e validar periodicamente a recuperação dos backups.",
      "Dados fictícios para análise visual. Nenhum ambiente real foi analisado ou alterado.",
      "Revisar o diagnóstico com a equipe e definir responsáveis, prioridades e prazos.",
    ];
    for (const [i, label] of [
      "Contexto",
      "Diagnóstico",
      "Recomendação",
      "Validação e limites",
      "Próximos passos",
    ].entries())
      await page.getByLabel(label, { exact: true }).fill(reportBodies[i]);
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Rascunho salvo" })
      .waitFor();
    await page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Relatório técnico", exact: true })
      .waitFor();
    await screenshot("10-relatorio-editor.png");
    await page
      .getByRole("button", { name: "Finalizar documento", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar finalização", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Documento finalizado", exact: true })
      .waitFor();
    assert(await page.getByLabel("Título", { exact: true }).isDisabled());
    await screenshot("11-relatorio-finalizado.png");
    checks.push(
      "Report editing, saving, finalization and disabled editing after finalization",
    );
    await go("/dashboard/documentos/elaborar?kind=PROPOSAL");
    await page.getByLabel("Cliente", { exact: true }).selectOption(client.id);
    await page
      .getByLabel("Orçamento vinculado", { exact: true })
      .selectOption(quote.id);
    await page
      .getByLabel("Objetivo", { exact: true })
      .fill(
        "Integrar os sistemas da operação com uma implantação acompanhada e critérios de aceite claros.",
      );
    await page
      .getByLabel("Escopo e entregas", { exact: true })
      .fill(
        "Diagnóstico dos processos\nPlano de integração\nImplantação e documentação",
      );
    await page
      .getByLabel("Limites e dependências", { exact: true })
      .fill("Acessos e informações disponibilizados pelo cliente.");
    await page
      .getByLabel("Condições comerciais", { exact: true })
      .fill("Condições e valores conforme orçamento vinculado.");
    await page
      .getByLabel("Próximos passos", { exact: true })
      .fill("Revisar o escopo e confirmar o início do projeto.");
    await page
      .frameLocator("iframe")
      .getByText("R$ 2.400,00", { exact: false })
      .first()
      .waitFor();
    await screenshot("12-proposta-editor.png");
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Rascunho salvo" })
      .waitFor();
    checks.push("Proposal uses the selected client quote in its preview");
    await go("/dashboard/documentos/relatorios");
    await page
      .getByRole("heading", { name: "Relatórios e propostas", exact: true })
      .waitFor();
    await screenshot("13-biblioteca-documentos.png");
    await go("/dashboard/templates-a4");
    await page.locator("iframe").waitFor();
    await page.frameLocator("iframe").locator(".block-observations").waitFor();
    await page.getByLabel("Observações", { exact: true }).uncheck();
    await page
      .frameLocator("iframe")
      .locator(".block-observations")
      .waitFor({ state: "detached" });
    await page
      .getByRole("button", { name: "Salvar modelo", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Modelo salvo" })
      .waitFor();
    await screenshot("14-modelos-pdf.png");
    checks.push("PDF model blocks update in the shared renderer preview");
    if (postgresFixture) {
      const persisted =
        await postgresFixture.prisma.workspaceVisualSettings.findUnique({
          where: { workspaceId: user.workspaceId },
        });
      assert.equal(
        persisted.published.customization.components.buttonStyle,
        "outline",
      );
      assert.equal(persisted.published.light.sidebar, config.dark.canvas);
      assert.equal(persisted.published.documents.headingSize, 28);
      assert.equal(
        await postgresFixture.prisma.authoredDocument.count({
          where: { workspaceId: user.workspaceId },
        }),
        2,
      );
      checks.push(
        "Browser edits, asset lineage and authored documents persist through real Nest controllers in PostgreSQL",
      );
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "ui-results.json"),
      JSON.stringify(
        {
          checks,
          errors,
          validation: postgresFixture
            ? "Real frontend, Nest branding/assets/authored-document controllers and disposable PostgreSQL. Synthetic authentication and existing business-module fixtures. No production writes."
            : "Built application and shared document renderer, synthetic API responses; no production or database writes.",
          requests: requests.length,
          buildMode: process.argv.includes("--dev")
            ? "development"
            : "production",
          databaseBacked: !!postgresFixture,
          browser: {
            executable: path.basename(executablePath),
            version: browser.version(),
          },
          completedAt: new Date().toISOString(),
          buildId: process.argv.includes("--dev")
            ? null
            : fs
                .readFileSync(
                  path.join(root, "apps/web/.next/BUILD_ID"),
                  "utf8",
                )
                .trim(),
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        checks,
        errors,
        screenshots: output,
        pdfs: pdfOutput,
        persistence: postgresFixture
          ? "PostgreSQL + real Nest branding, file and authored-document controllers; synthetic authentication and existing business-module fixtures"
          : "synthetic API",
      }),
    );
  } catch (error) {
    if (reviewPage)
      await reviewPage
        .screenshot({
          path: path.join(output, "debug-failure.png"),
          fullPage: true,
        })
        .catch(() => {});
    throw error;
  } finally {
    await browser?.close();
    server.kill();
    await postgresFixture?.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
