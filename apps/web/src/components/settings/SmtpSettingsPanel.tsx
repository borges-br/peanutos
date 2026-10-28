'use client';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

export default function SmtpSettingsPanel({ canEdit }: { canEdit: boolean }) {
  const [form, setForm] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  const load = () => apiRequest('/settings/email').then(data => {
    setForm(data); setPassword(''); setClearPassword(false); setDirty(false);
  }).catch(e => setError(e.message));
  useEffect(() => { mounted.current = true; if (canEdit) load(); return () => { mounted.current = false; }; }, [canEdit]);
  if (!canEdit) return <Card title="Servidor de email"><p>Apenas administradores podem configurar o SMTP.</p></Card>;
  const change = (key: string, value: any) => { setForm((old: any) => ({ ...old, [key]: value })); setDirty(true); setNotice(''); };
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const { enabled, host, port, security, username, fromEmail, fromName, replyTo, revision } = form;
      const saved = await apiRequest('/settings/email', { method: 'PATCH', body: JSON.stringify({ enabled, host, port, security, username, fromEmail, fromName, replyTo, revision, ...(password ? { password } : {}), clearPassword }) });
      setForm(saved); setPassword(''); setClearPassword(false); setDirty(false); setNotice('Configuração SMTP salva.');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function testConnection() {
    setTesting(true); setError(''); setNotice('Verificando conexão e autenticação…');
    try {
      const { jobId } = await apiRequest('/settings/email/test', { method: 'POST' });
      for (let i = 0; i < 55; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!mounted.current) return;
        const job = await apiRequest(`/settings/email/test/${encodeURIComponent(jobId)}`);
        if (job.result) {
          if (job.result.status === 'SUCCESS') setNotice(job.result.message);
          else { setNotice(''); setError(job.result.message); }
          await load(); return;
        }
      }
      setNotice('O teste ainda está na fila. Verifique se o worker está ativo e recarregue para consultar o resultado.');
    } catch (e: any) { setNotice(''); setError(e.message); }
    finally { if (mounted.current) setTesting(false); }
  }
  return <Card title="Servidor de email (SMTP)">
    <p className="text-sm text-on-surface-variant mb-md">Configure o envio de faturas desta empresa. A senha fica criptografada e nunca é exibida novamente.</p>
    {error && <p role="alert" className="text-error mb-md">{error}</p>}
    {notice && <p role="status" className="text-primary mb-md">{notice}</p>}
    {!form ? <Button onClick={load} variant="secondary">Carregar configuração SMTP</Button> :
      <form onSubmit={save} className="space-y-md">
        <fieldset disabled={busy || testing} className="space-y-md disabled:opacity-60">
          <label className="flex items-center gap-sm"><input type="checkbox" checked={form.enabled} onChange={e => change('enabled', e.target.checked)} />Ativar envio de emails</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <Input label="Servidor SMTP" value={form.host} onChange={e => change('host', e.target.value)} placeholder="smtp.exemplo.com" maxLength={253} required={form.enabled} />
            <Input label="Porta" type="number" min={1} max={65535} value={form.port} onChange={e => change('port', Number(e.target.value))} required />
            <Select label="Segurança da conexão" value={form.security} onChange={e => change('security', e.target.value)} options={[{ value: 'STARTTLS', label: 'STARTTLS (geralmente porta 587)' }, { value: 'TLS', label: 'TLS direto (geralmente porta 465)' }]} />
            <Input label="Usuário SMTP" autoComplete="off" value={form.username} onChange={e => change('username', e.target.value)} maxLength={254} />
            <Input label="Nova senha SMTP" type="password" autoComplete="new-password" value={password} disabled={clearPassword} onChange={e => { setPassword(e.target.value); setDirty(true); }} maxLength={2048} placeholder={form.hasPassword ? 'Em branco mantém a senha atual' : 'Informe a senha'} />
            <div className="text-sm space-y-sm"><p>{form.hasPassword ? 'Senha cadastrada.' : 'Nenhuma senha cadastrada.'}</p><label className="flex items-center gap-sm"><input type="checkbox" checked={clearPassword} onChange={e => { setClearPassword(e.target.checked); if (e.target.checked) setPassword(''); setDirty(true); }} />Remover senha salva</label></div>
            <Input label="Email do remetente" type="email" value={form.fromEmail} onChange={e => change('fromEmail', e.target.value)} required={form.enabled} maxLength={254} />
            <Input label="Nome do remetente" value={form.fromName} onChange={e => change('fromName', e.target.value)} maxLength={150} />
            <Input label="Email para respostas (opcional)" type="email" value={form.replyTo} onChange={e => change('replyTo', e.target.value)} maxLength={254} />
          </div>
          <p className="text-sm text-on-surface-variant">Sem usuário, o servidor deve permitir relay autenticado pela rede. O teste verifica conexão e autenticação, sem enviar email; a aceitação do remetente e a entrega precisam ser verificadas com uma fatura de homologação.</p>
          {form.lastTestAt && <p className="text-sm">Último teste desta configuração: {form.lastTestStatus === 'SUCCESS' ? 'conexão verificada' : 'falhou'}. {form.lastTestError}</p>}
        </fieldset>
        <div className="flex flex-wrap gap-sm">
          <Button type="submit" disabled={busy || testing || !dirty}>{busy ? 'Salvando…' : 'Salvar SMTP'}</Button>
          <Button type="button" variant="secondary" onClick={testConnection} disabled={busy || testing || dirty || !form.host || !form.fromEmail}>{testing ? 'Testando…' : 'Testar conexão salva'}</Button>
          <Button type="button" variant="secondary" disabled={busy || testing} onClick={() => { if (!dirty || confirm('Descartar as alterações não salvas?')) load(); }}>Recarregar SMTP</Button>
        </div>
        {dirty && <p className="text-sm text-on-surface-variant">Salve as alterações antes de testar.</p>}
      </form>}
  </Card>;
}
