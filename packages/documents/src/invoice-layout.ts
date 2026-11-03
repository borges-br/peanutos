/** Invoice-only styles. A4 geometry is shared by the browser preview and PDF. */
export function invoiceLayoutCss(margin: number, accent: string): string {
  const safeMargin = Number.isFinite(margin)
    ? Math.max(14, Math.min(28, margin))
    : 20;
  return `
    .invoice-document.page-container{--invoice-margin:${safeMargin}mm;--invoice-accent:${accent};padding:0;display:block;}
    .invoice-flow{padding:var(--invoice-margin);}
    .invoice-document .block-container{margin-bottom:14px!important;box-sizing:border-box;min-width:0;}
    .invoice-document .block-invoice-issuer>.block-container:last-child{margin-bottom:0!important;}
    .invoice-document .block-items-table table{table-layout:fixed;}
    .invoice-document .block-items-table td{overflow-wrap:anywhere;}
    .invoice-document .block-items-table td:not(:first-child){font-size:9pt;}
    .invoice-document .block-items-table td:nth-child(n+4){white-space:normal;overflow-wrap:anywhere;}
    .invoice-document .block-billing-closing{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;}
    .invoice-document .block-billing-closing>.block-container{margin-bottom:0!important;}
    .invoice-document .block-financial-summary td:first-child{display:none;}
    .invoice-document .block-financial-summary td:last-child{width:100%!important;}
    .invoice-document .financial-total{font-size:13pt!important;}
    .invoice-document .financial-total-value{min-width:0!important;}
    .invoice-document .invoice-discount-reason{font-size:8.5pt;line-height:1.4;color:#475569;overflow-wrap:anywhere;margin-top:6px;}
    .invoice-document .block-payment-info{overflow-wrap:anywhere;}
    .invoice-document .block-footer{margin:0!important;padding:5px 0 0!important;display:block!important;font-size:7.5pt!important;line-height:1.3;color:#64748b!important;overflow-wrap:anywhere;}
    .invoice-page{width:210mm;height:297mm;box-sizing:border-box;padding:var(--invoice-margin);display:flex;flex-direction:column;background:#fff;position:relative;margin-bottom:16px;}
    .invoice-page:last-child{margin-bottom:0;}
    .invoice-page-body{flex:none;display:flow-root;}
    .invoice-page-footer{margin-top:auto;padding-top:8px;flex:none;}
    .invoice-page-number{display:block;text-align:right;font-size:7.5pt;line-height:1.4;color:#64748b;margin-top:4px;}
    .invoice-page-reference{font-size:9pt;line-height:1.4;font-weight:600;color:#334155;border-left:3px solid var(--invoice-accent);background:#f8fafc;padding:7px 10px;margin:0 0 8px;}
    .invoice-continuation-heading{margin:0 0 18px;padding:0 0 14px;border-bottom:2px solid var(--invoice-accent);flex:none;}
    .invoice-continuation-top{display:flex;justify-content:space-between;gap:20px;align-items:baseline;font-size:9pt;color:#475569;}
    .invoice-continuation-brand{font-size:12pt;font-weight:700;color:#0f172a;}
    .invoice-continuation-heading h2{font-size:18pt;color:#0f172a;margin:12px 0;line-height:1.15;}
    .invoice-continuation-meta{display:grid;grid-template-columns:1.1fr 1.6fr .8fr;gap:16px;font-size:9pt;line-height:1.4;overflow-wrap:anywhere;}
    .invoice-continuation-meta small{display:block;font-size:7.5pt;text-transform:uppercase;color:#64748b;margin-bottom:3px;}
    .invoice-density-compact .block-container{margin-bottom:8px!important;}
    .invoice-density-compact .block-invoice-issuer{display:grid;grid-template-columns:minmax(0,34%) minmax(0,1fr);gap:16px;align-items:center;}
    .invoice-density-compact .block-invoice-issuer>.block-logo{margin:0!important;}
    .invoice-density-compact .brand-document-logo{max-width:100%;}
    .invoice-density-compact .block-items-table tbody td{padding-top:5px!important;padding-bottom:5px!important;}
    .invoice-density-compact .block-items-table th{padding-top:6px!important;padding-bottom:6px!important;}
    .invoice-density-compact .block-client-info td{padding:8px 10px!important;}
    .invoice-density-compact .block-document-title{padding-bottom:5px!important;}
    .invoice-density-compact .block-responsible-signature,.invoice-density-compact .block-client-signature{margin-top:14px!important;}
    .invoice-closing-only .invoice-continuation-heading h2{font-size:24pt;}
    .invoice-closing-only .block-billing-closing{display:block;margin-top:22px!important;}
    .invoice-closing-only .block-financial-summary{border:1px solid #cbd5e1;border-radius:8px;padding:20px;}
    .invoice-document .invoice-closing-only .block-billing-closing>.block-financial-summary{margin-bottom:24px!important;}
    .invoice-closing-only .block-financial-summary td:last-child{font-size:10pt!important;line-height:1.7!important;}
    .invoice-closing-only .financial-total{font-size:16pt!important;margin-top:14px!important;padding-top:14px!important;}
    .invoice-closing-only .financial-total-value{font-size:26pt!important;display:block!important;line-height:1.2;margin-top:6px;}
    .invoice-closing-only .block-payment-info{padding:20px!important;font-size:10pt!important;line-height:1.7!important;}
    @media print{
      @page invoice-sheet{size:A4;margin:0;}
      .invoice-flow{padding:0;}
      .invoice-document[data-paginated="true"]{width:210mm;min-height:0;padding:0!important;}
      .invoice-page{page:invoice-sheet;margin:0;break-after:page;page-break-after:always;}
      .invoice-page:last-child{break-after:auto;page-break-after:auto;}
    }
  `;
}
