'use client';
import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
export default function BillingGatewaySettings({ canEdit }: { canEdit: boolean }) {
  const [environment, setEnvironment] = useState('SANDBOX'), [rows, setRows] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState(''), [token, setToken] = useState(''), [enabled, setEnabled] = useState(false);
  const [info, setInfo] = useState<any>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const current = rows.find(row => row.environment === environment);
  const load = () => apiRequest('/financials/gateways').then(setRows);
  useEffect(() => { if (canEdit) load().catch(cause => setError(cause.message)); }, [canEdit]);
  useEffect(() => { setApiKey(''); setToken(''); setEnabled(current?.enabled || false); setInfo(null); if (current?.id && canEdit) apiRequest(`/financials/gateways/${current.id}/webhook-info`).then(setInfo).catch(cause => setError(cause.message)); }, [environment, current?.revision, current?.id, canEdit]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await apiRequest('/financials/gateways', { method: 'PUT', body: JSON.stringify({ provider: 'ASAAS', environment, revision: current?.revision || 0, enabled, ...(apiKey ? { apiKey } : {}), ...(token ? { webhookToken: token } : {}) }) }); await load(); setApiKey(''); setToken(''); setNotice('Conexão salva. Credenciais ficam cifradas no banco e não são devolvidas pela API.'); }
    catch (cause: any) { setError(cause.message); } finally { setBusy(false); }
  }
  async function test() { setBusy(true); setError(''); try { const result = await apiRequest(`/financials/gateways/${current.id}/test`, { method: 'POST' }); setNotice(result.message); } catch (cause: any) { setError(cause.message); } finally { setBusy(false); } }
  if (!canEdit) return <p className="text-sm text-on-surface-variant">Somente proprietário e administradores configuram integrações bancárias.</p>;
  return <section className="border border-outline-variant rounded-xl p-md space-y-md"><h3 className="font-semibold">Cobranças bancárias · ASAAS</h3><p className="text-sm text-on-surface-variant">Pix e boleto por fatura. Sandbox e produção têm chaves e webhooks independentes. Outros bancos exigem seu próprio adaptador de integração.</p>
    {error && <p role="alert" className="text-error">{error}</p>}{notice && <p role="status" className="text-success text-sm">{notice}</p>}
    <form onSubmit={save} className="space-y-md"><Select label="Ambiente do ASAAS" value={environment} onChange={e => setEnvironment(e.target.value)} options={[{ value: 'SANDBOX', label: 'Sandbox · testes sem baixa real' }, { value: 'PRODUCTION', label: 'Produção · cobranças reais' }]} />
      <div className="grid md:grid-cols-2 gap-md"><Input label={`Chave de API${current?.hasApiKey ? ' (salva; deixe vazio para manter)' : ''}`} type="password" autoComplete="new-password" value={apiKey} onChange={e => setApiKey(e.target.value)} /><Input label={`Token de autenticação do webhook${current?.hasWebhookToken ? ' (salvo; deixe vazio para manter)' : ''}`} type="password" autoComplete="new-password" value={token} minLength={32} maxLength={255} onChange={e => setToken(e.target.value)} /></div>
      <p className="text-xs text-on-surface-variant">Use um token de webhook diferente da chave de API, com 32–255 caracteres sem espaços. Cadastre o mesmo token na configuração de webhook do ASAAS. Campos vazios preservam as credenciais já salvas.</p>
      <label className="flex gap-sm text-sm"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Habilitar esta conexão para novas cobranças</label>
      <div className="flex flex-wrap gap-sm"><Button type="submit" loading={busy} disabled={busy}>Salvar integração</Button><Button type="button" variant="secondary" onClick={test} disabled={busy || !current?.hasApiKey || !!apiKey}>Testar autenticação salva</Button></div>
    </form>
    {info && <div className="space-y-xs text-sm"><p><strong>URL do webhook:</strong></p><code className="block break-all select-text">{info.url || info.path}</code><p className="text-xs text-on-surface-variant">No ASAAS, configure esta URL no ambiente selecionado, com o token salvo acima e os eventos: {info.events.join(', ')}. O recebimento confirmado será conciliado pelo worker. O teste de autenticação não testa o webhook.</p></div>}
  </section>;
}
