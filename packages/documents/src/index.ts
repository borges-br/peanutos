// ==============================================================================
// PEANUT OS - DOCUMENTS & PRINT TEMPLATES
// ==============================================================================

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
          <div class="brand">${data.brandName}</div>
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
    Peanut OS - Sistema de Gestão Operacional de TI. Imutável e auditável.
  </footer>
</body>
</html>
  `.trim();
}
