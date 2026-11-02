const test = require("node:test"),
  assert = require("node:assert/strict");
const { createFixture } = require("./branding-fixture.cjs");
const { createRequire } = require("node:module"),
  path = require("node:path");
const req = createRequire(path.resolve("apps/api/package.json"));
const sharp = req("sharp");
const {
  PublicBrandService,
} = require("../apps/api/dist/settings/public-brand.service");
const {
  publicBrandAssetPath,
  publicBrandAssetUrl,
} = require("../packages/utils/dist");
const {
  publishedEmailAppearance,
  resolveEmailImages,
  renderWorkspaceBillingEmail,
} = require("../packages/db/dist");
let f, oldBinding;
test.before(async () => {
  oldBinding = process.env.PUBLIC_BRAND_WORKSPACE_ID;
  f = await createFixture();
});
test.after(async () => {
  if (oldBinding === undefined) delete process.env.PUBLIC_BRAND_WORKSPACE_ID;
  else process.env.PUBLIC_BRAND_WORKSPACE_ID = oldBinding;
  await f?.close();
});
async function prepared() {
  const tenant = await f.tenant("Public Brand QA");
  const logo = await f.asset(
    tenant.users.OWNER,
    "Signature",
    '<ns0:svg xmlns:ns0="http://www.w3.org/2000/svg" viewBox="0 0 600 140"><ns0:rect x="10" y="10" width="580" height="120" fill="#0968c4"/></ns0:svg>',
  );
  const config = f.config("Public Brand QA");
  config.subtitle = "Identity QA";
  config.assets.logoLight = logo.id;
  config.assets.iconLight = logo.id;
  config.login.enabled = true;
  config.login.layout = "split";
  config.email.enabled = true;
  config.email.imageAssetIds = [logo.id];
  config.documents.footer = "PRIVATE_FOOTER_NOT_PUBLIC";
  let response = await f.request(
    tenant.users.OWNER,
    "PUT",
    "/settings/visual/draft",
    { revision: 0, config },
  );
  assert.equal(response.status, 200, response.body);
  return { tenant, logo, config };
}
async function publish(data) {
  const r = await f.request(
    data.tenant.users.OWNER,
    "POST",
    "/settings/visual/publish",
    { revision: 1 },
  );
  assert.equal(r.status, 201, r.body);
  return r.json();
}

test("PNG preparation stays private until an atomic publication; stale writers cannot expose it", async () => {
  const data = await prepared();
  const ids = await f.app
    .get(PublicBrandService)
    .prepareConfig(data.tenant.ws.id, data.tenant.users.OWNER.id, data.config);
  assert.equal(ids.length, 2);
  const rows = await f.prisma.publicBrandAsset.findMany({
    where: { id: { in: ids } },
  });
  for (const row of rows) {
    assert.equal(row.publishedAt, null);
    assert.equal(
      (
        await f.request(
          null,
          "GET",
          publicBrandAssetPath(row).replace("/api/v1", ""),
        )
      ).status,
      404,
    );
  }
  assert.equal(
    (
      await f.request(
        data.tenant.users.OWNER,
        "POST",
        "/settings/visual/publish",
        { revision: 0 },
      )
    ).status,
    409,
  );
  const published = await publish(data);
  assert.equal(published.publicAssets.length, 2);
  for (const row of rows) {
    const served = await f.request(
      null,
      "GET",
      publicBrandAssetPath(row).replace("/api/v1", ""),
    );
    assert.equal(served.status, 200, served.body);
    assert.equal(served.headers["content-type"], "image/png");
    assert.match(served.headers["cache-control"], /immutable/);
    assert.deepEqual(
      served.raw.subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    const metadata = await sharp(served.raw).metadata();
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
    assert(metadata.width <= 1024 && metadata.height <= 1024);
  }
  assert.equal(
    (await f.request(null, "GET", data.logo.url.replace("/api/v1", ""))).status,
    401,
  );
  assert.equal(
    (
      await f.prisma.fileObject.findUnique({
        where: { id: data.logo.url.split("/").pop() },
      })
    ).visibility,
    "PRIVATE",
  );
});

test("public login is explicitly bound in shared installations and contains no private configuration", async () => {
  const data = await prepared();
  await publish(data);
  await f.tenant("Other company");
  delete process.env.PUBLIC_BRAND_WORKSPACE_ID;
  assert.equal(
    (await f.request(null, "GET", "/public/branding/login")).json().brand,
    null,
  );
  process.env.PUBLIC_BRAND_WORKSPACE_ID = data.tenant.ws.id;
  const response = await f.request(
    null,
    "GET",
    "/public/branding/login?workspaceId=someone-else",
  );
  assert.equal(response.status, 200, response.body);
  const brand = response.json().brand;
  assert.equal(brand.name, data.config.name);
  assert.equal(brand.login.layout, "split");
  assert(brand.logos.logoLight.startsWith("/api/v1/public/brand-assets/"));
  assert(!response.body.includes("PRIVATE_FOOTER_NOT_PUBLIC"));
  assert(!response.body.includes(data.tenant.ws.id));
  assert(!response.body.includes("companyEmail"));
  assert.equal(brand.documents, undefined);
  assert.equal(brand.email, undefined);
  assert.equal(response.headers["cache-control"], "no-store");
});

test("another company cannot publish an image, insert its public image into a template, or read the original", async () => {
  const data = await prepared();
  const published = await publish(data);
  const foreign = await f.tenant("Foreign");
  const bad = f.config();
  bad.email.logoAssetId = data.logo.id;
  assert.equal(
    (
      await f.request(foreign.users.OWNER, "PUT", "/settings/visual/draft", {
        revision: 0,
        config: bad,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        foreign.users.OWNER,
        "GET",
        data.logo.url.replace("/api/v1", ""),
      )
    ).status,
    404,
  );
  const url = published.publicAssets[0].url;
  const body = {
    name: "Unapproved image",
    subject: "Hello",
    body: `![Other company](${url})`,
    isDefault: false,
  };
  const denied = await f.request(
    foreign.users.FINANCIAL,
    "POST",
    "/financials/email-templates",
    body,
  );
  assert.equal(denied.status, 400, denied.body);
  assert.equal(
    (
      await f.request(
        foreign.users.FINANCIAL,
        "POST",
        "/settings/visual/publish",
        { revision: 0 },
      )
    ).status,
    403,
  );
});

test("template preview, frozen delivery rendering and public image picker use the same published identity", async () => {
  const data = await prepared();
  await publish(data);
  const images = (
    await f.request(
      data.tenant.users.FINANCIAL,
      "GET",
      "/financials/email-images",
    )
  ).json();
  assert.equal(images.length, 1);
  const content = {
    subject: "Fatura {fatura} · {empresa}",
    body: `Olá, {cliente}.\n\n![Imagem](${images[0].url})\n\n**Total: {total}**`,
  };
  const values = {
    cliente: "Cliente Demonstração",
    empresa: "Empresa Demonstração",
    contrato: "CTR-DEMO",
    competencia: "2026-11",
    fatura: "FAT-DEMO",
    total: "R$ 1.250,00",
    vencimento: "10/11/2026",
    fuso: "America/Sao_Paulo",
  };
  const preview = await f.request(
    data.tenant.users.FINANCIAL,
    "POST",
    "/financials/email-templates/preview",
    content,
  );
  assert.equal(preview.status, 201, preview.body);
  const appearance = await publishedEmailAppearance(
    f.prisma,
    data.tenant.ws.id,
  );
  assert(appearance.logoUrl.startsWith("https://branding.example.invalid/"));
  const emailImages = await resolveEmailImages(
    f.prisma,
    data.tenant.ws.id,
    content.body,
  );
  const frozen = { ...content, appearance, emailImages };
  assert.deepEqual(
    preview.json(),
    await renderWorkspaceBillingEmail(
      f.prisma,
      data.tenant.ws.id,
      frozen,
      values,
    ),
  );
  assert(preview.json().html.includes("<img"));
  assert(
    preview
      .json()
      .html.includes("img-src data: https://branding.example.invalid"),
  );
  const next = structuredClone(data.config);
  next.name = "Rebranded";
  next.email.enabled = false;
  next.login.enabled = false;
  await f.request(data.tenant.users.OWNER, "PUT", "/settings/visual/draft", {
    revision: 2,
    config: next,
  });
  assert.equal(
    (
      await f.request(
        data.tenant.users.OWNER,
        "POST",
        "/settings/visual/publish",
        { revision: 3 },
      )
    ).status,
    201,
  );
  assert.equal(
    await publishedEmailAppearance(f.prisma, data.tenant.ws.id),
    null,
  );
  assert.deepEqual(
    preview.json(),
    await renderWorkspaceBillingEmail(
      f.prisma,
      data.tenant.ws.id,
      frozen,
      values,
    ),
  );
  const pngPath = new URL(appearance.logoUrl).pathname.replace("/api/v1", "");
  assert.equal((await f.request(null, "GET", pngPath)).status, 200);
});

test("private draft email preview embeds a PNG without publishing any additional image", async () => {
  const data = await prepared();
  const before = await f.prisma.publicBrandAsset.count({
    where: { workspaceId: data.tenant.ws.id },
  });
  const response = await f.request(
    data.tenant.users.OWNER,
    "POST",
    "/settings/visual/email-preview",
    { config: data.config },
  );
  assert.equal(response.status, 201, response.body);
  assert(response.json().html.includes("data:image/png;base64,"));
  assert.equal(
    await f.prisma.publicBrandAsset.count({
      where: { workspaceId: data.tenant.ws.id },
    }),
    before,
  );
  assert.equal(
    (
      await f.request(
        data.tenant.users.READ_ONLY,
        "POST",
        "/settings/visual/email-preview",
        { config: data.config },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        null,
        "GET",
        "/public/brand-assets/not-a-uuid/" + "a".repeat(64) + ".png",
      )
    ).status,
    404,
  );
});

test("large decoded PNGs are resized below the public storage limit", async () => {
  const tenant = await f.tenant("Photo QA");
  const pixels = Buffer.alloc(1024 * 1024 * 3);
  let state = 391;
  for (let i = 0; i < pixels.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    pixels[i] = state & 255;
  }
  const input = await sharp(pixels, {
    raw: { width: 1024, height: 1024, channels: 3 },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  assert(input.length < 2 * 1024 * 1024);
  const uploaded = await f.request(
    tenant.users.OWNER,
    "POST",
    "/settings/visual/assets",
    {
      title: "Synthetic photo",
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      data: input.toString("base64"),
    },
  );
  assert.equal(uploaded.status, 201, uploaded.body);
  const result = await f.app
    .get(PublicBrandService)
    .png(tenant.ws.id, uploaded.json().id);
  assert(result.data.length < 2 * 1024 * 1024);
  assert(result.info.width <= 700 && result.info.height <= 700);
});
