'use client';
import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { useWorkspaceFormatters } from '../../i18n/useWorkspaceFormatters';
import Select from '../ui/Select';
import Button from '../ui/Button';
const labels: Record<string, string> = { REQUESTED: 'Programada para a emissão', CREATING: 'Criação em andamento', UNKNOWN: 'Confirmação pendente · conciliar', FAILED: 'Falha conhecida', ACTIVE: 'Aguardando pagamento', OVERDUE: 'Vencida', CONFIRMED: 'Pagamento confirmado; saldo ainda não disponível', RECEIVED: 'Recebida', REFUNDED: 'Estornada', CANCELLED: 'Cancelada no provedor', REVIEW: 'Revisão necessária' };
export default function InvoiceGatewayPanel({ invoice, onReload }: { invoice: any; onReload: () => Promise<void> }) {
  const { formatDateTime } = useWorkspaceFormatters();
  const [data, setData] = useState<any>(null), [connectionId, setConnectionId] = useState(''), [billingType, setBillingType] = useState('PIX');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const load = () => apiRequest(`/financials/invoices/${invoice.id}/charges`).then(result => { setData(result); setBillingType(result.suggestedType); });
  useEffect(() => { load().catch(cause => setError(cause.message)); }, [invoice.id]);
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  async function create() {
    const connection = data.connections.find((row: any) => row.id === connectionId);
    if (!connection || !confirm(`${invoice.status === 'DRAFT' ? 'Programar para a emissão a' : 'Criar'} cobrança ${billingType === 'PIX' ? 'Pix' : 'por boleto'} de ${money(Math.round(Number(invoice.totalAmount) * 100))} no ASAAS (${connection.environment === 'PRODUCTION' ? 'PRODUÇÃO · COBRANÇA REAL' : 'SANDBOX · SIMULAÇÃO'}) para esta fatura?`)) return;
    setBusy(true); setError('');
    try { await apiRequest(`/financials/invoices/${invoice.id}/charges`, { method: 'POST', body: JSON.stringify({ connectionId, billingType }) }); await load(); await onReload(); }
    catch (cause: any) { setError(cause.message); await load(); } finally { setBusy(false); }
  }
  async function cancelRequest(id: string) { setBusy(true); setError(''); try { await apiRequest(`/financials/charges/${id}/cancel-request`, { method: 'POST' }); await load(); await onReload(); } catch (cause: any) { setError(cause.message); } finally { setBusy(false); } }
  async function reconcile(id: string) { setBusy(true); setError(''); try { await apiRequest(`/financials/charges/${id}/reconcile`, { method: 'POST' }); await load(); await onReload(); } catch (cause: any) { setError(cause.message); } finally { setBusy(false); } }
  return <section className="border border-outline-variant rounded-xl p-md space-y-md"><h3 className="font-semibold">Cobrança bancária desta fatura</h3><p className="text-sm text-on-surface-variant">Escolha individualmente se esta fatura terá cobrança no gateway. Criar a cobrança não confirma pagamento.</p>{error && <p role="alert" className="text-error">{error}</p>}
    {invoice.status === 'DRAFT' && <p className="text-xs text-on-surface-variant">Você pode programar a geração para depois da emissão. A programação não contata o ASAAS agora e exige conferir novamente o rascunho.</p>}
    {data && <><div className="grid md:grid-cols-3 items-end gap-md"><Select label="Conexão para a cobrança" value={connectionId} onChange={e => setConnectionId(e.target.value)} options={[{ value: '', label: 'Selecionar conexão' }, ...data.connections.map((row: any) => ({ value: row.id, label: `${row.provider} · ${row.environment === 'PRODUCTION' ? 'Produção' : 'Sandbox'}` }))]} /><Select label="Forma de pagamento bancária" value={billingType} onChange={e => setBillingType(e.target.value)} options={[{ value: 'PIX', label: 'Pix' }, { value: 'BOLETO', label: 'Boleto' }]} /><Button onClick={create} disabled={busy || !connectionId || !['DRAFT', 'ISSUED', 'OVERDUE'].includes(invoice.status)} loading={busy}>{invoice.status === 'DRAFT' ? 'Programar cobrança na emissão' : 'Gerar cobrança no ASAAS'}</Button></div>
      {!data.connections.length && <a className="text-primary underline text-sm" href="/dashboard/configuracoes?tab=integracoes">Configurar integração bancária</a>}
      {data.data.map((charge: any) => <article key={charge.id} className="border-t border-outline-variant pt-md space-y-sm"><div className="flex flex-wrap justify-between gap-sm"><h4 className="font-semibold">{charge.connection.provider} · {charge.connection.environment === 'SANDBOX' ? 'SIMULAÇÃO SANDBOX' : 'PRODUÇÃO'} · {charge.billingType}</h4><span>{money(charge.amountCents)}</span></div><p className="text-sm">{labels[charge.state] || charge.state}</p><p className="text-xs text-on-surface-variant">Referência: <code className="select-text">{charge.externalReference}</code></p>{charge.lastError && <p className="text-warning text-sm">{charge.lastError}</p>}
        <div className="flex flex-wrap gap-sm">{charge.paymentUrl && <a className="text-primary underline text-sm" href={charge.paymentUrl} target="_blank" rel="noopener noreferrer">Abrir página de pagamento</a>}{charge.bankSlipUrl && <a className="text-primary underline text-sm" href={charge.bankSlipUrl} target="_blank" rel="noopener noreferrer">Abrir boleto</a>}{charge.state === 'REQUESTED' && invoice.status === 'DRAFT' ? <Button variant="secondary" disabled={busy} onClick={() => cancelRequest(charge.id)}>Remover programação</Button> : <Button variant="secondary" disabled={busy} onClick={() => reconcile(charge.id)}>Conciliar situação no provedor</Button>}</div>
        {charge.connection.environment === 'SANDBOX' && <p className="text-xs text-on-surface-variant">Simulações não dão baixa na fatura e não entram nos recebimentos reais.</p>}
        {charge.entries.length > 0 && <ul className="text-xs space-y-xs">{charge.entries.map((entry: any) => <li key={entry.id}>{formatDateTime(entry.occurredAt)} · {entry.description} · Principal: {money(entry.principalCents)} · Líquido: {entry.netCents === null ? 'A conferir no provedor' : money(entry.netCents)}</li>)}</ul>}
      </article>)}
    </>}
  </section>;
}
