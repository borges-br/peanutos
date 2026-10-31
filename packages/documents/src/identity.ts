import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface DocumentVisual {
  font: "geist" | "source-sans-3" | "system";
  headingFont?: "inherit" | "geist" | "source-sans-3" | "system";
  bodySize?: number | null;
  headingSize?: number | null;
  logoWidth: number;
  logoHeight: number;
  alignment: "left" | "center" | "right";
  margin: number;
  accent: string;
  footer: string;
  style: "standard" | "editorial";
}
const fontCss: Record<string, string> = {};
export function documentFontCss(font = "source-sans-3") {
  if (font !== "geist" && font !== "source-sans-3") return "";
  if (fontCss[font] === undefined) {
    const files =
      font === "geist"
        ? [["geist.ttf", "100 900"]]
        : [
            ["SourceSans3-Regular.ttf", "400"],
            ["SourceSans3-Semibold.ttf", "600"],
          ];
    fontCss[font] = files
      .map(
        ([file, weight]) =>
          `@font-face{font-family:'${font === "geist" ? "Geist" : "Source Sans 3"}';font-style:normal;font-weight:${weight};src:url(data:font/ttf;base64,${readFileSync(join(__dirname, "../assets/fonts", String(file))).toString("base64")}) format('truetype');}`,
      )
      .join("\n");
  }
  return fontCss[font];
}
export function documentIdentityCss(visual?: DocumentVisual) {
  if (!visual) return "";
  const bounded = (n: number, min: number, max: number) =>
    Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
  const family = (font: string) =>
    font === "source-sans-3"
      ? "'Source Sans 3',Arial,sans-serif"
      : font === "geist"
        ? "'Geist',Arial,sans-serif"
        : "Arial,sans-serif";
  const headingFont =
    visual.headingFont && visual.headingFont !== "inherit"
      ? visual.headingFont
      : visual.font;
  const accent = /^#[0-9a-f]{6}$/i.test(visual.accent)
    ? visual.accent
    : "#0968C4";
  return `${[...new Set([visual.font, headingFont])].map(documentFontCss).join("\n")}
    body{font-family:${family(visual.font)};font-synthesis:none;${visual.bodySize == null ? "" : `font-size:${bounded(visual.bodySize, 9, 13)}pt;`}}
    .page-container [style*="font-family"]{font-family:${family(visual.font)} !important;font-variant-numeric:tabular-nums;}
    h1,h2,h3,.company-name,.brand-document-title{font-family:${family(headingFont)};}
    ${visual.headingSize == null ? "" : `h1,.brand-document-title{font-size:${bounded(visual.headingSize, 22, 34)}pt !important;}`}
    .page-container{padding:${bounded(visual.margin, 14, 28)}mm;}
    .brand-document-logo{width:${bounded(visual.logoWidth, 120, 320)}px;height:auto;max-height:${bounded(visual.logoHeight, 32, 100)}px;object-fit:contain;}
    .brand-document-heading{color:${accent};}
    .brand-logo-slot{text-align:${["left", "center", "right"].includes(visual.alignment) ? visual.alignment : "left"};}
    @media print{@page{margin:${bounded(visual.margin, 14, 28)}mm;} .page-container{padding:0;}}
  `;
}

const esc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export interface EditorialDocumentData {
  title: string;
  kind: "REPORT" | "PROPOSAL";
  number: string;
  project: string;
  date: string;
  status: string;
  company: {
    name: string;
    logo?: string | null;
    email?: string | null;
    website?: string | null;
  };
  client: string;
  sections: Array<{ title: string; body: string }>;
  visual: DocumentVisual;
  quote?: {
    number: string;
    total: string;
    items: Array<{ description: string; quantity: string; total: string }>;
  } | null;
}
/** Shared by the editor preview, finalized snapshot and print/PDF output. No user HTML is executed. */
export function renderEditorialDocument(data: EditorialDocumentData): string {
  const accent = /^#[0-9a-f]{6}$/i.test(data.visual.accent)
    ? data.visual.accent
    : "#0968C4";
  const content = data.sections
    .map(
      (s, i) =>
        `<section><h2><span>${String(i + 1).padStart(2, "0")} / </span>${esc(s.title)}</h2><p>${esc(s.body).replace(/\n/g, "<br>") || "—"}</p></section>`,
    )
    .join("");
  const quote = data.quote
    ? `<section><h2>Investimento</h2><p>Orçamento ${esc(data.quote.number)}</p><table><thead><tr><th>Descrição</th><th>Quantidade</th><th>Valor</th></tr></thead><tbody>${data.quote.items.map((i) => `<tr><td>${esc(i.description)}</td><td>${esc(i.quantity)}</td><td>${esc(i.total)}</td></tr>`).join("")}</tbody></table><p class="investment">Total: ${esc(data.quote.total)}</p></section>`
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.title)}</title><style>
  @page{size:A4;margin:20mm;} *{box-sizing:border-box;} body{margin:0;background:#fff;color:#1e2a38;font:11pt/1.55 Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page-container{width:210mm;min-height:297mm;padding:20mm;background:#fff;} header{padding-bottom:24px;border-bottom:2px solid ${accent};} .brand-document-logo{display:inline-block;} .company-name{font-size:20pt;font-weight:600;} .doc-meta{display:flex;justify-content:space-between;gap:16px;margin-top:20px;font-size:9pt;color:#526171;}
  h1{font-size:27pt;line-height:1.15;font-weight:600;margin:32px 0 20px;overflow-wrap:anywhere;} .details{display:flex;gap:40px;padding:16px 0 24px;border-bottom:1px solid #c6d0dc;} .details div{flex:1;min-width:0;overflow-wrap:anywhere;} .details small{display:block;color:#526171;font-size:9pt;margin-bottom:4px;} section{margin-top:28px;} h2{font-size:13pt;font-weight:600;margin:0 0 10px;break-after:avoid;} h2 span{color:${accent};} p{margin:0;white-space:normal;overflow-wrap:anywhere;orphans:3;widows:3;}
  table{width:100%;border-collapse:collapse;margin:12px 0;} th,td{padding:10px 8px;text-align:left;border-bottom:1px solid #c6d0dc;} th:last-child,td:last-child{text-align:right;} tr{break-inside:avoid;} thead{display:table-header-group;}.investment{font-weight:600;text-align:right;}
  footer{margin-top:36px;border-top:1px solid #c6d0dc;padding-top:12px;color:#526171;font-size:9pt;white-space:pre-line;overflow-wrap:anywhere;} .draft-mark{font-size:9pt;color:#526171;margin-top:24px;} @media print{.page-container{width:auto;min-height:0;padding:0;} .draft-mark{display:none;}}
  ${documentIdentityCss(data.visual)}
  ${data.visual.style === "editorial" ? "header{border-bottom-width:3px;} h1{letter-spacing:-.5px;} h2{color:" + accent + ";}" : ""}
  </style></head><body><article class="page-container"><header><div class="brand-logo-slot">${data.company.logo ? `<img class="brand-document-logo" src="${esc(data.company.logo)}" alt="${esc(data.company.name)}">` : `<strong class="company-name">${esc(data.company.name)}</strong>`}</div><div class="doc-meta"><span>${data.kind === "REPORT" ? "RELATÓRIO TÉCNICO" : "PROPOSTA TÉCNICA E COMERCIAL"}</span><span>${esc(data.number)} · ${esc(data.date)}</span></div></header><h1>${esc(data.title)}</h1><div class="details"><div><small>Cliente</small>${esc(data.client)}</div><div><small>Projeto</small>${esc(data.project || "Não informado")}</div></div>${content}${quote}<footer>${esc(data.visual.footer || [data.company.name, data.company.website, data.company.email].filter(Boolean).join(" / "))}</footer>${data.status === "DRAFT" ? '<p class="draft-mark">Rascunho · Revise antes de finalizar.</p>' : ""}</article></body></html>`;
}
