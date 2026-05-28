// ==============================================================================
// PEANUT OS - DOCUMENTS & PRINT TEMPLATES
// ==============================================================================

import { formatCpfCnpj, formatPhone } from './formatters';
export * from './formatters';

// ─── Snapshot Types ───────────────────────────────────────────────────────────

export interface BrandSnapshot {
  publicName?: string | null;
  brandSubtitle?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  financialEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  documentPrimaryColor?: string | null;
  documentSecondaryColor?: string | null;
  documentAccentColor?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
  signatureName?: string | null;
}

export interface ResponsibleSnapshot {
  userId: string;
  displayName: string;
  jobTitle?: string | null;
  signatureImageUrl?: string | null;
  signatureEnabled: boolean;
}

export interface TemplateSnapshot {
  documentType: string;
  templateKey: string;
  layoutVariant: string;
  enabledBlocks: Record<string, boolean>;
  blockOrder: string[];
  settings?: {
    clientDisplayMode?: 'LEGAL_NAME' | 'TRADE_NAME' | 'LEGAL_WITH_TRADE';
    showItemTypeLabel?: boolean;
  } | any;
}

export interface PDFTemplateData {
  title: string;
  subtitle?: string;
  brandName: string;
  logoUrl?: string;
  createdAt: string;
  contentHtml: string;
}

/**
 * Standard A4 PDF Document layout shell generator
 */
export function generateBaseA4Html(data: PDFTemplateData): string {
  const displayBrand = data.brandName || "Dados da empresa configuráveis";
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #333;
      line-height: 1.5;
      font-size: 11pt;
    }
    header {
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 18pt;
      font-weight: bold;
      color: #1a56db;
    }
    .meta {
      font-size: 9pt;
      color: #666;
      text-align: right;
    }
    footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      border-top: 1px solid #eee;
      padding-top: 5px;
      font-size: 8pt;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <table style="width: 100%;">
      <tr>
        <td>
          <div class="brand">${displayBrand}</div>
          <div style="font-size: 14pt; margin-top: 5px;">${data.title}</div>
          ${data.subtitle ? `<div style="font-size: 10pt; color: #555;">${data.subtitle}</div>` : ''}
        </td>
        <td class="meta" style="vertical-align: bottom;">
          Gerado em: ${data.createdAt}
        </td>
      </tr>
    </table>
  </header>
  
  <main>
    ${data.contentHtml}
  </main>
  
  <footer>
    ${displayBrand} - Documento Oficial.
  </footer>
</body>
</html>
  `.trim();
}

export interface InvoicePdfTemplateData {
  invoice: {
    number: string;
    status: string;
    issueDate: string;
    dueDate: string;
    paymentMethod: string;
    pixKey?: string | null;
    subtotalServices?: string | null;
    subtotalMaterials?: string | null;
    discountAmount?: string | null;
    discountReason?: string | null;
    observations?: string | null;
    totalAmount: string;
    items: Array<{
      type: string;
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
      totalPrice: string;
    }>;
  };
  client: {
    tradeName: string;
    legalName?: string | null;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
  };
  brand: {
    brandName?: string | null;
    brandSubtitle?: string | null;
    legalName?: string | null;
    companyDocument?: string | null;
    companyEmail?: string | null;
    financialEmail?: string | null;
    companyPhone?: string | null;
    companyWebsite?: string | null;
    companyAddress?: string | null;
    primaryColorHex?: string | null;
    documentSecondaryColor?: string | null;
    documentAccentColor?: string | null;
    documentFooterText?: string | null;
    signatureName?: string | null;
    logoUrl?: string | null;
    defaultInvoiceNotes?: string | null;
    defaultContractTerms?: string | null;
  };
  responsible?: ResponsibleSnapshot | null;
  generatedAt: string;
  locale?: 'pt-BR' | 'en-US';
}

/**
 * Escapes HTML characters for security
 */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface RenderA4DocumentParams {
  documentType: 'INVOICE' | 'QUOTE' | 'SERVICE_ORDER' | 'CONTRACT' | 'REPORT';
  brand: BrandSnapshot;
  responsible: ResponsibleSnapshot | null;
  client: {
    tradeName: string;
    legalName?: string | null;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
  };
  data: {
    number: string;
    status: string;
    issueDate: string;
    dueDate: string;
    paymentMethod?: string | null;
    pixKey?: string | null;
    totalAmount: string;
    items: Array<{
      type: string;
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
      totalPrice: string;
    }>;
    terms?: string | null;
    observations?: string | null;
    title?: string | null;
    subtotalServices?: string | null;
    subtotalMaterials?: string | null;
    discountAmount?: string | null;
    discountReason?: string | null;
  };
  templateSettings: TemplateSnapshot;
  generatedAt?: string;
  locale?: 'pt-BR' | 'en-US';
}

// ─── Multi-language translation catalog ──────────────────────────────────────────

const translations = {
  "pt-BR": {
    invoice: "FATURA COMERCIAL",
    quote: "ORÇAMENTO",
    serviceOrder: "ORDEM DE SERVIÇO",
    contract: "CONTRATO COMERCIAL",
    report: "RELATÓRIO OPERACIONAL",
    document: "DOCUMENTO",
    issueDate: "Emissão",
    dueDate: "Vencimento",
    recipient: "Destinatário / Cliente",
    status: "Status do Documento",
    itemDescription: "Item / Descrição",
    qty: "Qtd",
    unit: "Un",
    unitPrice: "Valor Unit.",
    total: "Total",
    detailing: "Detalhamento de Serviços e Recursos Cobrados",
    subtotalServices: "Subtotal Serviços",
    subtotalMaterials: "Subtotal Materiais",
    discount: "Desconto",
    totalAmount: "Valor Total",
    paymentInstructions: "Instruções de Pagamento e Recebimento",
    favored: "Favorecido",
    preferredMethod: "Método preferencial",
    pixKey: "Chave PIX",
    terms: "Termos e Condições",
    observations: "Observações Adicionais",
    noTerms: "Termos de serviço não especificados.",
    noObservations: "Nenhuma observação cadastrada.",
    issuerSignature: "Assinatura do Emissor",
    clientSignature: "Assinatura do Cliente / Destinatário",
    authorizedSignatory: "Responsável Autorizado",
    acknowledgement: "De acordo com o recebimento",
    scanQr: "Aponte o celular",
    page: "Página",
    of: "de",
    draft: "Rascunho",
    issued: "Pendente",
    paid: "Liquidado",
    overdue: "Atrasado",
    cancelled: "Cancelado",
    serviceType: "Serviço Prestado",
    materialType: "Material / Produto",
  },
  "en-US": {
    invoice: "COMMERCIAL INVOICE",
    quote: "QUOTE",
    serviceOrder: "SERVICE ORDER",
    contract: "COMMERCIAL CONTRACT",
    report: "OPERATIONAL REPORT",
    document: "DOCUMENT",
    issueDate: "Issued",
    dueDate: "Due Date",
    recipient: "Recipient / Client",
    status: "Document Status",
    itemDescription: "Item / Description",
    qty: "Qty",
    unit: "Unit",
    unitPrice: "Unit Price",
    total: "Total",
    detailing: "Detailed Services and Materials Billed",
    subtotalServices: "Services Subtotal",
    subtotalMaterials: "Materials Subtotal",
    discount: "Discount",
    totalAmount: "Total Amount",
    paymentInstructions: "Payment Instructions",
    favored: "Beneficiary",
    preferredMethod: "Preferred method",
    pixKey: "PIX Key",
    terms: "Terms & Conditions",
    observations: "Additional Observations",
    noTerms: "Terms of service not specified.",
    noObservations: "No observations registered.",
    issuerSignature: "Issuer Signature",
    clientSignature: "Recipient Signature",
    authorizedSignatory: "Authorized Signatory",
    acknowledgement: "According to receipt",
    scanQr: "Scan QR Code",
    page: "Page",
    of: "of",
    draft: "Draft",
    issued: "Pending",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
    serviceType: "Service Rendered",
    materialType: "Material / Product",
  }
};

/**
 * Central dynamic block-based A4 document render engine.
 * Generates highly aesthetic premium layout based on enabling settings, order, and documental brand tokens.
 */
export function renderA4Document(params: RenderA4DocumentParams): string {
  const { documentType, brand, responsible, client, data, templateSettings } = params;
  const generatedAt = params.generatedAt || new Date().toLocaleString('pt-BR');
  const locale = params.locale || "pt-BR";
  const t = translations[locale] || translations["pt-BR"];

  // Colors & Brand Settings
  const primaryColor = escapeHtml(brand.documentPrimaryColor || "#1a56db");
  const brandName = escapeHtml(brand.publicName || "Empresa");
  const brandSubtitle = escapeHtml(brand.brandSubtitle || "");
  const legalName = escapeHtml(brand.legalName || "");
  const companyDocument = escapeHtml(formatCpfCnpj(brand.taxId || ""));
  const companyEmail = escapeHtml(brand.email || "");
  const companyPhone = escapeHtml(formatPhone(brand.phone || ""));
  const companyWebsite = escapeHtml(brand.website || "");
  const companyAddress = escapeHtml(brand.address || "");
  const logoUrl = brand.logoUrl || null;
  const documentFooterText = escapeHtml(brand.footerText || "Documento Oficial — Peanut OS.");

  // Client display mode toggle
  const clientDisplayMode = templateSettings.settings?.clientDisplayMode || "LEGAL_NAME";
  let clientName = "";
  const clientTrade = client.tradeName ? client.tradeName.trim() : "";
  const clientLegal = client.legalName ? client.legalName.trim() : "";

  if (clientDisplayMode === "TRADE_NAME") {
    clientName = escapeHtml(clientTrade || clientLegal || "Cliente");
  } else if (clientDisplayMode === "LEGAL_WITH_TRADE") {
    if (clientLegal && clientTrade && clientLegal !== clientTrade) {
      clientName = escapeHtml(`${clientLegal} (${clientTrade})`);
    } else {
      clientName = escapeHtml(clientLegal || clientTrade || "Cliente");
    }
  } else {
    // default LEGAL_NAME
    clientName = escapeHtml(clientLegal || clientTrade || "Cliente");
  }

  const clientDocument = escapeHtml(formatCpfCnpj(client.document || ""));
  const clientEmail = escapeHtml(client.email || "");

  // Document generic data
  const docNumber = escapeHtml(data.number);
  const rawStatus = escapeHtml(data.status);
  const issueDate = escapeHtml(data.issueDate);
  const dueDate = escapeHtml(data.dueDate);
  const paymentMethod = escapeHtml(data.paymentMethod || "PIX");
  const pixKey = escapeHtml(data.pixKey || "Não informada");
  const totalAmount = escapeHtml(data.totalAmount);
  const terms = data.terms || "";
  const observations = data.observations || "";
  const subtotalServices = escapeHtml(data.subtotalServices || "");
  const subtotalMaterials = escapeHtml(data.subtotalMaterials || "");

  // Mapping status labels using dictionary
  let statusLabel = rawStatus;
  if (rawStatus === 'PAID' || rawStatus === 'Liquidada' || rawStatus === 'Liquidado') statusLabel = t.paid;
  else if (rawStatus === 'OVERDUE' || rawStatus === 'Atrasada' || rawStatus === 'Atrasado') statusLabel = t.overdue;
  else if (rawStatus === 'DRAFT' || rawStatus === 'Rascunho') statusLabel = t.draft;
  else if (rawStatus === 'ISSUED' || rawStatus === 'Pendente') statusLabel = t.issued;
  else if (rawStatus === 'CANCELLED' || rawStatus === 'Cancelado') statusLabel = t.cancelled;

  // Document labels based on type
  let docTypeLabel = t.document;
  if (documentType === 'INVOICE') docTypeLabel = t.invoice;
  else if (documentType === 'QUOTE') docTypeLabel = t.quote;
  else if (documentType === 'SERVICE_ORDER') docTypeLabel = t.serviceOrder;
  else if (documentType === 'CONTRACT') docTypeLabel = t.contract;
  else if (documentType === 'REPORT') docTypeLabel = t.report;

  const customTitle = data.title ? escapeHtml(data.title) : docTypeLabel;

  // Build items rows HTML (Toggled display of Item Type via showItemTypeLabel)
  const showItemTypeLabel = templateSettings.settings?.showItemTypeLabel ?? false;
  const itemsRowsHtml = data.items.map((item, idx) => {
    const itemTypeLabel = item.type === "SERVICE" ? t.serviceType : t.materialType;
    return `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left;">
        <strong style="color: #1e293b; font-size: 9.5pt; display: block;">${escapeHtml(item.description)}</strong>
        ${showItemTypeLabel ? `<span style="font-size: 7.5pt; color: #64748b;">${itemTypeLabel}</span>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569;">${escapeHtml(item.quantity)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569;">${escapeHtml(item.unit || "UN")}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">${escapeHtml(item.unitPrice)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">${escapeHtml(item.totalPrice)}</td>
    </tr>
    `;
  }).join("");

  // Map blocks to HTML functions
  const blocksMap: Record<string, () => string> = {
    header: () => `
      <div class="block-container block-header" style="margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <span style="background: ${primaryColor}; color: white; padding: 5px 12px; border-radius: 4px; font-weight: 800; font-size: 8.5pt; display: inline-block; letter-spacing: 0.5px;">
                ${docTypeLabel}
              </span>
            </td>
            <td style="text-align: right; vertical-align: middle; font-family: monospace;">
              <span style="font-size: 14pt; font-weight: bold; color: #0f172a; display: block;">#${docNumber}</span>
              <div style="font-size: 8pt; color: #64748b; margin-top: 4px; line-height: 1.3;">
                ${t.issueDate}: ${issueDate}<br/>
                ${t.dueDate}: <strong style="color: #0f172a;">${dueDate}</strong>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `,
    logo: () => `
      <div class="block-container block-logo" style="margin-bottom: 20px;">
        ${logoUrl ? `
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 76px; vertical-align: middle;">
                <div style="width: 64px; height: 64px; background: transparent; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  <img src="${logoUrl}" alt="${brandName}" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
                </div>
              </td>
              <td style="vertical-align: middle;">
                <span style="font-size: 18pt; font-weight: 800; color: #0f172a; display: block; line-height: 1.1;">${brandName}</span>
                ${brandSubtitle ? `<span style="font-size: 9pt; font-weight: 600; color: #64748b; display: block; margin-top: 4px;">${brandSubtitle}</span>` : ''}
              </td>
            </tr>
          </table>
        ` : `
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 76px; vertical-align: middle;">
                <div style="width: 64px; height: 64px; background: ${primaryColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  <span style="font-size: 22pt; font-weight: 900; color: #ffffff; line-height: 1;">${brandName.charAt(0) || "P"}</span>
                </div>
              </td>
              <td style="vertical-align: middle;">
                <span style="font-size: 18pt; font-weight: 800; color: #0f172a; display: block; line-height: 1.1;">${brandName}</span>
                ${brandSubtitle ? `<span style="font-size: 9pt; font-weight: 600; color: #64748b; display: block; margin-top: 4px;">${brandSubtitle}</span>` : ''}
              </td>
            </tr>
          </table>
        `}
      </div>
    `,
    companyInfo: () => `
      <div class="block-container block-company-info" style="font-size: 8.5pt; color: #475569; margin-bottom: 20px; line-height: 1.45; border-left: 3px solid ${primaryColor}; padding-left: 10px;">
        <strong style="color: #0f172a; font-size: 10pt; display: block; margin-bottom: 2px;">${brandName}</strong>
        ${brandSubtitle ? `<span style="font-size: 8.5pt; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px;">${brandSubtitle}</span>` : ''}
        ${legalName ? `Razão Social: ${legalName} | ` : ''}CNPJ/Documento: ${companyDocument}<br/>
        E-mail: ${companyEmail} ${companyPhone ? `| Tel: ${companyPhone}` : ''} ${companyWebsite ? `| Website: ${companyWebsite}` : ''}<br/>
        ${companyAddress ? `Endereço: ${companyAddress}` : ''}
      </div>
    `,
    clientInfo: () => `
      <div class="block-container block-client-info" style="margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; line-height: 1.45;">
              <div style="font-size: 7.5pt; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px;">${t.recipient}</div>
              <div style="font-size: 11pt; font-weight: bold; color: #0f172a;">${clientName}</div>
              <div style="font-size: 9pt; color: #475569; margin-top: 2px;">
                ${clientDocument ? `CNPJ/CPF: ${clientDocument}` : ''} 
                ${clientEmail ? ` | E-mail: ${clientEmail}` : ''}
              </div>
              <div style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">
                ${t.status}: <span style="font-weight: bold; color: ${primaryColor};">${statusLabel}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `,
    documentTitle: () => `
      <div class="block-container block-document-title" style="margin-bottom: 20px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 6px;">
        <span style="font-size: 13pt; font-weight: 800; color: #0f172a; tracking-tight: -0.2px;">${customTitle}</span>
      </div>
    `,
    itemsTable: () => `
      <div class="block-container block-items-table" style="margin-bottom: 25px;">
        <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
          ${t.detailing}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 9pt;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border-bottom: 2px solid #cbd5e1; padding: 8px 10px; font-size: 8pt; color: #475569; font-family: sans-serif; text-transform: uppercase; text-align: left; width: 50%;">${t.itemDescription}</th>
              <th style="border-bottom: 2px solid #cbd5e1; padding: 8px 10px; font-size: 8pt; color: #475569; font-family: sans-serif; text-transform: uppercase; text-align: center; width: 10%;">${t.qty}</th>
              <th style="border-bottom: 2px solid #cbd5e1; padding: 8px 10px; font-size: 8pt; color: #475569; font-family: sans-serif; text-transform: uppercase; text-align: center; width: 10%;">${t.unit}</th>
              <th style="border-bottom: 2px solid #cbd5e1; padding: 8px 10px; font-size: 8pt; color: #475569; font-family: sans-serif; text-transform: uppercase; text-align: right; width: 15%;">${t.unitPrice}</th>
              <th style="border-bottom: 2px solid #cbd5e1; padding: 8px 10px; font-size: 8pt; color: #475569; font-family: sans-serif; text-transform: uppercase; text-align: right; width: 15%;">${t.total}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>
      </div>
    `,
    financialSummary: () => {
      const discountVal = data.discountAmount ? parseFloat(data.discountAmount.replace(/[^\d,.-]/g, "").replace(",", ".")) : 0;
      const formattedDiscount = data.discountAmount || "0";
      return `
      <div class="block-container block-financial-summary" style="margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right; font-family: monospace; font-size: 9pt; line-height: 1.5;">
              ${subtotalServices ? `<div>${t.subtotalServices}: <span style="font-weight: bold; min-width: 100px; display: inline-block;">${subtotalServices}</span></div>` : ''}
              ${subtotalMaterials ? `<div>${t.subtotalMaterials}: <span style="font-weight: bold; min-width: 100px; display: inline-block;">${subtotalMaterials}</span></div>` : ''}
              ${discountVal > 0 ? `<div style="color: #dc2626;">${t.discount}: <span style="font-weight: bold; min-width: 100px; display: inline-block;">-${formattedDiscount}</span></div>` : ''}
              <div style="font-size: 11pt; font-weight: bold; color: #000; margin-top: 8px; border-top: 2px solid #0f172a; padding-top: 6px;">
                ${t.totalAmount}: <span style="font-weight: 800; min-width: 120px; display: inline-block; color: ${primaryColor};">${totalAmount}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
      `;
    },
    paymentInfo: () => `
      <div class="block-container block-payment-info" style="margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 8.5pt; line-height: 1.45;">
        <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #0f172a; margin-bottom: 6px; font-family: sans-serif; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          ${t.paymentInstructions}
        </div>
        <div>${t.favored}: ${legalName || brandName}</div>
        <div>${t.preferredMethod}: ${paymentMethod}</div>
        <div style="font-weight: bold; margin-top: 4px; color: ${primaryColor}; font-size: 9pt; font-family: monospace;">
          ${t.pixKey}: ${pixKey}
        </div>
      </div>
    `,
    terms: () => `
      <div class="block-container block-terms" style="margin-bottom: 20px; font-size: 8.5pt; color: #475569; line-height: 1.45; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
        <strong style="color: #0f172a; font-size: 9pt; display: block; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${t.terms}</strong>
        <div style="white-space: pre-wrap; font-style: italic; color: #64748b;">${escapeHtml(terms || t.noTerms)}</div>
      </div>
    `,
    observations: () => `
      <div class="block-container block-observations" style="margin-bottom: 20px; font-size: 8.5pt; color: #475569; line-height: 1.45; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
        <strong style="color: #0f172a; font-size: 9pt; display: block; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${t.observations}</strong>
        <div style="white-space: pre-wrap; font-style: italic; color: #64748b;">${escapeHtml(observations || t.noObservations)}</div>
      </div>
    `,
    responsibleSignature: () => {
      const displaySigName = responsible?.displayName ? escapeHtml(responsible.displayName) : escapeHtml(brand.signatureName || "");
      const displaySigJob = responsible?.jobTitle ? escapeHtml(responsible.jobTitle) : "Responsável Técnico";
      return `
        <div class="block-container block-responsible-signature" style="margin-top: 30px; margin-bottom: 20px; text-align: center;">
          <div style="display: inline-block; width: 280px; text-align: center; vertical-align: top;">
            <div style="height: 52px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 6px;">
              ${responsible?.signatureImageUrl && responsible.signatureEnabled ? `
                <img src="${escapeHtml(responsible.signatureImageUrl)}" alt="Assinatura" style="max-height: 50px; max-width: 200px; object-fit: contain; display: block; margin: 0 auto;" />
              ` : '<div style="height: 10px;"></div>'}
            </div>
            <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 9pt; font-weight: bold; color: #0f172a;">
              ${displaySigName}
            </div>
            <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">${displaySigJob}</div>
            <div style="font-size: 7.5pt; color: #94a3b8;">${t.issuerSignature}</div>
          </div>
        </div>
      `;
    },
    clientSignature: () => `
      <div class="block-container block-client-signature" style="margin-top: 30px; margin-bottom: 20px; text-align: center;">
        <div style="display: inline-block; width: 280px; text-align: center; vertical-align: top;">
          <div style="height: 52px;"></div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 9pt; font-weight: bold; color: #0f172a;">
            ${t.clientSignature}
          </div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">${t.authorizedSignatory}</div>
          <div style="font-size: 7.5pt; color: #94a3b8;">${t.acknowledgement}</div>
        </div>
      </div>
    `,
    qrCode: () => `
      <div class="block-container block-qrcode" style="margin-bottom: 20px; text-align: center;">
        <div style="display: inline-block; padding: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
          <div style="width: 84px; height: 84px; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 7.5pt; color: #64748b; font-weight: bold; border-radius: 4px;">
            [QR CODE PIX]
          </div>
          <div style="font-size: 7pt; color: #94a3b8; margin-top: 6px; font-family: monospace;">${t.scanQr}</div>
        </div>
      </div>
    `,
    footer: () => `
      <div class="block-container block-footer" style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8pt; color: #94a3b8; font-family: monospace; display: flex; justify-content: space-between; margin-top: auto;">
        <span>${documentFooterText} | Gerado em: ${generatedAt}</span>
      </div>
    `,
  };

  // Compile blocks HTML matching sequence and checking enabled status
  const blocksHtml = templateSettings.blockOrder
    .filter(block => templateSettings.enabledBlocks[block] === true && block in blocksMap)
    .map(block => blocksMap[block]!())
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${customTitle} #${docNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.4;
      font-size: 9.5pt;
      background: white;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 210mm;
      min-height: 297mm;
      height: auto;
      box-sizing: border-box;
      padding: 20mm;
      position: relative;
      display: flex;
      flex-direction: column;
      background: white;
    }
    .block-container {
      width: 100%;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    h1, h2, h3, h4, h5, h6 {
      break-after: avoid;
      page-break-after: avoid;
    }
    table {
      break-inside: auto;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
  </style>
</head>
<body>
  <div class="page-container">
    ${blocksHtml}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Premium A4 PDF generator for Invoices.
 * Integrates fully with the renderA4Document block layout engine for 100% unified code and full backward compatibility.
 */
export function generateInvoicePdfHtml(data: InvoicePdfTemplateData): string {
  const brandSnapshot: BrandSnapshot = {
    publicName: data.brand.brandName,
    brandSubtitle: data.brand.brandSubtitle,
    legalName: data.brand.legalName,
    taxId: data.brand.companyDocument,
    email: data.brand.companyEmail,
    financialEmail: data.brand.financialEmail,
    phone: data.brand.companyPhone,
    website: data.brand.companyWebsite,
    address: data.brand.companyAddress,
    documentPrimaryColor: data.brand.primaryColorHex,
    documentSecondaryColor: data.brand.documentSecondaryColor,
    documentAccentColor: data.brand.documentAccentColor,
    logoUrl: data.brand.logoUrl,
    footerText: data.brand.documentFooterText,
    signatureName: data.brand.signatureName,
  };

  const responsibleSnapshot: ResponsibleSnapshot | null = data.responsible ? {
    userId: data.responsible.userId,
    displayName: data.responsible.displayName,
    jobTitle: data.responsible.jobTitle,
    signatureImageUrl: data.responsible.signatureImageUrl,
    signatureEnabled: data.responsible.signatureEnabled,
  } : null;

  // Group items and calculate totals
  const services = data.invoice.items.filter(item => item.type === "SERVICE");
  const serviceSubtotal = services.reduce((sum, item) => sum + parseFloat(item.totalPrice.replace(/[^\d,.-]/g, "").replace(",", ".")), 0);
  const materials = data.invoice.items.filter(item => item.type === "MATERIAL");
  const materialSubtotal = materials.reduce((sum, item) => sum + parseFloat(item.totalPrice.replace(/[^\d,.-]/g, "").replace(",", ".")), 0);

  const discountAmountStr = data.invoice.discountAmount || "R$ 0,00";

  const formatBrl = (num: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  const renderData = {
    number: data.invoice.number,
    status: data.invoice.status,
    issueDate: data.invoice.issueDate,
    dueDate: data.invoice.dueDate,
    paymentMethod: data.invoice.paymentMethod,
    pixKey: data.invoice.pixKey,
    totalAmount: data.invoice.totalAmount,
    items: data.invoice.items,
    terms: data.brand.defaultContractTerms || null,
    observations: data.invoice.observations || data.brand.defaultInvoiceNotes || null,
    subtotalServices: formatBrl(serviceSubtotal),
    subtotalMaterials: formatBrl(materialSubtotal),
    discountAmount: discountAmountStr,
  };

  // Standard template structure settings
  const templateSettings: TemplateSnapshot = {
    documentType: 'INVOICE',
    templateKey: 'standard',
    layoutVariant: 'default',
    enabledBlocks: {
      header: true,
      logo: true,
      companyInfo: true,
      clientInfo: true,
      documentTitle: true,
      itemsTable: true,
      financialSummary: true,
      paymentInfo: true,
      terms: false,
      observations: true,
      responsibleSignature: true,
      clientSignature: false,
      qrCode: false,
      footer: true,
    },
    blockOrder: [
      "header", "logo", "companyInfo", "clientInfo", "documentTitle",
      "itemsTable", "financialSummary", "paymentInfo", "observations",
      "responsibleSignature", "footer",
    ],
  };

  return renderA4Document({
    documentType: 'INVOICE',
    brand: brandSnapshot,
    responsible: responsibleSnapshot,
    client: {
      tradeName: data.client.tradeName,
      legalName: data.client.legalName,
      document: data.client.document,
      email: data.client.email,
    },
    data: renderData,
    templateSettings,
    generatedAt: data.generatedAt,
    locale: data.locale,
  });
}
