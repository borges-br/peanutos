export type EmailSignature = {
  displayName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  registration: string;
  logoUrl: string | null;
};
const esc = (v: string) =>
  String(v || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function renderEmailSignature(s: EmailSignature, accent = "#0968c4") {
  const color = /^#[a-f\d]{6}$/i.test(accent) ? accent : "#0968c4";
  const safeLogo = (() => {
    try {
      const u = new URL(s.logoUrl || "");
      return u.protocol === "https:" && !u.username && !u.password
        ? u.href
        : null;
    } catch {
      return null;
    }
  })();
  const link = (label: string, url: string) =>
    `<a href="${esc(url)}" style="color:inherit;text-decoration:underline">${esc(label)}</a>`;
  const phone = (v: string) => link(v, "tel:" + v.replace(/[^\d+]/g, ""));
  const contacts = [
    s.email ? link(s.email, "mailto:" + s.email) : "",
    s.phone ? phone(s.phone) : "",
    s.whatsapp
      ? link(
          s.whatsapp + " (WhatsApp)",
          "https://wa.me/" + s.whatsapp.replace(/\D/g, ""),
        )
      : "",
    s.website && /^https:\/\//i.test(s.website)
      ? link(s.website, s.website)
      : "",
    esc(s.address),
  ].filter(Boolean);
  const html = `<table role="presentation" width="100%" style="width:100%;border-collapse:collapse;margin-top:28px;font:13px/1.6 Arial,Helvetica,sans-serif;color:inherit"><tr>${safeLogo ? `<td width="64" valign="top" style="width:64px;padding:4px 16px 0 0"><img src="${esc(safeLogo)}" alt="${esc(s.company)}" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:contain;border:0"></td>` : ""}<td style="border-left:3px solid ${color};padding-left:16px;overflow-wrap:anywhere;word-break:break-word"><strong style="font-size:17px">${esc(s.displayName)}</strong>${s.jobTitle || s.company ? `<div>${esc([s.jobTitle, s.company].filter(Boolean).join(" | "))}</div>` : ""}<div style="border-top:1px solid #c2cdd8;margin-top:10px;padding-top:10px">${contacts.join("<br>")}</div>${s.registration ? `<div style="margin-top:12px">${esc(s.registration)}</div>` : ""}</td></tr></table>`;
  return {
    html,
    text: [
      s.displayName,
      [s.jobTitle, s.company].filter(Boolean).join(" | "),
      s.email,
      s.phone,
      s.whatsapp ? s.whatsapp + " (WhatsApp)" : "",
      s.website,
      s.address,
      s.registration,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
