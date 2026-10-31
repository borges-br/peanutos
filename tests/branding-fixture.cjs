// Isolated test host: real controllers/services/guards and PostgreSQL. Authentication uses synthetic tokens only.
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, ".."),
  apiRequire = createRequire(path.join(root, "apps/api/package.json"));
apiRequire("reflect-metadata");
const url = process.env.BRANDING_TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "Use tests/run-branding-postgres.cjs; an isolated database is required.",
  );
const target = new URL(url);
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.pathname !== "/peanut_branding_qa"
)
  throw new Error("Refusing a non-QA database.");
process.env.DATABASE_URL = url;
process.env.STORAGE_PATH = path.join(
  root,
  "data/qa/branding/storage",
  randomUUID(),
);
const { prisma } = require("../packages/db/dist");
const { DEFAULT_VISUAL_CONFIG } = apiRequire("@peanut/validators");
const { Module } = apiRequire("@nestjs/common");
const { NestFactory } = apiRequire("@nestjs/core");
const { FastifyAdapter } = apiRequire("@nestjs/platform-fastify");
const { AuthGuard } = require("../apps/api/dist/auth/auth.guard");
const { RolesGuard } = require("../apps/api/dist/auth/roles.guard");
const { AuthService } = require("../apps/api/dist/auth/auth.service");
const { StorageService } = require("../apps/api/dist/storage/storage.service");
const {
  VisualSettingsService,
} = require("../apps/api/dist/settings/visual-settings.service");
const {
  VisualSettingsController,
} = require("../apps/api/dist/settings/visual-settings.controller");
const {
  AuthoredDocumentsService,
} = require("../apps/api/dist/documents/authored-documents.service");
const {
  AuthoredDocumentsController,
} = require("../apps/api/dist/documents/authored-documents.controller");
const { FilesController } = require("../apps/api/dist/files/files.controller");

async function createFixture() {
  const tokens = new Map(),
    workspaces = [];
  class QaModule {}
  Module({
    controllers: [
      VisualSettingsController,
      AuthoredDocumentsController,
      FilesController,
    ],
    providers: [
      VisualSettingsService,
      AuthoredDocumentsService,
      StorageService,
      AuthGuard,
      RolesGuard,
      {
        provide: AuthService,
        useValue: { validateToken: async (token) => tokens.get(token) },
      },
    ],
  })(QaModule);
  const app = await NestFactory.create(
    QaModule,
    new FastifyAdapter({ bodyLimit: 5 * 1024 * 1024 }),
    { logger: false },
  );
  app.setGlobalPrefix("api/v1");
  await app.init();
  const server = app.getHttpAdapter().getInstance();
  await server.ready();
  async function tenant(name = "QA Company") {
    const ws = await prisma.workspace.create({
      data: {
        name,
        slug: randomUUID(),
        brandName: name,
        companyEmail: "contato@example.invalid",
        companyWebsite: "empresa.example",
      },
    });
    workspaces.push(ws.id);
    const users = {};
    for (const role of [
      "OWNER",
      "ADMIN",
      "FINANCIAL",
      "TECHNICIAN",
      "READ_ONLY",
    ]) {
      const user = await prisma.user.create({
        data: {
          workspaceId: ws.id,
          name: `QA ${role}`,
          email: `${randomUUID()}@example.invalid`,
          passwordHash: "synthetic-no-login",
          role,
        },
      });
      users[role] = { ...user, workspaceId: ws.id, timeZone: ws.timeZone };
      tokens.set(user.id, users[role]);
    }
    const client = await prisma.client.create({
      data: {
        workspaceId: ws.id,
        legalName: "Rede Horizonte",
        tradeName: "Rede Horizonte",
        email: "cliente@example.invalid",
      },
    });
    const quote = await prisma.quote.create({
      data: {
        workspaceId: ws.id,
        clientId: client.id,
        number: `OR-QA-${randomUUID().slice(0, 8)}`,
        validUntil: new Date("2026-11-15"),
        subtotalServices: "2400",
        subtotalMaterials: "0",
        totalAmount: "2400",
        items: {
          create: [
            {
              type: "SERVICE",
              description: "Diagnóstico e plano de integração",
              quantity: "16",
              unit: "H",
              unitPrice: "150",
              totalPrice: "2400",
            },
          ],
        },
      },
    });
    return { ws, users, client, quote };
  }
  async function request(user, method, endpoint, body) {
    const response = await server.inject({
      method,
      url: "/api/v1" + endpoint,
      headers: {
        authorization: `Bearer ${user.id}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { payload: body } : {}),
    });
    return {
      status: response.statusCode,
      body: response.body,
      json: () => JSON.parse(response.body),
      headers: response.headers,
      raw: response.rawPayload,
    };
  }
  async function asset(
    user,
    title,
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect x="16" y="16" width="128" height="128" fill="#0968c4"/></svg>',
  ) {
    const response = await request(user, "POST", "/settings/visual/assets", {
      title,
      filename: "logo.svg",
      mimeType: "image/svg+xml",
      data: Buffer.from(svg).toString("base64"),
    });
    if (response.status !== 201) throw new Error(response.body);
    return response.json();
  }
  function config(name = "QA Company") {
    const c = structuredClone(DEFAULT_VISUAL_CONFIG);
    c.name = name;
    c.font = "source-sans-3";
    c.theme = "light";
    c.navigation = {
      mode: "expanded",
      sidebarWidth: 304,
      logoWidth: 240,
      logoHeight: 56,
      iconSize: 40,
      padding: 24,
    };
    c.dark = {
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
    c.interface = {
      radius: 8,
      density: "comfortable",
      spacing: 24,
      shadow: "none",
    };
    c.documents = {
      ...c.documents,
      style: "editorial",
      footer: `${name} / empresa.example / contato@example.invalid`,
    };
    return c;
  }
  async function branded(tenant) {
    const c = config("BORGES"),
      assets = [];
    c.subtitle = "Consultoria e integração tecnológica";
    const names = {
      logoLight: "signature-light.svg",
      logoDark: "signature-dark.svg",
      iconLight: "symbol-light.svg",
      iconDark: "symbol-dark.svg",
    };
    for (const [slot, file] of Object.entries(names)) {
      const source = path.join(root, "data/qa/branding/assets", file);
      if (!fs.existsSync(source))
        throw new Error(
          "Prepare the user-supplied assets under data/qa/branding/assets before running UI review.",
        );
      const saved = await asset(
        tenant.users.OWNER,
        `${slot.startsWith("icon") ? "Símbolo" : "Assinatura"} · ${slot.endsWith("Dark") ? "fundo escuro" : "fundo claro"}`,
        fs.readFileSync(source, "utf8"),
      );
      c.assets[slot] = saved.id;
      assets.push(saved);
    }
    const draft = await request(
      tenant.users.OWNER,
      "PUT",
      "/settings/visual/draft",
      { revision: 0, config: c },
    );
    if (draft.status !== 200) throw new Error(draft.body);
    const published = await request(
      tenant.users.OWNER,
      "POST",
      "/settings/visual/publish",
      { revision: 1 },
    );
    if (published.status !== 201) throw new Error(published.body);
    return { config: c, assets };
  }
  return {
    app,
    server,
    prisma,
    tokens,
    tenant,
    request,
    asset,
    config,
    branded,
    async close() {
      await app.close();
      await prisma.workspace.deleteMany({ where: { id: { in: workspaces } } });
      await prisma.$disconnect();
    },
  };
}
module.exports = { createFixture, root };
