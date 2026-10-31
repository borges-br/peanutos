// Real HTTP controllers, DTO validation and role guards; persistence is stubbed explicitly.
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto"),
  { createRequire } = require("node:module"),
  path = require("node:path");
const req = createRequire(path.resolve("apps/api/package.json"));
req("reflect-metadata");
const { Module } = req("@nestjs/common"),
  { NestFactory } = req("@nestjs/core"),
  { FastifyAdapter } = req("@nestjs/platform-fastify");
const { DEFAULT_VISUAL_CONFIG } = req("@peanut/validators");
const {
  VisualSettingsController,
} = require("../apps/api/dist/settings/visual-settings.controller");
const {
  VisualSettingsService,
} = require("../apps/api/dist/settings/visual-settings.service");
const {
  AuthoredDocumentsController,
} = require("../apps/api/dist/documents/authored-documents.controller");
const {
  AuthoredDocumentsService,
} = require("../apps/api/dist/documents/authored-documents.service");
const { AuthGuard } = require("../apps/api/dist/auth/auth.guard"),
  { RolesGuard } = require("../apps/api/dist/auth/roles.guard"),
  { AuthService } = require("../apps/api/dist/auth/auth.service");
let app, server;
const calls = [],
  workspace = randomUUID();
const users = Object.fromEntries(
  ["OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY"].map((role) => [
    role,
    { id: randomUUID(), workspaceId: workspace, role },
  ]),
);
test.before(async () => {
  class HttpQa {}
  Module({
    controllers: [VisualSettingsController, AuthoredDocumentsController],
    providers: [
      AuthGuard,
      RolesGuard,
      {
        provide: AuthService,
        useValue: { validateToken: async (token) => users[token] },
      },
      {
        provide: VisualSettingsService,
        useValue: {
          active: async (id) => ({ workspace: id }),
          get: async (id) => ({ workspace: id }),
          write: async (...args) => {
            calls.push(args);
            return { ok: true };
          },
          preview: async () => "<html></html>",
          upload: async () => ({}),
        },
      },
      {
        provide: AuthoredDocumentsService,
        useValue: {
          list: async () => [],
          get: async () => ({}),
          create: async () => ({}),
          update: async () => ({}),
          preview: async () => "<html></html>",
          finalize: async () => ({}),
        },
      },
    ],
  })(HttpQa);
  app = await NestFactory.create(HttpQa, new FastifyAdapter(), {
    logger: false,
  });
  app.setGlobalPrefix("api/v1");
  await app.init();
  server = app.getHttpAdapter().getInstance();
  await server.ready();
});
test.after(async () => {
  await app.close();
});
const request = (role, method, url, payload) =>
  server.inject({
    method,
    url: "/api/v1" + url,
    headers: role ? { authorization: `Bearer ${role}` } : {},
    ...(payload ? { payload } : {}),
  });
test("unauthenticated requests cannot read a company theme", async () => {
  assert.equal(
    (await request(null, "GET", "/settings/visual/active")).statusCode,
    401,
  );
});
test("all authenticated roles can read the applied theme in their session workspace", async () => {
  for (const role of Object.keys(users)) {
    const r = await request(role, "GET", "/settings/visual/active");
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().workspace, workspace);
  }
});
test("drafts and editing endpoints are restricted to administrators", async () => {
  for (const role of ["FINANCIAL", "TECHNICIAN", "READ_ONLY"]) {
    assert.equal(
      (await request(role, "GET", "/settings/visual")).statusCode,
      403,
    );
    assert.equal(
      (
        await request(role, "PUT", "/settings/visual/draft", {
          revision: 0,
          config: DEFAULT_VISUAL_CONFIG,
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await request(role, "POST", "/settings/visual/publish", { revision: 0 }))
        .statusCode,
      403,
    );
  }
});
test("a caller cannot supply a different workspace or CSS through the theme DTO", async () => {
  const before = calls.length;
  assert.equal(
    (
      await request("OWNER", "PUT", "/settings/visual/draft", {
        revision: 0,
        workspaceId: randomUUID(),
        config: DEFAULT_VISUAL_CONFIG,
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await request("OWNER", "PUT", "/settings/visual/draft", {
        revision: 0,
        config: { ...DEFAULT_VISUAL_CONFIG, css: "body{}" },
      })
    ).statusCode,
    400,
  );
  assert.equal(calls.length, before);
});
test("valid writes use the session workspace and actor rather than body identifiers", async () => {
  const r = await request("ADMIN", "PUT", "/settings/visual/draft", {
    revision: 0,
    config: DEFAULT_VISUAL_CONFIG,
  });
  assert.equal(r.statusCode, 200);
  const [id, actor, input] = calls.at(-1);
  assert.equal(id, workspace);
  assert.equal(actor, users.ADMIN.id);
  assert.equal(input.action, "save");
});
test("read-only users cannot create or finalize authored documents", async () => {
  assert.equal(
    (await request("READ_ONLY", "POST", "/authored-documents", {})).statusCode,
    403,
  );
  assert.equal(
    (
      await request(
        "READ_ONLY",
        "POST",
        `/authored-documents/${randomUUID()}/finalize`,
        { revision: 1 },
      )
    ).statusCode,
    403,
  );
});
test("document DTOs reject malformed identifiers and oversized content before persistence", async () => {
  const body = {
    kind: "REPORT",
    title: "Relatório",
    clientId: "bad",
    project: "",
    sections: [{ title: "Contexto", body: "Texto" }],
  };
  assert.equal(
    (await request("TECHNICIAN", "POST", "/authored-documents", body))
      .statusCode,
    400,
  );
  assert.equal(
    (await request("OWNER", "GET", "/authored-documents/not-a-uuid"))
      .statusCode,
    400,
  );
});
test('oversized document content is rejected by the HTTP schema',async()=>{
  const response=await request('OWNER','POST','/authored-documents',{kind:'REPORT',title:'Relatório',clientId:randomUUID(),project:'',sections:[{title:'Contexto',body:'x'.repeat(12001)}]});
  assert.equal(response.statusCode,400);
});
test("the real document service refuses technical access to commercial proposals before querying storage", async () => {
  const service = new AuthoredDocumentsService({});
  await assert.rejects(
    () =>
      service.create(workspace, users.TECHNICIAN.id, "TECHNICIAN", {
        kind: "PROPOSAL",
      }),
    (e) => e.getStatus() === 403,
  );
});
