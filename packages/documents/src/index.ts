// ==============================================================================
// PEANUT OS - DOCUMENTS & PRINT TEMPLATES
// ==============================================================================

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
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
  };
  responsible?: ResponsibleSnapshot | null;
  generatedAt: string;
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

/**
 * Premium A4 PDF generator for Invoices with harmony styling and complete brand configuration integration
 */
export function generateInvoicePdfHtml(data: InvoicePdfTemplateData): string {
  // Brand fallback configurations
  const brandName = escapeHtml(data.brand.brandName || "Dados da empresa configuráveis");
  const brandSubtitle = escapeHtml(data.brand.brandSubtitle || "Documento não configurado");
  const legalName = escapeHtml(data.brand.legalName || "Dados da empresa configuráveis");
  const companyDocument = escapeHtml(data.brand.companyDocument || "CNPJ não configurado");
  const companyEmail = escapeHtml(data.brand.companyEmail || "E-mail não configurado");
  const companyAddress = escapeHtml(data.brand.companyAddress || "Endereço não configurado");
  const companyPhone = escapeHtml(data.brand.companyPhone || "Telefone não configurado");
  const primaryColor = escapeHtml(data.brand.primaryColorHex || "#1a56db");
  const documentFooterText = escapeHtml(data.brand.documentFooterText || "Gerado automaticamente pelo sistema.");
  const logoUrl = data.brand.logoUrl || null;

  // Client configurations
  const clientName = escapeHtml(data.client.tradeName || data.client.legalName || "Cliente");
  const clientDocument = escapeHtml(data.client.document || "Documento não configurado");
  const clientEmail = escapeHtml(data.client.email || "E-mail não configurado");

  // Invoice variables
  const invoiceNumber = escapeHtml(data.invoice.number);
  const invoiceStatus = escapeHtml(data.invoice.status);
  const issueDate = escapeHtml(data.invoice.issueDate);
  const dueDate = escapeHtml(data.invoice.dueDate);
  const paymentMethod = escapeHtml(data.invoice.paymentMethod);
  const pixKey = escapeHtml(data.invoice.pixKey || "Não configurada");
  const totalAmount = escapeHtml(data.invoice.totalAmount);
  const generatedAt = escapeHtml(data.generatedAt);

  // Responsible
  const responsible = data.responsible;
  const signatureName = responsible?.displayName
    ? escapeHtml(responsible.displayName)
    : escapeHtml(data.brand.signatureName);

  // Group items by type
  const services = data.invoice.items.filter(item => item.type === "SERVICE");
  const serviceSubtotal = services.reduce((sum, item) => sum + parseFloat(item.totalPrice.replace(/[^\d,.-]/g, "").replace(",", ".")), 0);
  const materials = data.invoice.items.filter(item => item.type === "MATERIAL");
  const materialSubtotal = materials.reduce((sum, item) => sum + parseFloat(item.totalPrice.replace(/[^\d,.-]/g, "").replace(",", ".")), 0);

  const formatBrl = (num: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  // Render items rows
  const itemsHtml = data.invoice.items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
        <strong style="color: #333; font-size: 10pt; display: block;">${escapeHtml(item.description)}</strong>
        <span style="font-size: 8pt; color: #888;">${item.type === "SERVICE" ? "Prestação de Serviços de TI" : "Fornecimento de Materiais"}</span>
      </td>
      <td style="padding: 10px 0; text-align: center; border-bottom: 1px solid #eee;">${escapeHtml(item.quantity)}</td>
      <td style="padding: 10px 0; text-align: center; border-bottom: 1px solid #eee;">${escapeHtml(item.unit || "UN")}</td>
      <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #eee;">${escapeHtml(item.unitPrice)}</td>
      <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">${escapeHtml(item.totalPrice)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Fatura Comercial #${invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.4;
      font-size: 10pt;
      background: white;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 210mm;
      height: 297mm;
      box-sizing: border-box;
      padding: 20mm;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .header-logo-cell {
      vertical-align: top;
    }
    .header-meta-cell {
      text-align: right;
      vertical-align: top;
      font-family: monospace;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 25px;
      width: 100%;
      border-collapse: collapse;
    }
    .meta-box td {
      padding: 4px 8px;
    }
    .meta-box-title {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-family: monospace;
    }
    .items-table th {
      border-bottom: 2px solid #e2e8f0;
      padding: 8px 0;
      font-size: 8pt;
      color: #64748b;
      font-family: sans-serif;
      text-transform: uppercase;
    }
    .totals-container {
      margin-top: 25px;
      border-top: 2px solid #1a1a1a;
      padding-top: 15px;
      text-align: right;
      font-family: monospace;
    }
    .totals-row {
      margin-bottom: 6px;
      font-size: 9pt;
      color: #4a5568;
    }
    .grand-total-row {
      font-size: 12pt;
      font-weight: bold;
      color: #000;
      margin-top: 10px;
    }
    .instructions-box {
      margin-top: 40px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      font-family: monospace;
      font-size: 8.5pt;
    }
    .signature-area {
      margin-top: auto;
      padding-top: 40px;
      text-align: center;
      width: 250mm;
      max-width: 280px;
      margin-left: auto;
      margin-right: auto;
    }
    .signature-line {
      border-top: 1px solid #a0aec0;
      padding-top: 5px;
      font-size: 9pt;
      font-weight: bold;
    }
    .footer {
      position: absolute;
      bottom: 20mm;
      left: 20mm;
      right: 20mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 8pt;
      color: #94a3b8;
      font-family: monospace;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header A4 -->
    <table class="header-table">
      <tr>
        <td class="header-logo-cell">
          ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="max-height: 48px; max-width: 160px; object-fit: contain; display: block; margin-bottom: 6px;" />` : ''}
          <span style="font-size: 18pt; font-weight: 800; color: #0f172a; display: block; tracking-tight: -0.5px;">${brandName}</span>
          <span style="font-size: 9pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 2px;">
            ${brandSubtitle}
          </span>
          <span style="font-size: 8.5pt; color: #475569; display: block; margin-top: 6px;">CNPJ: ${companyDocument}</span>
          <span style="font-size: 8.5pt; color: #475569; display: block;">${companyEmail} | ${companyPhone}</span>
          <span style="font-size: 8.5pt; color: #475569; display: block;">${companyAddress}</span>
        </td>
        <td class="header-meta-cell">
          <span style="font-size: 8.5pt; background: #0f172a; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; display: inline-block;">
            FATURA COMERCIAL
          </span>
          <span style="font-size: 14pt; font-weight: bold; color: #000; display: block; margin-top: 8px;">
            #${invoiceNumber}
          </span>
          <span style="font-size: 8.5pt; color: #64748b; display: block; margin-top: 6px;">
            Vencimento: <strong style="color: #0f172a;">${dueDate}</strong>
          </span>
          <span style="font-size: 8.5pt; color: #64748b; display: block;">
            Emissão: ${issueDate}
          </span>
        </td>
      </tr>
    </table>

    <!-- Client Info Block -->
    <table class="meta-box">
      <tr>
        <td colspan="2" class="meta-box-title" style="padding-bottom: 6px;">Destinatário / Cliente</td>
      </tr>
      <tr>
        <td style="font-size: 11pt; font-weight: bold; color: #0f172a; width: 60%;">${clientName}</td>
        <td style="font-size: 9.5pt; color: #475569; text-align: right;">${clientEmail}</td>
      </tr>
      <tr>
        <td style="font-size: 9.5pt; color: #475569;">CNPJ/CPF: ${clientDocument}</td>
        <td style="font-size: 9pt; color: #64748b; text-align: right;">Status: <strong style="color: #0f172a;">${invoiceStatus}</strong></td>
      </tr>
    </table>

    <!-- Items Section -->
    <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 10px;">
      Detalhamento de Serviços e Recursos Cobrados
    </div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: left; width: 50%;">Item / Descrição</th>
          <th style="text-align: center; width: 10%;">Qtd</th>
          <th style="text-align: center; width: 10%;">Un</th>
          <th style="text-align: right; width: 15%;">Valor Unit.</th>
          <th style="text-align: right; width: 15%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-container">
      <div class="totals-row">
        Subtotal de Serviços: <span style="font-weight: bold; min-width: 100px; display: inline-block;">${formatBrl(serviceSubtotal)}</span>
      </div>
      <div class="totals-row">
        Subtotal de Materiais: <span style="font-weight: bold; min-width: 100px; display: inline-block;">${formatBrl(materialSubtotal)}</span>
      </div>
      <div class="grand-total-row">
        Total Liquidado: <span style="font-weight: 800; min-width: 120px; display: inline-block;">${totalAmount}</span>
      </div>
    </div>

    <!-- Payments instructions -->
    <div class="instructions-box">
      <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #0f172a; margin-bottom: 6px;">
        Instruções de Pagamento e Recebimento
      </div>
      <div>Favorecido: ${legalName}</div>
      <div>Método preferencial de recebimento: ${paymentMethod}</div>
      <div style="font-weight: bold; margin-top: 4px; color: #0f172a;">Chave PIX: ${pixKey}</div>
    </div>

    <!-- Responsible Signature -->
    ${signatureName ? `
    <div class="signature-area">
      ${responsible?.signatureImageUrl && responsible.signatureEnabled ? `
        <img src="${escapeHtml(responsible.signatureImageUrl)}" alt="Assinatura" style="max-height: 50px; max-width: 200px; object-fit: contain; display: block; margin: 0 auto 8px;" />
      ` : ''}
      <div class="signature-line">${signatureName}</div>
      <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">${escapeHtml(responsible?.jobTitle || "Responsável Autorizado")}</div>
    </div>
    ` : ""}

    <!-- Footer -->
    <div class="footer">
      <span>${documentFooterText} | Gerado em: ${generatedAt}</span>
      <span>Página 1 de 1</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}

