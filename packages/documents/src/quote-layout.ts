/** Quote pages share the measured paginator without changing the invoice layout. */
export function quoteLayoutCss(margin: number, accent: string): string {
  const safeMargin = Number.isFinite(margin)
    ? Math.max(14, Math.min(28, margin))
    : 20;
  return `
    .quote-document.page-container{--quote-margin:${safeMargin}mm;--quote-accent:${accent};padding:0;display:block;}
    .quote-document .invoice-flow{padding:var(--quote-margin);}
    .quote-document .block-items-table table{table-layout:fixed;}
    .quote-document .block-items-table td{overflow-wrap:anywhere;}
    .quote-document .block-footer{margin:0!important;padding:8px 0 0!important;display:block!important;font-size:7.5pt!important;line-height:1.4;overflow-wrap:anywhere;}
    .quote-document .invoice-page{width:210mm;height:297mm;box-sizing:border-box;padding:var(--quote-margin);display:flex;flex-direction:column;background:#fff;position:relative;margin-bottom:16px;}
    .quote-document .invoice-page:last-child{margin-bottom:0;}
    .quote-document .invoice-page-body{flex:none;display:flow-root;}
    .quote-document .invoice-page-footer{margin-top:auto;padding-top:8px;flex:none;}
    .quote-document .invoice-page-number{display:block;text-align:right;font-size:7.5pt;line-height:1.4;color:#64748b;margin-top:4px;}
    .quote-document .invoice-continuation-heading{margin:0 0 20px;padding:0 0 14px;border-bottom:2px solid var(--quote-accent);flex:none;}
    .quote-document .invoice-continuation-top{display:flex;justify-content:space-between;gap:20px;font-size:9pt;color:#475569;}
    .quote-document .invoice-continuation-brand{font-size:12pt;font-weight:700;color:#0f172a;}
    .quote-document .invoice-continuation-heading h2{font-size:16pt;color:#0f172a;margin:12px 0;line-height:1.2;}
    .quote-document .invoice-continuation-meta{display:grid;grid-template-columns:1.1fr 1.6fr .8fr;gap:16px;font-size:9pt;line-height:1.4;overflow-wrap:anywhere;}
    .quote-document .invoice-continuation-meta small{display:block;font-size:7.5pt;text-transform:uppercase;color:#64748b;margin-bottom:3px;}
    @media print{
      @page quote-sheet{size:A4;margin:0;}
      .quote-document .invoice-flow{padding:0;}
      .quote-document[data-paginated="true"]{width:210mm;min-height:0;padding:0!important;}
      .quote-document .invoice-page{page:quote-sheet;margin:0;break-after:page;page-break-after:always;}
      .quote-document .invoice-page:last-child{break-after:auto;page-break-after:auto;}
    }
  `;
}
