// Build @peanut/validators and peanut-api first. No database or external service.
const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../packages/validators/dist");

for (const [input, expected] of [
  ["(11) 99999-9999", "+5511999999999"],
  ["1133334444", "+551133334444"],
  ["55999999999", "+5555999999999"], // DDD 55 is not the country code.
  ["5511999999999", "+5511999999999"],
  ["+1 (415) 555-2671", "+14155552671"],
  ["0014155552671", "+14155552671"],
  ["+351 912 345 678", "+351912345678"],
]) {
  test(`phone normalizes ${input} without losing its country or DDD`, () => {
    assert.equal(v.phoneValueSchema.parse(input), expected);
    assert.equal(v.phoneValueSchema.parse(expected), expected);
    assert.equal(
      v.phoneValueSchema.parse(v.maskInput(input, "phone")),
      expected,
    );
  });
}

test("invalid and incomplete phones cannot become stored digit strings", () => {
  for (const phone of [
    "123",
    "+55",
    "+999123456789",
    "11999999999 ramal 12",
    "+5511999999999999999",
    123,
  ]) {
    assert.equal(
      v.phoneValueSchema.safeParse(phone).success,
      false,
      String(phone),
    );
  }
  assert.equal(v.phoneValueSchema.parse("  "), "");
});

test("progressive masks support incomplete typing and do not truncate overflow", () => {
  assert.equal(v.maskInput("1", "phone"), "+55 (1");
  assert.equal(v.maskInput("0", "phone"), "0");
  assert.equal(v.maskInput("+55", "phone"), "+55");
  assert.equal(v.maskInput("11999999999", "phone"), "+55 (11) 99999-9999");
  assert.equal(v.maskInput("1133334444", "phone"), "+55 (11) 3333-4444");
  assert.equal(v.maskInput("1234", "cpf"), "123.4");
  assert.equal(v.maskInput("12345678901", "cpf"), "123.456.789-01");
  assert.equal(v.maskInput("12345678000195", "cnpj"), "12.345.678/0001-95");
  assert.equal(
    v.maskInput("123456789012", "cpf").replace(/\D/g, ""),
    "123456789012",
  );
  assert.equal(v.maskInput("01234567", "cep"), "01234-567");
  assert.equal(v.maskInput("aabbccddeeff", "mac"), "AA:BB:CC:DD:EE:FF");
  assert.equal(v.maskInput("  USER@EXAMPLE.COM ", "email"), "user@example.com");
  assert.equal(
    v.maskInput("  João   da Silva  ", "text", true),
    "João da Silva",
  );
});

test("client create/update normalize data and preserve omitted versus cleared fields", () => {
  const client = v.clientSchema.parse({
    type: "LEGAL_PERSON",
    legalName: "  Empresa   São João ",
    tradeName: "  São   João ",
    document: "11.222.333/0001-81",
    phone: "(11) 99999-9999",
    email: "  CONTATO@EXAMPLE.COM  ",
    website: "EXAMPLE.COM/Path?Token=ABC",
  });
  assert.equal(client.legalName, "Empresa São João");
  assert.equal(client.tradeName, "São João");
  assert.equal(client.document, "11222333000181");
  assert.equal(client.phone, "+5511999999999");
  assert.equal(client.email, "contato@example.com");
  assert.equal(client.website, "https://example.com/Path?Token=ABC");
  assert.equal(
    v.clientSchema.safeParse({
      legalName: "Empresa",
      website: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.deepEqual(
    v.clientUpdateSchema.parse({ legalName: " Nova   Empresa " }),
    { legalName: "Nova Empresa" },
  );
  assert.deepEqual(
    v.clientUpdateSchema.parse({
      phone: "",
      email: "",
      document: "",
      website: "",
    }),
    { phone: null, email: null, document: null, website: null },
  );
  assert.equal(
    v.clientSchema.safeParse({ legalName: "Empresa", phone: "1234" }).success,
    false,
  );
  assert.equal(
    v.clientSchema.safeParse({ legalName: "Empresa", document: 123 }).success,
    false,
  );
  assert.equal(
    v.clientSchema.safeParse({
      legalName: "Empresa",
      document: "abc11222333000181",
    }).success,
    false,
  );
});

test("contacts, client users, profiles and credentials use the same rules", () => {
  const contact = v.clientContactSchema.parse({
    name: "  José   Silva ",
    email: "USER@EXAMPLE.COM",
    phone: "(11) 3333-4444",
    mobile: "+1 415 555 2671",
  });
  assert.equal(contact.name, "José Silva");
  assert.equal(contact.phone, "+551133334444");
  assert.equal(contact.mobile, "+14155552671");
  const user = v.clientUserCreateSchema.parse({
    fullName: " Ana   Maria ",
    email: "USER@EXAMPLE.COM",
    phone: "11999999999",
  });
  assert.equal(user.email, "user@example.com");
  assert.equal(user.phone, "+5511999999999");
  assert.deepEqual(v.clientUserUpdateSchema.parse({}), {});
  assert.equal(
    v.updateUserProfileSchema.parse({ phone: "11999999999" }).phone,
    "+5511999999999",
  );
  assert.equal(
    v.loginSchema.parse({ email: " USER@EXAMPLE.COM ", password: "  abc123  " })
      .password,
    "  abc123  ",
  );
  assert.equal(
    v.userSchema.safeParse({
      name: "   ",
      email: "u@example.com",
      role: "OWNER",
    }).success,
    false,
  );
});

test("workspace branding, setup and email signatures normalize structured contact fields", () => {
  const brand = {
    companyPhone: "11999999999",
    companyEmail: " CONTACT@EXAMPLE.COM ",
    companyDocument: "11.222.333/0001-81",
    companyAddress: "  Rua   São João, 12, CEP 01234567 ",
    companyWebsite: "EXAMPLE.COM/Path",
  };
  for (const schema of [v.workspaceBrandSettingsSchema, v.setupAdminSchema]) {
    const data = schema.parse({
      ...brand,
      workspaceName: "Demo",
      adminName: "Admin",
      adminEmail: "ADMIN@EXAMPLE.COM",
      adminPassword: "Secret123",
    });
    assert.equal(data.companyPhone, "+5511999999999");
    assert.equal(data.companyEmail, "contact@example.com");
    assert.equal(data.companyDocument, "11222333000181");
    assert.equal(data.companyAddress, "Rua São João, 12, CEP 01234-567");
    assert.equal(data.companyWebsite, "https://example.com/Path");
  }
  const signature = v.emailSignatureSchema.parse({
    enabled: true,
    showLogo: false,
    displayName: " Ana   Maria ",
    jobTitle: "",
    company: "",
    email: "CONTACT@EXAMPLE.COM",
    phone: "11999999999",
    whatsapp: "+1 415 555 2671",
    website: "EXAMPLE.COM",
    address: "Rua A, CEP 01234567",
    registration: "Registro municipal 123",
  });
  assert.equal(signature.phone, "+5511999999999");
  assert.equal(signature.whatsapp, "+14155552671");
  assert.equal(signature.email, "contact@example.com");
  assert.equal(signature.address, "Rua A, CEP 01234-567");
  assert.equal(signature.registration, "Registro municipal 123");
});

test("billing recipients normalize with default DDI and keep WhatsApp digit storage", () => {
  const parsed = v.contractUpdateSchema.parse({
    billingEmailRecipients: [" FINANCE@EXAMPLE.COM "],
    billingWhatsappNumbers: ["11999999999", "+1 415 555 2671", "551133334444"],
  });
  assert.deepEqual(parsed.billingEmailRecipients, ["finance@example.com"]);
  assert.deepEqual(parsed.billingWhatsappNumbers, [
    "5511999999999",
    "14155552671",
    "551133334444",
  ]);
  assert.equal(
    v.contractUpdateSchema.safeParse({ billingWhatsappNumbers: ["123"] })
      .success,
    false,
  );
});

test("asset network identifiers normalize without changing serial casing or secrets", () => {
  const asset = v.assetCreateSchema.parse({
    name: "  Notebook   João ",
    type: "NOTEBOOK",
    status: "OPERATIONAL",
    hostname: " NB-DEMO ",
    macAddress: "aabb.ccdd.eeff",
    ipAddress: " 2001:DB8::1 ",
    serialNumber: " AbCd123 ",
    sensitiveDataEncrypted: "  Case Sensitive  ",
  });
  assert.equal(asset.hostname, "nb-demo");
  assert.equal(asset.macAddress, "AA:BB:CC:DD:EE:FF");
  assert.equal(asset.ipAddress, "2001:db8::1");
  assert.equal(asset.serialNumber, "AbCd123");
  assert.equal(asset.sensitiveDataEncrypted, "  Case Sensitive  ");
  assert.equal(
    v.assetCreateSchema.safeParse({
      name: "Demo",
      type: "NOTEBOOK",
      status: "OPERATIONAL",
      macAddress: "invalid",
    }).success,
    false,
  );
  assert.equal(
    v.assetCreateSchema.safeParse({
      name: "Demo",
      type: "NOTEBOOK",
      status: "OPERATIONAL",
      ipAddress: "999.1.2.3",
    }).success,
    false,
  );
});
