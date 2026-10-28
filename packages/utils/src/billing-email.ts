export const BILLING_EMAIL_VARIABLES = ['cliente', 'fatura', 'contrato', 'competencia', 'total', 'vencimento', 'empresa', 'fuso'] as const;
export const DEFAULT_BILLING_EMAIL = {
  name: 'Cobrança mensal',
  subject: 'Fatura {fatura} | {competencia} | {empresa}',
  body: 'Olá, {cliente}.\n\nSegue em anexo a fatura **{fatura}**, referente ao contrato {contrato}, competência {competencia}.\n\n**Total: {total}**\nVencimento: {vencimento}\n\nA mensalidade e os adicionais estão discriminados no mesmo PDF.\n\nAtenciosamente,\n{empresa}',
};
export type BillingEmailContent = { subject: string; body: string };
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function validateBillingEmail(content: BillingEmailContent) {
  if (typeof content?.subject !== 'string' || !content.subject.trim() || content.subject.length > 200 || /[\r\n\u0000-\u001f\u007f]/.test(content.subject)) throw new Error('Assunto inválido. Use até 200 caracteres em uma linha.');
  if (typeof content.body !== 'string' || !content.body.trim() || content.body.length > 10000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content.body)) throw new Error('Mensagem inválida. Use até 10.000 caracteres.');
  for (const match of `${content.subject}\n${content.body}`.matchAll(/\{([a-z_]+)\}/gi)) if (!(BILLING_EMAIL_VARIABLES as readonly string[]).includes(match[1]!)) throw new Error(`Variável desconhecida: {${match[1]}}.`);
  return { subject: content.subject.trim(), body: content.body.trim().replace(/\r\n?/g, '\n') };
}
export function renderBillingEmail(content: BillingEmailContent, values: Record<string, string>) {
  content = validateBillingEmail(content);
  const vars = (value: string, html: boolean) => value.replace(/\{([a-z_]+)\}/g, (_, key) => html ? escape(values[key] || '') : (values[key] || ''));
  // Render template markup first, then substitute escaped data: customer names cannot introduce formatting or links.
  const inline = (value: string) => {
    let out = '', cursor = 0;
    for (const match of value.matchAll(/\*\*([^*\n]{1,500})\*\*|\[([^\]\n]{1,200})\]\((https:\/\/[^\s)]{1,500})\)/g)) {
      out += escape(value.slice(cursor, match.index)); cursor = match.index! + match[0].length;
      if (match[1]) out += `<strong>${escape(match[1])}</strong>`;
      else {
        let url: URL | null = null; try { url = new URL(match[3]!); } catch {}
        out += url && !url.username && !url.password ? `<a href="${escape(url.href)}" style="color:#2455a6">${escape(match[2])}</a>` : escape(match[0]);
      }
    }
    return vars(out + escape(value.slice(cursor)), true);
  };
  const subject = vars(content.subject, false).replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').slice(0, 500);
  let text = vars(content.body.replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, '$1 ($2)'), false);
  let paragraphs = content.body.split(/\n{2,}/).map(part => `<p style="margin:0 0 18px;line-height:1.6">${part.split('\n').map(inline).join('<br>')}</p>`).join('');
  if (values.link_pagamento && /^https:\/\/([a-z0-9-]+\.)*asaas\.com\//i.test(values.link_pagamento)) {
    paragraphs += `<p style="margin-top:24px"><a href="${escape(values.link_pagamento)}" style="display:inline-block;padding:12px 18px;background:#2455a6;color:white;text-decoration:none;border-radius:4px">Consultar cobrança e pagamento</a></p>`;
    text += `\n\nConsultar cobrança e pagamento: ${values.link_pagamento}`;
  }
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"></head><body style="margin:0;background:#f3f5f7;color:#202a36;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:white"><tr><td style="padding:24px;border-bottom:3px solid #2455a6;font-weight:bold">${escape(values.empresa)}</td></tr><tr><td style="padding:24px;font-size:15px">${paragraphs}</td></tr><tr><td style="padding:16px 24px;background:#eaf0f5;color:#526171;font-size:12px">Fatura ${escape(values.fatura)} · ${escape(values.competencia)} · Fuso: ${escape(values.fuso)}<br>O demonstrativo da cobrança acompanha esta mensagem em PDF.</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
