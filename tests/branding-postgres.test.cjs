const test = require("node:test"),
  assert = require("node:assert/strict");
const { createFixture } = require("./branding-fixture.cjs");
const { createRequire } = require("node:module"),
  path = require("node:path");
const { visualIssues } = createRequire(path.resolve("apps/api/package.json"))(
  "@peanut/validators",
);
let f;
test.before(async () => {
  f = await createFixture();
});
test.after(async () => {
  await f?.close();
});
test("draft, publication, persistence, stale writers and restore are independent per company", async () => {
  const a = await f.tenant(),
    b = await f.tenant(),
    u = a.users.OWNER,
    c = f.config();
  assert.equal(visualIssues(c).length, 0);
  let r = await f.request(u, "PUT", "/settings/visual/draft", {
    revision: 0,
    config: c,
  });
  assert.equal(r.status, 200, r.body);
  assert.equal(r.json().revision, 1);
  assert.equal(
    (await f.request(u, "GET", "/settings/visual/active")).json().config,
    null,
  );
  assert.equal(
    (
      await f.request(u, "PUT", "/settings/visual/draft", {
        revision: 0,
        config: c,
      })
    ).status,
    409,
  );
  r = await f.request(u, "POST", "/settings/visual/publish", { revision: 1 });
  assert.equal(r.status, 201, r.body);
  assert.equal(r.json().publishedVersion, 1);
  const next = structuredClone(c);
  next.name = "Different draft";
  await f.request(u, "PUT", "/settings/visual/draft", {
    revision: 2,
    config: next,
  });
  assert.equal(
    (await f.request(u, "GET", "/settings/visual/active")).json().config.name,
    c.name,
  );
  assert.equal(
    (await f.request(b.users.OWNER, "GET", "/settings/visual")).json().revision,
    0,
  );
  r = await f.request(u, "POST", "/settings/visual/restore", {
    revision: 3,
    version: 1,
  });
  assert.equal(r.status, 201, r.body);
  assert.equal(r.json().draft.name, c.name);
  assert.equal(r.json().publishedVersion, 1);
});
test("permissions and tenant ownership apply to assets, settings and previews", async () => {
  const a = await f.tenant(),
    b = await f.tenant(),
    asset = await f.asset(a.users.OWNER, "Original");
  assert.equal(
    (await f.request(a.users.TECHNICIAN, "GET", "/settings/visual")).status,
    403,
  );
  assert.equal(
    (
      await f.request(a.users.READ_ONLY, "PUT", "/settings/visual/draft", {
        revision: 0,
        config: f.config(),
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.request(a.users.TECHNICIAN, "GET", "/settings/visual/active"))
      .status,
    200,
  );
  const c = f.config();
  c.assets.iconLight = asset.id;
  assert.equal(
    (
      await f.request(b.users.OWNER, "PUT", "/settings/visual/draft", {
        revision: 0,
        config: c,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(b.users.OWNER, "POST", "/settings/visual/preview", {
        config: c,
        documentType: "REPORT",
      })
    ).status,
    400,
  );
  c.assets.logoLight = asset.id;
  assert.equal(
    (
      await f.request(b.users.OWNER, "POST", "/settings/visual/preview", {
        config: c,
        documentType: "REPORT",
      })
    ).status,
    400,
  );
  assert.equal(
    (await f.request(b.users.OWNER, "GET", asset.url.replace("/api/v1", "")))
      .status,
    404,
  );
  const count = await f.prisma.brandAsset.count({
    where: { workspaceId: a.ws.id },
  });
  for (const svg of [
    "<svg><script>alert(1)</script></svg>",
    '<svg><use href="https://example.invalid/a.svg"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>',
  ]) {
    const r = await f.request(
      a.users.OWNER,
      "POST",
      "/settings/visual/assets",
      {
        title: "Bad",
        filename: "a.svg",
        mimeType: "image/svg+xml",
        data: Buffer.from(svg).toString("base64"),
      },
    );
    assert.equal(r.status, 400);
  }
  assert.equal(
    await f.prisma.brandAsset.count({ where: { workspaceId: a.ws.id } }),
    count,
  );
});
test("invalid contrast can remain a draft but cannot become the active identity", async () => {
  const a = await f.tenant(),
    c = f.config();
  c.light.onAction = c.light.action;
  assert.equal(
    (
      await f.request(a.users.OWNER, "PUT", "/settings/visual/draft", {
        revision: 0,
        config: c,
      })
    ).status,
    200,
  );
  const r = await f.request(a.users.OWNER, "POST", "/settings/visual/publish", {
    revision: 1,
  });
  assert.equal(r.status, 400);
  assert.match(r.body, /contraste/);
  assert.equal(
    (await f.request(a.users.OWNER, "GET", "/settings/visual/active")).json()
      .config,
    null,
  );
});
test("derived assets preserve the original; foreign parent references are refused", async () => {
  const a = await f.tenant(),
    b = await f.tenant(),
    asset = await f.asset(a.users.OWNER, "Original");
  const body = {
    title: "Variação",
    filename: "logo.svg",
    mimeType: "image/svg+xml",
    data: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/></svg>',
    ).toString("base64"),
    parentAssetId: asset.id,
  };
  assert.equal(
    (await f.request(b.users.OWNER, "POST", "/settings/visual/assets", body))
      .status,
    400,
  );
  const r = await f.request(
    a.users.OWNER,
    "POST",
    "/settings/visual/assets",
    body,
  );
  assert.equal(r.status, 201, r.body);
  assert.equal(r.json().parentAssetId, asset.id);
  assert.equal(
    (await f.request(a.users.OWNER, "GET", asset.url.replace("/api/v1", "")))
      .status,
    200,
  );
});
test("reports and proposals validate client/quote ownership, roles and concurrent edits", async () => {
  const a = await f.tenant(),
    b = await f.tenant();
  const input = {
    kind: "REPORT",
    title: "Diagnóstico técnico",
    clientId: a.client.id,
    quoteId: null,
    project: "Projeto sintético",
    sections: [
      { title: "Diagnóstico", body: "Texto <script> não executável." },
    ],
  };
  assert.equal(
    (await f.request(b.users.OWNER, "POST", "/authored-documents", input))
      .status,
    400,
  );
  let r = await f.request(
    a.users.TECHNICIAN,
    "POST",
    "/authored-documents",
    input,
  );
  assert.equal(r.status, 201, r.body);
  const report = r.json();
  assert.equal(
    (await f.request(b.users.OWNER, "GET", `/authored-documents/${report.id}`))
      .status,
    404,
  );
  r = await f.request(
    a.users.TECHNICIAN,
    "POST",
    "/authored-documents/preview",
    input,
  );
  assert.equal(r.status, 201, r.body);
  assert.match(r.body, /&lt;script&gt;/);
  assert.ok(!r.body.includes("<script>"));
  assert.equal(
    (
      await f.request(
        a.users.READ_ONLY,
        "PUT",
        `/authored-documents/${report.id}`,
        { ...input, revision: 1 },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        a.users.TECHNICIAN,
        "PUT",
        `/authored-documents/${report.id}`,
        { ...input, revision: 1 },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request(
        a.users.TECHNICIAN,
        "PUT",
        `/authored-documents/${report.id}`,
        { ...input, revision: 1 },
      )
    ).status,
    409,
  );
  const proposal = { ...input, kind: "PROPOSAL", quoteId: a.quote.id };
  assert.equal(
    (
      await f.request(
        a.users.TECHNICIAN,
        "POST",
        "/authored-documents",
        proposal,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(a.users.OWNER, "POST", "/authored-documents", {
        ...proposal,
        quoteId: b.quote.id,
      })
    ).status,
    400,
  );
  r = await f.request(
    a.users.FINANCIAL,
    "POST",
    "/authored-documents",
    proposal,
  );
  assert.equal(r.status, 201, r.body);
  const id = r.json().id;
  assert.equal(
    (await f.request(a.users.TECHNICIAN, "GET", `/authored-documents/${id}`))
      .status,
    403,
  );
  assert.ok(
    (await f.request(a.users.TECHNICIAN, "GET", "/authored-documents"))
      .json()
      .every((d) => d.kind === "REPORT"),
  );
});
test("finalized documents freeze content, linked prices and embedded identity after later changes", async () => {
  const a = await f.tenant(),
    u = a.users.OWNER,
    c = f.config("Original identity");
  Object.assign(c.documents, {
    headingFont: "geist",
    bodySize: 12,
    headingSize: 30,
  });
  await f.request(u, "PUT", "/settings/visual/draft", {
    revision: 0,
    config: c,
  });
  await f.request(u, "POST", "/settings/visual/publish", { revision: 1 });
  const input = {
    kind: "PROPOSAL",
    title: "Proposta preservada",
    clientId: a.client.id,
    quoteId: a.quote.id,
    project: "Projeto QA",
    sections: [{ title: "Objetivo", body: "Conteúdo original." }],
  };
  const r = await f.request(u, "POST", "/authored-documents", input),
    id = r.json().id;
  const final = await f.request(
    u,
    "POST",
    `/authored-documents/${id}/finalize`,
    { revision: 1 },
  );
  assert.equal(final.status, 201, final.body);
  const before = (
    await f.request(u, "GET", `/authored-documents/${id}/preview`)
  ).body;
  assert.match(before, /Original identity/);
  assert.match(before, /2\.400,00/);
  assert.match(before, /data:font\/ttf;base64/);
  assert.match(before, /font-family:'Geist';font-style:normal/);
  assert.match(before, /font-size:12pt/);
  await f.prisma.quote.update({
    where: { id: a.quote.id },
    data: { totalAmount: "9999" },
  });
  const next = structuredClone(c);
  next.name = "New identity";
  Object.assign(next.documents, {
    font: "system",
    headingFont: "system",
    bodySize: 9,
    headingSize: 22,
  });
  await f.request(u, "PUT", "/settings/visual/draft", {
    revision: 2,
    config: next,
  });
  await f.request(u, "POST", "/settings/visual/publish", { revision: 3 });
  assert.equal(
    (await f.request(u, "GET", `/authored-documents/${id}/preview`)).body,
    before,
  );
  assert.equal(
    (
      await f.request(u, "PUT", `/authored-documents/${id}`, {
        ...input,
        revision: 2,
      })
    ).status,
    409,
  );
});
test("legacy identities are normalized on read without rewriting historical JSON", async () => {
  const a = await f.tenant(),
    u = a.users.OWNER,
    old = f.config();
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
  await f.prisma.workspaceVisualSettings.create({
    data: {
      workspaceId: a.ws.id,
      revision: 7,
      publishedVersion: 1,
      draft: old,
      published: old,
    },
  });
  await f.prisma.workspaceVisualVersion.create({
    data: { workspaceId: a.ws.id, version: 1, config: old, createdById: u.id },
  });
  const active = (await f.request(u, "GET", "/settings/visual/active")).json();
  assert.equal(active.config.customization.components.fieldHeight, 44);
  assert.equal(active.config.documents.font, "inherit");
  const read = (await f.request(u, "GET", "/settings/visual")).json();
  assert.equal(read.revision, 7);
  assert.equal(read.draft.light.sidebarText, null);
  const stored = await f.prisma.workspaceVisualVersion.findUnique({
    where: { workspaceId_version: { workspaceId: a.ws.id, version: 1 } },
  });
  assert.deepEqual(stored.config, old);
});
test("simultaneous new-style writers serialize and preserve the winning customizations", async () => {
  const a = await f.tenant(),
    u = a.users.OWNER;
  const candidates = [f.config("Primeira edição"), f.config("Segunda edição")];
  for (const c of candidates) {
    c.customization.components.buttonShape = "pill";
    c.customization.typography.dataFont = "mono";
    const p = c.dark;
    Object.assign(c.light, {
      sidebar: p.canvas,
      sidebarText: p.text,
      sidebarMuted: p.muted,
      sidebarAction: p.action,
      sidebarOnAction: p.onAction,
    });
  }
  const responses = await Promise.all(
    candidates.map((config) =>
      f.request(u, "PUT", "/settings/visual/draft", { revision: 0, config }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const winner = responses.find((r) => r.status === 200).json();
  const applied = await f.request(u, "POST", "/settings/visual/publish", {
    revision: winner.revision,
  });
  assert.equal(applied.status, 201, applied.body);
  const active = (await f.request(u, "GET", "/settings/visual/active")).json()
    .config;
  assert.deepEqual(active, winner.draft);
  assert.equal(active.customization.components.buttonShape, "pill");
  assert.equal(active.light.sidebarText, candidates[0].dark.text);
});
