const test = require("node:test"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module"),
  path = require("node:path");
const {
  visualConfigSchema,
  DEFAULT_VISUAL_CONFIG,
  visualIssues,
  authoredDocumentSchema,
  contrastRatio,
  updateDocumentTemplateSettingSchema,
  normalizeVisualConfig,
  applyVisualPreset,
  documentVisualConfig,
  surfaceScheme,
} = createRequire(path.resolve("apps/web/package.json"))("@peanut/validators");
const { renderEditorialDocument } = require("../packages/documents/dist");
test("configuration only accepts supported tokens, bounded sizes and asset UUIDs", () => {
  assert(visualConfigSchema.safeParse(DEFAULT_VISUAL_CONFIG).success);
  assert(
    !visualConfigSchema.safeParse({
      ...DEFAULT_VISUAL_CONFIG,
      css: "body{display:none}",
    }).success,
  );
  assert(
    !visualConfigSchema.safeParse({
      ...DEFAULT_VISUAL_CONFIG,
      navigation: { ...DEFAULT_VISUAL_CONFIG.navigation, sidebarWidth: 900 },
    }).success,
  );
  assert(
    !visualConfigSchema.safeParse({
      ...DEFAULT_VISUAL_CONFIG,
      assets: {
        ...DEFAULT_VISUAL_CONFIG.assets,
        logoLight: "https://example.invalid",
      },
    }).success,
  );
});
test("contrast checks use exact luminance ratios and reject unreadable themes", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(visualIssues(DEFAULT_VISUAL_CONFIG).length, 0);
  const c = structuredClone(DEFAULT_VISUAL_CONFIG);
  c.light.text = c.light.surface;
  assert(visualIssues(c).some((s) => s.includes("texto/superfície")));
  c.navigation = {
    ...c.navigation,
    mode: "expanded",
    logoWidth: 280,
    sidebarWidth: 200,
  };
  assert(visualIssues(c).some((s) => s.includes("sidebar")));
});
test("document schema bounds content and requires a tenant-resolved client identifier", () => {
  const input = {
    kind: "REPORT",
    title: "Relatório",
    clientId: "not-a-uuid",
    project: "",
    sections: [{ title: "Contexto", body: "Texto" }],
  };
  assert(!authoredDocumentSchema.safeParse(input).success);
});
test("PDF preview settings cannot repeat blocks or expand a layout without bounds", () => {
  assert(
    !updateDocumentTemplateSettingSchema.safeParse({
      blockOrder: Array(100).fill("logo"),
    }).success,
  );
  assert(
    !updateDocumentTemplateSettingSchema.safeParse({
      blockOrder: ["logo", "logo"],
    }).success,
  );
});
test("editorial renderer escapes user content and embeds the licensed fonts with print margins", () => {
  const html = renderEditorialDocument({
    title: "<script>unsafe</script>",
    kind: "REPORT",
    number: "QA",
    date: "30/10/2026",
    status: "DRAFT",
    project: "Teste",
    company: { name: "Empresa & Filhos" },
    client: "Cliente",
    sections: [{ title: "<img>", body: "<script>alert(1)</script>\nTexto" }],
    visual: { ...DEFAULT_VISUAL_CONFIG.documents, font: "source-sans-3" },
  });
  assert(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /data:font\/ttf;base64/);
  assert.match(html, /@page\{margin:20mm/);
  assert.match(html, /Empresa &amp; Filhos/);
});
test("older v1 identities acquire new controls without mutating the saved version", () => {
  const old = structuredClone(DEFAULT_VISUAL_CONFIG);
  delete old.customization;
  for (const mode of ["light", "dark"])
    for (const key of [
      "sidebarText",
      "sidebarMuted",
      "sidebarAction",
      "sidebarOnAction",
    ])
      delete old[mode][key];
  for (const key of ["font", "headingFont", "bodySize", "headingSize"])
    delete old.documents[key];
  const upgraded = normalizeVisualConfig(old);
  assert.equal(upgraded.customization.components.fieldHeight, 44);
  assert.equal(upgraded.documents.font, "inherit");
  assert.equal(documentVisualConfig(upgraded).font, old.font);
  assert.equal(upgraded.light.sidebarText, null);
  assert(!("customization" in old));
  assert(
    !visualConfigSchema.safeParse({
      ...upgraded,
      customization: { ...upgraded.customization, script: "alert(1)" },
    }).success,
  );
});
test("visual presets preserve the company, artwork, palettes and document identity", () => {
  const original = structuredClone(DEFAULT_VISUAL_CONFIG);
  original.name = "Outra marca";
  original.assets.iconLight = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const snapshot = structuredClone(original);
  for (const preset of ["essential", "institutional", "operational"]) {
    const next = applyVisualPreset(original, preset);
    for (const key of [
      "name",
      "subtitle",
      "font",
      "theme",
      "assets",
      "light",
      "dark",
      "documents",
      "navigation",
    ])
      assert.deepEqual(next[key], original[key]);
    assert.equal(visualIssues(next).length, 0);
  }
  assert.deepEqual(original, snapshot);
});
test("independent sidebar colors use their own contrast and actual logo surface", () => {
  const c = structuredClone(DEFAULT_VISUAL_CONFIG);
  const dark = c.dark;
  Object.assign(c.light, {
    sidebar: dark.canvas,
    sidebarText: dark.text,
    sidebarMuted: dark.muted,
    sidebarAction: dark.action,
    sidebarOnAction: dark.onAction,
  });
  assert.equal(visualIssues(c).length, 0);
  assert.equal(surfaceScheme(c.light.sidebar), "dark");
  assert.equal(surfaceScheme(c.light.surface), "light");
  c.light.sidebarText = c.light.sidebar;
  assert(visualIssues(c).some((i) => i.includes("texto/sidebar")));
});
test("document typography resolves inheritance and embeds both chosen font families", () => {
  const c = structuredClone(DEFAULT_VISUAL_CONFIG);
  c.font = "source-sans-3";
  c.documents.headingFont = "geist";
  c.documents.bodySize = 12;
  c.documents.headingSize = 30;
  const { documentIdentityCss } = require("../packages/documents/dist");
  const css = documentIdentityCss(documentVisualConfig(c));
  assert.match(css, /font-family:'Source Sans 3';font-style:normal/);
  assert.match(css, /font-family:'Geist';font-style:normal/);
  assert.equal((css.match(/data:font\/ttf;base64/g) || []).length, 3);
  assert.match(css, /font-size:12pt/);
  assert.match(css, /h1,.brand-document-title\{font-size:30pt/);
  assert(
    !visualConfigSchema.safeParse({
      ...c,
      documents: { ...c.documents, bodySize: 18 },
    }).success,
  );
});
test("outline actions validate text contrast against their transparent background", () => {
  const c = structuredClone(DEFAULT_VISUAL_CONFIG);
  Object.assign(c.light, {
    action: "#5681A8",
    onAction: "#000000",
    sidebarAction: c.light.action,
    sidebarOnAction: c.light.onAction,
  });
  assert.equal(visualIssues(c).length, 0);
  c.customization.components.buttonStyle = "outline";
  assert(visualIssues(c).some((i) => i.includes("botão de contorno")));
});
