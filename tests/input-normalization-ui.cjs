// Real built Next.js and Chromium; isolated API fixtures, no production writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("node:net");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const webRequire = createRequire(path.join(root, "apps/web/package.json"));
const { chromium } = createRequire(path.join(root, "apps/worker/package.json"))(
  "playwright",
);
const output = path.join(root, "data/qa/input-normalization");
const v = webRequire("@peanut/validators");

async function main() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const server = spawn(
    process.execPath,
    [
      webRequire.resolve("next/dist/bin/next"),
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    { cwd: path.join(root, "apps/web"), windowsHide: true, stdio: "pipe" },
  );
  let logs = "",
    browser,
    page;
  server.stdout.on("data", (b) => (logs += b));
  server.stderr.on("data", (b) => (logs += b));
  try {
    let ready = false,
      readiness = "";
    for (let i = 0; i < 100; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/login`);
        readiness = String(response.status);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch (error) {
        readiness = String(error.cause || error);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert(ready, logs + "\nReadiness: " + readiness);
    const executablePath = [
      chromium.executablePath(),
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ].find(fs.existsSync);
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() =>
      localStorage.setItem("peanut_token", "synthetic-normalization-token"),
    );
    const saved = [],
      billingSaved = [],
      errors = [];
    let contract = {
      id: "contract",
      clientId: "client",
      number: "CTR-QA",
      title: "Contrato QA",
      type: "PROJECT",
      status: "ACTIVE",
      startDate: "2026-01-01",
      monthlyAmountCents: 10000,
      billingDay: 10,
      billingIssueDay: 5,
      billingIssueTime: "09:00",
      billingAutoIssue: false,
      billingAutoEmail: false,
      billingPaymentMethod: "PIX",
      billingWhatsappNumbers: ["14155552671"],
      billingEmailRecipients: [],
      lineItems: [],
      billingScheduleEvents: [],
    };
    const user = {
      id: "user",
      workspaceId: "workspace",
      name: "Admin QA",
      role: "OWNER",
      timeZone: "America/Sao_Paulo",
    };
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (!url.pathname.includes("/api/v1/"))
        return url.hostname === "127.0.0.1" && url.port === String(port)
          ? route.continue()
          : route.abort();
      const endpoint = url.pathname.split("/api/v1")[1];
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      };
      if (req.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      let result = {};
      if (endpoint === "/auth/me") result = user;
      else if (endpoint === "/auth/refresh")
        result = { user, accessToken: "synthetic-normalization-token" };
      else if (endpoint === "/settings/general")
        result = { timeZone: user.timeZone };
      else if (endpoint === "/settings/visual/active")
        result = { config: null, assets: [], version: 0 };
      else if (endpoint === "/settings/brand")
        result =
          req.method() === "PATCH"
            ? v.workspaceBrandSettingsSchema.parse(req.postDataJSON())
            : {};
      else if (endpoint === "/clients" && req.method() === "POST") {
        saved.push(req.postDataJSON());
        result = { id: "client", ...saved.at(-1) };
      } else if (endpoint === "/clients")
        result = { data: [], meta: { total: 0, totalPages: 0, page: 1 } };
      else if (endpoint === "/contracts/contract") {
        if (req.method() === "PATCH") {
          const normalized = v.contractUpdateSchema.parse(req.postDataJSON());
          billingSaved.push(normalized);
          contract = { ...contract, ...normalized };
        }
        result = contract;
      } else if (endpoint === "/financials/email-templates")
        result = { data: [] };
      return route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const base = `http://127.0.0.1:${port}`;
    await page.goto(base + "/dashboard/clients/new");
    const phone = page.locator("#phone"),
      document = page.locator("#document");
    await phone.pressSequentially("11999999999");
    assert.equal(await phone.inputValue(), "+55 (11) 99999-9999"); // before blur
    await phone.fill("");
    await phone.pressSequentially("55999999999");
    assert.equal(await phone.inputValue(), "+55 (55) 99999-9999");
    await phone.fill("+1 (415) 555-2671");
    assert.equal(v.normalizePhone(await phone.inputValue()), "+14155552671");
    await phone.fill("");
    await phone.pressSequentially("0014155552671");
    assert.equal(v.normalizePhone(await phone.inputValue()), "+14155552671");
    await phone.fill("");
    await phone.pressSequentially("1133334444");
    assert.equal(await phone.inputValue(), "+55 (11) 3333-4444");
    // Mid-string insertion and replacement keep the caret near the edit.
    await phone.evaluate((el) => el.setSelectionRange(9, 10));
    await phone.pressSequentially("4");
    assert.equal(await phone.inputValue(), "+55 (11) 4333-4444");
    assert.equal(await phone.evaluate((el) => el.selectionStart), 10);
    await phone.press("ControlOrMeta+A");
    await phone.press("Backspace");
    assert.equal(await phone.inputValue(), "");
    await phone.fill("11999999999");
    await document.pressSequentially("11222333000181");
    assert.equal(await document.inputValue(), "11.222.333/0001-81");
    // Backspace over a mask separator must delete a digit instead of getting stuck.
    await document.evaluate((el) => el.setSelectionRange(3, 3));
    await document.press("Backspace");
    assert.equal(
      (await document.inputValue()).replace(/\D/g, ""),
      "1222333000181",
    );
    await document.fill("11222333000181");
    await page.locator("#email").fill("CONTACT@EXAMPLE.COM");
    assert.equal(
      await page.locator("#email").inputValue(),
      "contact@example.com",
    );
    await page.locator("#legalName").fill("  Empresa   São João  ");
    await page.locator("#website").fill("EXAMPLE.COM/Path?Token=ABC");
    await page.locator("#website").blur();
    assert.equal(
      await page.locator("#website").inputValue(),
      "https://example.com/Path?Token=ABC",
    );
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({
      path: path.join(output, "client-desktop.png"),
      fullPage: true,
    });
    await page.locator("button[type=submit]").click();
    await page.waitForURL("**/dashboard/clients");
    assert.equal(saved.length, 1);
    assert.equal(saved[0].phone, "+5511999999999");
    assert.equal(saved[0].email, "contact@example.com");
    assert.equal(saved[0].document, "11222333000181");
    assert.equal(saved[0].legalName, "Empresa São João");
    // CPF mode, paste, mobile keyboard and responsive view.
    await page.goto(base + "/dashboard/clients/new");
    await page.getByLabel("Tipo de cliente *").selectOption("NATURAL_PERSON");
    await document.fill("52998224725");
    assert.equal(await document.inputValue(), "529.982.247-25");
    assert.equal(await phone.getAttribute("type"), "tel");
    assert.equal(await phone.getAttribute("inputmode"), "tel");
    await page.setViewportSize({ width: 390, height: 844 });
    await phone.fill("+351912345678");
    assert.equal(v.normalizePhone(await phone.inputValue()), "+351912345678");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(output, "client-mobile.png"),
      fullPage: true,
    });
    // Free address fields apply CEP formatting while typing and preserve accents.
    await page.goto(base + "/dashboard/configuracoes");
    await page.getByRole("button", { name: "EMPRESA", exact: true }).click();
    const address = page.locator('textarea[placeholder^="Rua, Número"]');
    await address.fill("  Rua   São João, 12, CEP 01234567 ");
    assert((await address.inputValue()).includes("01234-567"));
    await address.blur();
    assert.equal(await address.inputValue(), "Rua São João, 12, CEP 01234-567");
    // Stored WhatsApp digits already include DDI: never reinterpret +1 as BR.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "/dashboard/contracts/contract");
    await page
      .getByRole("button", { name: "Recorrência", exact: true })
      .click();
    const phones = page.getByLabel(
      "WhatsApp para envio manual (com DDI, um por linha)",
    );
    assert.equal(v.normalizePhone(await phones.inputValue()), "+14155552671");
    await phones.fill("11999999999\n+14155552671");
    assert.equal(
      await phones.inputValue(),
      "+55 (11) 99999-9999\n+1 415 555 2671",
    );
    await page
      .getByLabel("Emails do financeiro e diretores (um por linha)")
      .fill("FINANCE@EXAMPLE.COM\nDIRECTOR@EXAMPLE.COM");
    await page
      .getByRole("button", { name: "Salvar contrato", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Contrato salvo" })
      .waitFor();
    assert.deepEqual(billingSaved[0].billingWhatsappNumbers, [
      "5511999999999",
      "14155552671",
    ]);
    assert.deepEqual(billingSaved[0].billingEmailRecipients, [
      "finance@example.com",
      "director@example.com",
    ]);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "result.json"),
      JSON.stringify(
        {
          passed: true,
          browser: "Chromium",
          api: "synthetic",
          productionWrites: false,
          clientPayload: saved[0],
          checks: [
            "progressive phone/CNPJ/CPF",
            "DDD 55",
            "foreign DDI",
            "00 prefix",
            "paste",
            "caret",
            "backspace over separators",
            "clear",
            "email",
            "URL path casing",
            "CEP in address",
            "canonical submit",
            "mobile",
            "billing lists and existing foreign numbers",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      "Input normalization UI passed; screenshots and evidence: " + output,
    );
  } finally {
    if (page && process.exitCode) {
      fs.mkdirSync(output, { recursive: true });
      await page
        .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
        .catch(() => {});
    }
    await browser?.close();
    server.kill();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
