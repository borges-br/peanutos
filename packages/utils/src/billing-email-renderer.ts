export const BILLING_EMAIL_VARIABLES = [
  "cliente",
  "fatura",
  "contrato",
  "competencia",
  "total",
  "vencimento",
  "empresa",
  "fuso",
] as const;
export const DEFAULT_BILLING_EMAIL = {
  name: "Cobrança mensal",
  subject: "Fatura {fatura} | {competencia} | {empresa}",
  body: "Olá, {cliente}.\n\nSegue em anexo a fatura **{fatura}**, referente ao contrato {contrato}, competência {competencia}.\n\n**Total: {total}**\nVencimento: {vencimento}\n\nA mensalidade e os adicionais estão discriminados no mesmo PDF.\n\nAtenciosamente,\n{empresa}",
};
export type BillingEmailContent = { subject: string; body: string };
export type BillingEmailAppearance = {
  name: string;
  subtitle?: string;
  logoUrl: string | null;
  logoWidth: number;
  logoHeight: number;
  alignment: "left" | "center";
  padding: number;
  canvas: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
};
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const color = (value: string | undefined, fallback: string) =>
  /^#[a-f\d]{6}$/i.test(value || "") ? value! : fallback;
function imageUrl(value: string | null | undefined, allowData = false) {
  if (allowData && /^data:image\/png;base64,[a-z\d+/=]+$/i.test(value || ""))
    return value!;
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function validateBillingEmail(content: BillingEmailContent) {
  if (
    typeof content?.subject !== "string" ||
    !content.subject.trim() ||
    content.subject.length > 200 ||
    /[\r\n\u0000-\u001f\u007f]/.test(content.subject)
  )
    throw new Error("Assunto inválido. Use até 200 caracteres em uma linha.");
  if (
    typeof content.body !== "string" ||
    !content.body.trim() ||
    content.body.length > 10000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content.body)
  )
    throw new Error("Mensagem inválida. Use até 10.000 caracteres.");
  for (const match of `${content.subject}\n${content.body}`.matchAll(
    /\{([a-z_]+)\}/gi,
  ))
    if (!(BILLING_EMAIL_VARIABLES as readonly string[]).includes(match[1]!))
      throw new Error(`Variável desconhecida: {${match[1]}}.`);
  return {
    subject: content.subject.trim(),
    body: content.body.trim().replace(/\r\n?/g, "\n"),
  };
}
/** Shared by template previews, invoice previews and SMTP delivery. */
export function renderBillingEmail(
  content: BillingEmailContent,
  values: Record<string, string>,
  appearance?: BillingEmailAppearance | null,
  images: Record<string, string> = {},
) {
  content = validateBillingEmail(content);
  if (appearance) values = { ...values, empresa: appearance.name };
  const accent = color(appearance?.accent, "#2455a6");
  const vars = (value: string, html: boolean) =>
    value.replace(/\{([a-z_]+)\}/g, (_, key) =>
      html ? escape(values[key] || "") : values[key] || "",
    );
  const usedImages: string[] = [];
  const inline = (value: string) => {
    let out = "",
      cursor = 0;
    const pattern =
      /!\[([^\]\n]{0,200})\]\((https:\/\/[^\s)]{1,1000})\)|\*\*([^*\n]{1,500})\*\*|\[([^\]\n]{1,200})\]\((https:\/\/[^\s)]{1,500})\)/g;
    for (const match of value.matchAll(pattern)) {
      out += escape(value.slice(cursor, match.index));
      cursor = match.index! + match[0].length;
      if (match[2]) {
        const src = imageUrl(images[match[2]]);
        if (!src)
          throw new Error(
            "Uma imagem do email não está publicada na biblioteca da empresa.",
          );
        usedImages.push(src);
        out += `<img src="${escape(src)}" alt="${escape(match[1])}" width="500" border="0" style="display:block;width:100%;max-width:500px;height:auto;border:0;margin:12px 0">`;
      } else if (match[3]) out += `<strong>${escape(match[3])}</strong>`;
      else {
        let url: URL | null = null;
        try {
          url = new URL(match[5]!);
        } catch {}
        out +=
          url && !url.username && !url.password
            ? `<a href="${escape(url.href)}" style="color:${accent}">${escape(match[4])}</a>`
            : escape(match[0]);
      }
    }
    return vars(out + escape(value.slice(cursor)), true);
  };
  const subject = vars(content.subject, false)
    .replace(/[\r\n\u0000-\u001f\u007f]/g, " ")
    .slice(0, 500);
  let text = vars(
    content.body
      .replace(/!\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)/g, "$1 ($2)")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, "$1 ($2)"),
    false,
  );
  let paragraphs = content.body
    .split(/\n{2,}/)
    .map(
      (part) =>
        `<p style="margin:0 0 18px;line-height:1.6">${part.split("\n").map(inline).join("<br>")}</p>`,
    )
    .join("");
  if (
    values.link_pagamento &&
    /^https:\/\/([a-z0-9-]+\.)*asaas\.com\//i.test(values.link_pagamento)
  ) {
    paragraphs += `<p style="margin-top:24px"><a href="${escape(values.link_pagamento)}" style="display:inline-block;padding:12px 18px;background:${accent};color:${color(appearance?.onAccent, "#FFFFFF")};text-decoration:none;border-radius:4px">Consultar cobrança e pagamento</a></p>`;
    text += `\n\nConsultar cobrança e pagamento: ${values.link_pagamento}`;
  }
  const logo = imageUrl(appearance?.logoUrl, true);
  if (logo) usedImages.push(logo);
  const origins = Array.from(
    new Set(
      usedImages
        .filter((src) => src.startsWith("https:"))
        .map((src) => new URL(src).origin),
    ),
  ).join(" ");
  const csp = `default-src 'none'; style-src 'unsafe-inline'; img-src data: ${origins}`;
  const canvas = color(appearance?.canvas, "#f3f5f7"),
    surface = color(appearance?.surface, "#ffffff"),
    ink = color(appearance?.text, "#202a36"),
    muted = color(appearance?.muted, "#526171");
  const padding = Math.min(40, Math.max(16, appearance?.padding || 24));
  const logoWidth = Math.min(280, Math.max(120, appearance?.logoWidth || 220));
  const header = logo
    ? `<img src="${escape(logo)}" alt="${escape(appearance!.name)}" width="${logoWidth}" height="${Math.max(1, Math.round(appearance!.logoHeight))}" border="0" style="display:block;width:${logoWidth}px;max-width:100%;height:auto;border:0;outline:none">${appearance?.subtitle ? `<div style="margin-top:12px;font-size:12px;font-weight:normal;line-height:1.5;color:${muted}">${escape(appearance.subtitle)}</div>` : ""}`
    : escape(values.empresa);
  const alignment = appearance?.alignment === "center" ? "center" : "left";
  const centeredHeader =
    alignment === "center"
      ? `<table role="presentation" align="center" style="border-collapse:collapse;margin:0 auto"><tr><td align="center">${header}</td></tr></table>`
      : header;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"></head><body style="margin:0;background:${canvas};color:${ink};font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" style="width:100%;border-collapse:collapse"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" align="center" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:${surface}"><tr><td align="${alignment}" style="padding:${padding}px;border-bottom:3px solid ${accent};font-weight:bold">${centeredHeader}</td></tr><tr><td style="padding:${padding}px;font-size:15px">${paragraphs}</td></tr><tr><td style="padding:16px ${padding}px;background:${appearance ? canvas : "#eaf0f5"};color:${muted};font-size:12px;line-height:1.6">Fatura ${escape(values.fatura)} · ${escape(values.competencia)} · Fuso: ${escape(values.fuso)}<br>O demonstrativo da cobrança acompanha esta mensagem em PDF.</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
