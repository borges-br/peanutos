// Real controllers/import services with a fake persistence boundary. No database.
const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../packages/db/dist");
const {
  ClientsController,
} = require("../apps/api/dist/clients/clients.controller");
const {
  ClientUsersService,
} = require("../apps/api/dist/client-users/client-users.service");
const {
  InventoryService,
} = require("../apps/api/dist/inventory/inventory.service");

test("direct API requests normalize before calling persistence and reject invalid phones", async () => {
  const calls = [];
  const controller = new ClientsController({
    create: async (data) => {
      calls.push(data);
      return data;
    },
    update: async (id, data) => {
      calls.push(data);
      return data;
    },
  });
  const user = { id: "actor", workspaceId: "workspace" };
  await controller.create(
    {
      legalName: " Empresa   Demo ",
      email: " CONTACT@EXAMPLE.COM ",
      phone: "11999999999",
    },
    user,
    {},
  );
  assert.equal(calls[0].email, "contact@example.com");
  assert.equal(calls[0].phone, "+5511999999999");
  assert.equal(calls[0].legalName, "Empresa Demo");
  await controller.update("client", { phone: "" }, user, {});
  assert.deepEqual(calls[1], { phone: null });
  await assert.rejects(
    controller.create({ legalName: "Empresa Demo", phone: "123" }, user, {}),
    /Telefone inválido/,
  );
  assert.equal(calls.length, 2);
});

async function mockMethods(methods, run) {
  const originals = methods.map(([model, key, fn]) => [model, key, model[key]]);
  try {
    for (const [model, key, fn] of methods) model[key] = fn;
    await run();
  } finally {
    for (const [model, key, fn] of originals) model[key] = fn;
  }
}

test("AD CSV import normalizes before matching/writing and reports invalid rows", async () => {
  const writes = [],
    matches = [];
  const service = new ClientUsersService(
    { log: async () => {} },
    { validateUserQuota: async () => {} },
  );
  await mockMethods(
    [
      [prisma.client, "findFirst", async () => ({ id: "client" })],
      [
        prisma.clientUser,
        "findFirst",
        async (query) => {
          matches.push(query);
          return null;
        },
      ],
      [
        prisma.clientUser,
        "create",
        async ({ data }) => {
          writes.push(data);
          return { id: "user", ...data };
        },
      ],
    ],
    async () => {
      const result = await service.importCsv(
        "workspace",
        "client",
        "DisplayName;EmailAddress;MobilePhone\n Ana   Maria ;USER@EXAMPLE.COM;(11) 99999-9999\nInvalid phone;other@example.com;123",
        "actor",
      );
      assert.equal(result.created, 1);
      assert.equal(result.skipped, 1);
      assert.match(result.errors[0].message, /Telefone inválido/);
      assert.equal(writes[0].fullName, "Ana Maria");
      assert.equal(writes[0].email, "user@example.com");
      assert.equal(writes[0].phone, "+5511999999999");
      assert.equal(matches[0].where.OR[0].email, "user@example.com");
    },
  );
});

test("inventory CSV import normalizes identifiers before matching/writing and rejects invalid MAC", async () => {
  const writes = [],
    matches = [];
  const service = new InventoryService(
    { log: async () => {} },
    { validateAssetQuota: async () => {} },
  );
  await mockMethods(
    [
      [prisma.client, "findFirst", async () => ({ id: "client" })],
      [
        prisma.asset,
        "findFirst",
        async (query) => {
          matches.push(query);
          return null;
        },
      ],
      [
        prisma.asset,
        "create",
        async ({ data }) => {
          writes.push(data);
          return { id: "asset", ...data };
        },
      ],
      [prisma.assetHistory, "create", async () => ({})],
    ],
    async () => {
      const result = await service.importCsv(
        "workspace",
        "client",
        "Nome;NomeDNS;MACAddress\n Notebook   Demo ;NB-DEMO;aabb.ccdd.eeff\nInvalid network;NB-BAD;invalid",
        "actor",
      );
      assert.equal(result.created, 1);
      assert.equal(result.skipped, 1);
      assert.match(result.errors[0].message, /MAC inválido/);
      assert.equal(writes[0].name, "Notebook Demo");
      assert.equal(writes[0].hostname, "nb-demo");
      assert.equal(writes[0].macAddress, "AA:BB:CC:DD:EE:FF");
      assert(
        matches[0].where.OR.some(
          (condition) => condition.hostname?.equals === "nb-demo",
        ),
      );
    },
  );
});
