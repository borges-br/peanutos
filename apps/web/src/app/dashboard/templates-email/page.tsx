'use client';
import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { DEFAULT_BILLING_EMAIL, BILLING_EMAIL_VARIABLES } from '@peanut/utils/dist/billing-email';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import RestrictedState from '../../../components/ui/RestrictedState';

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const allowed = !!user && ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role);
  const [templates, setTemplates] = useState<any[]>([]), [selected, setSelected] = useState('');
  const [form, setForm] = useState<any>({ ...DEFAULT_BILLING_EMAIL, isDefault: false });
  const [preview, setPreview] = useState<any>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [mobile, setMobile] = useState(false);
  const message = useRef<HTMLTextAreaElement>(null);
  const load = () => apiRequest('/financials/email-templates').then(data => setTemplates(data.data));
  useEffect(() => { if (allowed) load().catch(cause => setError(cause.message)); }, [allowed]);
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    const timer = setTimeout(() => { apiRequest('/financials/email-templates/preview', { method: 'POST', body: JSON.stringify({ subject: form.subject, body: form.body }) }).then(data => { if (current) { setPreview(data); setError(''); } }).catch(cause => { if (current) { setPreview(null); setError(cause.message); } }); }, 350);
    return () => { current = false; clearTimeout(timer); };
  }, [form.subject, form.body, allowed]);
  const change = (key: string, value: any) => { setForm((old: any) => ({ ...old, [key]: value })); setNotice(''); };
  function select(id: string) { setSelected(id); setNotice(''); setError(''); setForm(id ? { ...templates.find(row => row.id === id) } : { ...DEFAULT_BILLING_EMAIL, name: '', isDefault: false }); }
  function insert(before: string, after = '') {
    const field = message.current; const start = field?.selectionStart || 0, end = field?.selectionEnd || start;
    change('body', form.body.slice(0, start) + before + form.body.slice(start, end) + after + form.body.slice(end));
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + before.length, end + before.length); });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const row = await apiRequest(`/financials/email-templates${selected ? `/${selected}` : ''}`, { method: selected ? 'PATCH' : 'POST', body: JSON.stringify(form) }); await load(); setSelected(row.id); setForm(row); setNotice('Modelo salvo. Cobranças já conferidas mantêm o conteúdo aprovado.'); }
    catch (cause: any) { setError(cause.message); } finally { setBusy(false); }
  }
  if (!user) return <p>Carregando…</p>;
  if (!allowed) return <RestrictedState title="Acesso restrito" description="Modelos de cobrança estão disponíveis aos perfis financeiros." />;
  return <div className="space-y-lg"><header><h1 className="text-2xl font-semibold">Templates de email</h1><p className="text-sm text-on-surface-variant">Crie modelos para as cobranças e confira a prévia antes do envio. O PDF da fatura acompanha a mensagem.</p></header>
    <label className="block text-sm">Modelo salvo<select aria-label="Modelo salvo" value={selected} onChange={e => select(e.target.value)} className="block w-full md:w-96 border border-outline-variant rounded p-sm bg-surface mt-xs"><option value="">Criar novo modelo</option>{templates.map(row => <option key={row.id} value={row.id}>{row.name}{row.isDefault ? ' · Padrão' : ''}</option>)}</select></label>
    {error && <p role="alert" className="text-error">{error}</p>}{notice && <p role="status" className="text-success">{notice}</p>}
    <div className="grid xl:grid-cols-2 gap-lg items-start"><form onSubmit={save} className="space-y-md border border-outline-variant rounded-xl p-md">
      <Input label="Nome do modelo" value={form.name} onChange={e => change('name', e.target.value)} maxLength={100} required />
      <Input label="Assunto do email" value={form.subject} onChange={e => change('subject', e.target.value)} maxLength={200} required />
      <div className="flex flex-wrap gap-sm"><Button type="button" variant="secondary" onClick={() => insert('**', '**')}>Negrito</Button><Button type="button" variant="secondary" onClick={() => insert('[', '](https://exemplo.com)')}>Link</Button>{BILLING_EMAIL_VARIABLES.map(key => <Button key={key} type="button" variant="ghost" onClick={() => insert(`{${key}}`)}>{`{${key}}`}</Button>)}</div>
      <label className="block text-sm">Mensagem<textarea ref={message} aria-label="Mensagem do email" rows={15} maxLength={10000} required value={form.body} onChange={e => change('body', e.target.value)} className="block w-full border border-outline-variant rounded p-sm bg-surface mt-xs" /></label>
      <p className="text-xs text-on-surface-variant">Linha em branco cria um parágrafo. Use **negrito**, links https:// e as variáveis acima. HTML é exibido como texto.</p>
      <label className="flex gap-sm text-sm"><input type="checkbox" checked={form.isDefault} onChange={e => change('isDefault', e.target.checked)} />Usar como padrão quando o contrato não escolher outro modelo</label>
      <Button type="submit" loading={busy} disabled={busy || !preview}>Salvar modelo</Button>
    </form><section className="space-y-sm"><div className="flex flex-wrap items-center justify-between gap-sm"><h2 className="font-semibold">Como o email será exibido</h2><Button variant="secondary" onClick={() => setMobile(!mobile)}>{mobile ? 'Ver desktop' : 'Ver celular'}</Button></div><p className="text-xs text-on-surface-variant">Exemplo com dados fictícios. Na fatura, a prévia usa cliente, valores e vencimento reais.</p>{preview && <><p className="text-sm"><strong>Assunto:</strong> {preview.subject}</p><iframe title="Prévia do template de email" sandbox="" srcDoc={preview.html} className="border border-outline-variant rounded bg-white h-[700px] max-w-full" style={{ width: mobile ? 375 : '100%' }} /><details><summary className="text-sm cursor-pointer">Versão em texto</summary><pre className="whitespace-pre-wrap text-sm p-md">{preview.text}</pre></details></>}</section></div>
  </div>;
}
