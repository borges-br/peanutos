const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  PRODUCT_LOGO_DATA_URI,
  brandMediaAssetIds,
} = require("../packages/utils/dist");
const {
  getPublishedDocumentIdentity,
  publishedEmailAppearance,
} = require("../packages/db/dist");
const { assertStaticSvg } = require("../apps/api/dist/storage/static-svg");
const root = path.resolve(__dirname, "../apps/web/public/brand/peanut-os/v1");

test("bundled brand files are static SVG and API/worker logo matches the web asset exactly", () => {
  for (const f of fs.readdirSync(root).filter((f) => f.endsWith(".svg")))
    assertStaticSvg(fs.readFileSync(path.join(root, f), "utf8"));
  const embedded = Buffer.from(PRODUCT_LOGO_DATA_URI.split(",")[1], "base64");
  assert.equal(
    embedded.toString().replace(/\r\n/g, "\n").trim(),
    fs
      .readFileSync(path.join(root, "logo-light.svg"), "utf8")
      .replace(/\r\n/g, "\n")
      .trim(),
  );
  assert(!embedded.toString().includes("<image"));
});

test("document fallback uses Circuito only when there is no previous company identity", async () => {
  const workspace = {
    brandName: null,
    logoFileObjectId: null,
    primaryColorHex: null,
  };
  const db = {
    workspaceVisualSettings: { findUnique: async () => null },
    workspace: { findUnique: async () => workspace },
  };
  const product = await getPublishedDocumentIdentity(db, "workspace");
  assert.equal(product.publicName, "Peanut OS");
  assert.equal(product.logoUrl, PRODUCT_LOGO_DATA_URI);
  assert.equal(product.visual.font, "geist");
  workspace.brandName = "Marca existente";
  assert.equal(await getPublishedDocumentIdentity(db, "workspace"), null);
  workspace.brandName = null;
  workspace.logoFileObjectId = "existing-logo";
  assert.equal(await getPublishedDocumentIdentity(db, "workspace"), null);
});

test("email default respects legacy companies and an explicitly disabled published email identity", async () => {
  const previous = process.env.NEXT_PUBLIC_WEB_URL;
  process.env.NEXT_PUBLIC_WEB_URL = "https://demo.example.invalid";
  const workspace = { brandName: null, logoFileObjectId: null };
  let published = null;
  const db = {
    workspaceVisualSettings: { findUnique: async () => ({ published }) },
    workspace: { findUnique: async () => workspace },
  };
  try {
    const product = await publishedEmailAppearance(db, "workspace");
    assert.match(product.logoUrl, /\/brand\/peanut-os\/v1\/logo-light.png$/);
    workspace.brandName = "Outra empresa";
    assert.equal(await publishedEmailAppearance(db, "workspace"), null);
    published = { email: { enabled: false }, media: { productIdentity: true } };
    assert.equal(await publishedEmailAppearance(db, "workspace"), null);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_WEB_URL;
    else process.env.NEXT_PUBLIC_WEB_URL = previous;
  }
});

test("the new media reference collector covers every custom slot without treating built-in mode names as assets", () => {
  assert.deepEqual(
    brandMediaAssetIds({
      media: {
        productIdentity: true,
        loginArtwork: { mode: "product" },
        emptyStates: { mode: "product" },
      },
    }),
    [],
  );
  assert.deepEqual(
    new Set(
      brandMediaAssetIds({
        media: {
          favicon: "favicon",
          loginArtwork: { light: "hero", dark: "hero" },
          emptyStates: {
            images: { clients: { light: "first", dark: "second" } },
          },
        },
      }),
    ),
    new Set(["favicon", "hero", "first", "second"]),
  );
});
