// Real compiled frontend; synthetic authentication and module APIs. No real DB,
// customers, uploads, email or production requests. PG suites cover persistence.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawn, spawnSync } = require("node:child_process"),
  { createRequire } = require("node:module"),
  { createServer } = require("node:net");
const root = path.resolve(__dirname, ".."),
  webRequire = createRequire(path.join(root, "apps/web/package.json"));
const { chromium } = createRequire(path.join(root, "apps/worker/package.json"))(
  "playwright",
);
const { DEFAULT_VISUAL_CONFIG, normalizeVisualConfig, contrastRatio } =
  webRequire("@peanut/validators");
const output = path.join(root, "data/qa/circuito-release");
fs.mkdirSync(output, { recursive: true });
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const companySvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 70"><rect x="5" y="5" width="60" height="60" rx="6" fill="#C46520"/><text x="82" y="47" font-family="Arial" font-size="28" fill="#14233D">Horizonte</text></svg>';
const user = {
  id: "demo-owner",
  workspaceId: "demo-workspace",
  name: "Marina Demo",
  role: "OWNER",
  timeZone: "America/Sao_Paulo",
};
let kind = "product",
  mode = "light",
  empty = false,
  company = structuredClone(DEFAULT_VISUAL_CONFIG),
  draft = structuredClone(DEFAULT_VISUAL_CONFIG);
company.name = "Horizonte TI";
company.font = "source-sans-3";
company.assets = { logoLight: id, logoDark: id, iconLight: id, iconDark: id };
delete company.media; // exact legacy read scenario
company = normalizeVisualConfig(company);
company.theme = "light";
const companyAssets = [
  {
    id,
    url: "/api/v1/files/" + id,
    title: "Marca Horizonte",
    mimeType: "image/svg+xml",
  },
];
const selected = () => {
  const c = structuredClone(
    kind === "product" ? DEFAULT_VISUAL_CONFIG : company,
  );
  c.theme = mode;
  return c;
};
const evidence = {
  date: "2026-11-03",
  auth: "synthetic",
  businessData: "fixtures",
  checks: [],
  screens: [],
  layouts: [],
  errors: [],
  requests: [],
};
(async () => {
  const probe = createServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  const server = spawn(
    process.execPath,
    [
      webRequire.resolve("next/dist/bin/next"),
      "start",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    { cwd: path.join(root, "apps/web"), windowsHide: true, stdio: "pipe" },
  );
  let logs = "",
    browser;
  server.stdout.on("data", (b) => (logs += b));
  server.stderr.on("data", (b) => (logs += b));
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if (
          (
            await fetch(`http://127.0.0.1:${port}/login`, {
              signal: AbortSignal.timeout(2000),
            })
          ).ok
        ) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert(ready, logs);
    const executablePath = [
      chromium.executablePath(),
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ].find(fs.existsSync);
    browser = await chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "light",
    });
    const origin = `http://127.0.0.1:${port}`;
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (!url.pathname.includes("/api/v1/"))
        return url.hostname === "127.0.0.1" && url.port === String(port)
          ? route.continue()
          : route.abort();
      const endpoint = url.pathname.split("/api/v1")[1];
      evidence.requests.push({
        endpoint,
        method: request.method(),
        intercepted: true,
      });
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      if (endpoint === "/files/" + id)
        return route.fulfill({
          headers,
          contentType: "image/svg+xml",
          body: companySvg,
        });
      let result = {};
      if (endpoint === "/auth/me") result = user;
      else if (endpoint === "/setup/status")
        result = { initialized: true, needsSetup: false };
      else if (endpoint === "/public/branding/login") result = { brand: null };
      else if (endpoint === "/settings/visual/active")
        result = {
          config: selected(),
          assets: kind === "company" ? companyAssets : [],
          version: kind === "company" ? 1 : 0,
          source: kind === "company" ? "company" : "product",
        };
      else if (endpoint === "/settings/visual")
        result = {
          draft,
          published: kind === "company" ? company : null,
          revision: 0,
          publishedVersion: kind === "company" ? 1 : 0,
          assets: companyAssets,
          versions: [],
          publicAssets: [],
          publicLoginAvailable: true,
        };
      else if (endpoint === "/settings/visual/draft") {
        draft = request.postDataJSON().config;
        result = {
          draft,
          published: null,
          revision: 1,
          publishedVersion: 0,
          assets: companyAssets,
          versions: [],
          publicAssets: [],
          publicLoginAvailable: true,
        };
      } else if (endpoint === "/settings/visual/publish") {
        company = structuredClone(draft);
        kind = "company";
        result = {
          draft,
          published: company,
          revision: 2,
          publishedVersion: 1,
          assets: companyAssets,
          versions: [],
          publicAssets: [],
          publicLoginAvailable: true,
        };
      } else if (endpoint === "/settings/visual/preview")
        return route.fulfill({
          headers,
          contentType: "text/html",
          body: "<html><body>Documento de demonstração</body></html>",
        });
      else if (endpoint === "/settings/general")
        result = { timeZone: user.timeZone };
      else if (endpoint === "/users") result = [user];
      else if (endpoint === "/tickets")
        result = {
          data: empty
            ? []
            : [
                {
                  id: "ticket-demo",
                  number: "CH-1042",
                  title: "VPN indisponível na filial",
                  priority: "HIGH",
                  status: "OPEN",
                  client: { tradeName: "Estúdio Aurora" },
                  assignedTo: { name: "Marina Demo" },
                  createdAt: "2026-11-03T11:00:00Z",
                  updatedAt: "2026-11-03T11:30:00Z",
                },
              ],
          meta: { total: empty ? 0 : 12, page: 1, totalPages: 1 },
        };
      else if (endpoint === "/clients")
        result = {
          data: [],
          meta: { total: empty ? 0 : 24, page: 1, totalPages: 1 },
        };
      else if (endpoint === "/assets")
        result = { data: [], meta: { total: 148, page: 1, totalPages: 1 } };
      else if (endpoint === "/contracts")
        result = { data: [], meta: { total: 18, page: 1, totalPages: 1 } };
      return route.fulfill({
        headers,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => evidence.errors.push(e.message));
    async function wait() {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((i) => i.decode().catch(() => {})),
        );
      });
      await page.waitForTimeout(500);
    }
    async function assertContrast() {
      const controls = await page
        .locator("main :is(button[data-ui-button],select,[data-ui-badge])")
        .evaluateAll((nodes) =>
          nodes
            .filter((el) => !el.disabled && el.getClientRects().length)
            .map((el) => {
              const s = getComputedStyle(el);
              let parent = el,
                bg = s.backgroundColor;
              while (
                bg === "rgba(0, 0, 0, 0)" &&
                (parent = parent.parentElement)
              )
                bg = getComputedStyle(parent).backgroundColor;
              return {
                label: el.textContent.trim(),
                color: s.color,
                background: bg,
              };
            }),
        );
      const hex = (rgb) =>
        "#" +
        rgb
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
          .join("");
      for (const control of controls) {
        control.ratio = contrastRatio(
          hex(control.color),
          hex(control.background),
        );
        assert(control.ratio >= 4.5, JSON.stringify(control));
      }
      (evidence.controls ||= []).push(...controls);
    }
    async function capture(name, width = 1440) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await wait();
      await page.screenshot({
        path: path.join(output, name + ".png"),
        fullPage: true,
      });
      evidence.screens.push(name + ".png");
      const l = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      evidence.layouts.push({ name, width, ...l, pass: l.scroll <= l.client });
    }
    await page.goto(origin + "/login");
    await page.locator("#email").waitFor();
    await capture("login");
    assert(
      (
        await page.locator(".brand-login-hero img").first().getAttribute("src")
      ).includes("/brand/peanut-os/v1/logo-dark.svg"),
    );
    await capture("login-mobile", 390);
    await page.emulateMedia({ colorScheme: "dark" });
    await capture("login-dark");
    await capture("login-dark-mobile", 390);
    await page.emulateMedia({ colorScheme: "light" });
    evidence.checks.push(
      "Neutral login uses selected identity, clear/dark schemes and responsive artwork",
    );
    await page.evaluate(() =>
      localStorage.setItem("peanut_token", "synthetic-circuito-token"),
    );
    for (const theme of ["light", "dark"]) {
      mode = theme;
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(origin + "/dashboard");
      await page.locator('html[data-brand-source="product"]').waitFor();
      await page.locator(".brand-expanded img").waitFor();
      await capture("dashboard-" + theme);
      await capture("dashboard-" + theme + "-390", 390);
      await capture("dashboard-" + theme + "-320", 320);
      assert.equal(
        await page.locator("html").getAttribute("data-visual-scheme"),
        theme,
      );
    }
    evidence.checks.push(
      "Default logo and font, clear/dark schemes, 320/390/1440 layouts",
    );
    mode = "light";
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin + "/dashboard/tickets");
    await page.getByText("VPN indisponível na filial").first().waitFor();
    await capture("tickets");
    await assertContrast();
    empty = true;
    await page.reload();
    await page.locator(".brand-empty-illustration").waitFor();
    await capture("empty-first-use");
    assert(
      (
        await page.locator(".brand-empty-illustration").getAttribute("src")
      ).includes("empty-chamados-light.svg"),
    );
    await assertContrast();
    evidence.checks.push(
      "Computed text contrast of active controls meets 4.5:1",
    );
    await page.getByPlaceholder(/Buscar por/).fill("inexistente");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page.getByText("Nenhum resultado com estes filtros.").waitFor();
    assert.equal(await page.locator(".brand-empty-illustration").count(), 0);
    evidence.checks.push(
      "First-use illustration disappears for search with no results",
    );
    kind = "company";
    await page.goto(origin + "/dashboard");
    await page.locator('html[data-brand-source="company"]').waitFor();
    await page.locator('.brand-expanded img[src^="blob:"]').waitFor();
    assert.equal(
      await page.locator('img[src^="/brand/peanut-os/"]').count(),
      0,
    );
    await page.waitForFunction(() =>
      document.querySelector('link[rel="icon"]')?.href.startsWith("blob:"),
    );
    assert.equal(
      await page
        .locator("html")
        .evaluate((h) =>
          getComputedStyle(h.querySelector("body")).fontFamily.includes(
            "Source Sans 3",
          ),
        ),
      true,
    );
    await capture("legacy-company");
    evidence.checks.push(
      "Legacy company logo/font/favicon preserved without product images",
    );
    kind = "product";
    draft = structuredClone(DEFAULT_VISUAL_CONFIG);
    await page.goto(
      origin + "/dashboard/configuracoes/aparencia?secao=empresa",
    );
    await page
      .getByRole("heading", { name: "Arquivos, favicon e ilustrações" })
      .waitFor();
    await capture("appearance");
    await capture("appearance-390", 390);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByLabel(
        "Usar logos e símbolos originais Peanut OS quando não houver imagem própria",
      )
      .uncheck();
    await page
      .getByLabel("Arte do login", { exact: true })
      .selectOption("none");
    await page
      .getByLabel("Ilustrações de primeiro uso", { exact: true })
      .selectOption("none");
    await page.getByLabel("Favicon da empresa").selectOption(id);
    await page.getByRole("tab", { name: "Emails", exact: true }).click();
    await page
      .getByLabel("Aplicar logo e cores aos emails", { exact: true })
      .uncheck();
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await page.waitForFunction(() => document.querySelector("button") !== null);
    await page
      .getByRole("button", { name: "Aplicar à empresa", exact: true })
      .click();
    await page.locator('html[data-brand-source="company"]').waitFor();
    assert.equal(draft.media.productIdentity, false);
    assert.equal(draft.media.emptyStates.mode, "none");
    assert.equal(draft.media.favicon, id);
    await page.waitForFunction(() =>
      document.querySelector('link[rel="icon"]')?.href.startsWith("blob:"),
    );
    await page.goto(origin + "/dashboard/tickets");
    await page.getByText("Nenhum chamado", { exact: false }).first().waitFor();
    assert.equal(await page.locator(".brand-empty-illustration").count(), 0);
    evidence.checks.push(
      "Appearance draft/publication can remove product assets and replace favicon",
    );
    // Public portfolio screenshots come from this real compiled frontend, not mockups.
    fs.mkdirSync(path.join(root, "docs/assets"), { recursive: true });
    for (const [from, to] of [
      ["login", "login"],
      ["dashboard-light", "dashboard"],
      ["tickets", "chamados"],
      ["appearance", "aparencia"],
    ])
      fs.copyFileSync(
        path.join(output, from + ".png"),
        path.join(root, "docs/assets/circuito-" + to + ".png"),
      );
  } finally {
    if (browser) await browser.close();
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else server.kill("SIGTERM");
    fs.writeFileSync(
      path.join(output, "ui-results.json"),
      JSON.stringify(evidence, null, 2),
    );
  }
  assert.equal(evidence.errors.length, 0, evidence.errors.join("\n"));
  assert.equal(
    evidence.layouts.filter((l) => !l.pass).length,
    0,
    JSON.stringify(evidence.layouts.filter((l) => !l.pass)),
  );
  console.log(
    JSON.stringify(
      {
        checks: evidence.checks,
        screens: evidence.screens,
        errors: evidence.errors,
        layoutPassed: true,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
