const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
const item = (description, price = 125.5, extra = {}) => ({
  type: "SERVICE",
  description,
  quantity: "1",
  unit: "UN",
  unitPrice: money(price),
  totalPrice: money(price),
  billingKind: "EXTRA",
  ...extra,
});
const blocks = [
  "header",
  "logo",
  "companyInfo",
  "clientInfo",
  "documentTitle",
  "itemsTable",
  "financialSummary",
  "paymentInfo",
  "observations",
  "footer",
];
const logo =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="56" viewBox="0 0 300 56"><rect x="0" y="5" width="40" height="46" fill="#0968c4"/><text x="52" y="40" font-family="Arial,sans-serif" font-size="36" fill="#1e293b">DEMO TI</text></svg>',
  ).toString("base64");
const seed = {
  documentType: "INVOICE",
  timeZone: "America/Sao_Paulo",
  locale: "pt-BR",
  generatedAt: "03/11/2026, 09:00:00",
  responsible: null,
  brand: {
    publicName: "DEMO TI",
    legalName: "Empresa Demonstração de Tecnologia Ltda.",
    brandSubtitle: "Consultoria e integração tecnológica",
    taxId: "00000000000000",
    email: "contato@example.invalid",
    phone: "1531993176",
    website: "https://example.invalid",
    address: "Rua Exemplo de Demonstração, 243 - Jardim das Flores",
    logoUrl: logo,
    footerText: "Documento demonstrativo para validação local.",
    visual: {
      font: "source-sans-3",
      headingFont: "source-sans-3",
      headingSize: 26,
      logoWidth: 240,
      logoHeight: 72,
      alignment: "left",
      margin: 20,
      accent: "#0968c4",
      footer: "Documento demonstrativo para validação local.",
      style: "standard",
    },
  },
  client: {
    tradeName: "Cliente Demonstração",
    legalName: "Cliente Demonstração Projetos e Instalações Ltda.",
    document: "00000000000000",
    email: "administrativo@example.invalid",
  },
  templateSettings: {
    documentType: "INVOICE",
    templateKey: "standard",
    layoutVariant: "default",
    enabledBlocks: Object.fromEntries(blocks.map((key) => [key, true])),
    blockOrder: blocks,
    settings: {},
  },
  data: {
    number: "FAT-DEMO-202611",
    status: "ISSUED",
    issueDate: "03/11/2026",
    dueDate: "10/11/2026",
    billingPeriod: "2026-11",
    contractNumber: "CTR-DEMO-2026",
    paymentMethod: "PIX",
    pixKey: "chave-ficticia@example.invalid",
    totalAmount: money(3634.31),
    subtotalServices: money(3634.31),
    subtotalMaterials: money(0),
    discountAmount: money(0),
    items: [
      item("CTR-DEMO-2026-05-M01-V1", 1700.31, {
        billingKind: "BASE",
        unit: "MÊS",
      }),
      item("Automações complementares", 349, {
        billingKind: "RECURRING",
        billingProration: "NONE",
        billingNote: "Valor integral, sem rateio · 01/11/2026 a 30/11/2026",
      }),
      item("Manutenção e Suporte Servidor de Aplicações", 599, {
        billingKind: "RECURRING",
        billingProration: "NONE",
        billingNote: "01/11/2026 a 30/11/2026",
      }),
      item("Manutenção e Suporte Servidor de Integrações", 399, {
        billingKind: "RECURRING",
        billingProration: "NONE",
        billingNote: "01/11/2026 a 30/11/2026",
      }),
      item("Auxílio Básico Desenvolvimento Complementar", 139, {
        billingKind: "RECURRING",
        billingProration: "NONE",
        billingNote: "01/11/2026 a 30/11/2026",
      }),
      item(
        "Nobreak 1200 Revisão + Troca de duas baterias · Realizado em 10/2026",
        448,
      ),
    ],
  },
};
module.exports = { seed, item, money };
