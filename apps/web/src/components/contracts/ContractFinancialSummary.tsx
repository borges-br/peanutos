'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dateKey } from '@peanut/utils/dist/timezone';
import { apiRequest } from '../../lib/api';
import { useWorkspaceFormatters } from '../../i18n/useWorkspaceFormatters';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function ContractFinancialSummary({ contract, onSaved }: { contract: any; onSaved: () => Promise<void> }) {
  const { timeZone } = useWorkspaceFormatters();
  const router = useRouter();
  const [period, setPeriod] = useState(() => dateKey(new Date(), timeZone).slice(0, 7));
  const [summary, setSummary] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const revision = JSON.stringify([contract.updatedAt, contract.lineItems, contract.billingScheduleEvents]);
  useEffect(() => {
    let current = true; setSummary(null); setError('');
    apiRequest(`/financials/contracts/${contract.id}/summary?period=${period}`).then(data => { if (current) setSummary(data); }).catch(cause => { if (current) setError(cause.message); });
    return () => { current = false; };
  }, [contract.id, revision, period]);
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);
  async function preview() {
    setBusy(true); setError('');
    try {
      const event = summary.invoiceId ? { invoiceId: summary.invoiceId } : await apiRequest(`/contracts/${contract.id}/periods`, { method: 'POST', body: JSON.stringify({ periodKey: period }) });
      if (!event.invoiceId) throw new Error('Competência cancelada ou ignorada. Confira o histórico.');
      await onSaved(); router.push(`/dashboard/invoices/${event.invoiceId}/preview`);
    } catch (cause: any) { setError(cause.message); } finally { setBusy(false); }
  }
  return <section className="border border-outline-variant rounded-xl p-md space-y-md" aria-label="Total da cobrança do contrato">
    <div className="flex flex-wrap items-end justify-between gap-md"><div><h3 className="font-semibold">Total por competência</h3><p className="text-xs text-on-surface-variant">Mensalidade e adicionais vigentes, com o rateio escolhido para cada item.</p></div><Input label="Mês da cobrança" type="month" value={period} onChange={e => setPeriod(e.target.value)} required /></div>
    {error && <p role="alert" className="text-error">{error}</p>}
    {summary && <><dl className="grid grid-cols-2 md:grid-cols-5 gap-md">{[['Mensalidade', summary.baseCents], ['Adicionais recorrentes', summary.recurringCents], ['Pontuais do mês', summary.extraCents], ['Descontos', -summary.discountCents], ['Total do mês', summary.totalCents]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-on-surface-variant">{label}</dt><dd className={`font-mono mt-xs ${label === 'Total do mês' ? 'text-xl font-bold text-primary' : 'text-base'}`}>{money(Number(value))}</dd></div>)}</dl>
      <p className="text-xs text-on-surface-variant">{summary.source === 'INVOICE' ? 'Valores da fatura salva desta competência.' : 'Projeção pelas regras atuais. Pontuais e descontos entram após preparar o rascunho.'}</p>
      {summary.needsRecurringRefresh && <p role="status" className="text-warning text-sm">As regras mudaram. O total salvo ainda é {money(summary.totalCents)}; a mensalidade com recorrentes pelas regras atuais soma {money(summary.ruleTotalCents)}, antes dos pontuais e descontos. Atualize os itens na fatura e confira novamente.</p>}
      {summary.warning && <p className="text-warning text-sm">{summary.warning}</p>}
      {!summary.covered && <p className="text-warning text-sm">O contrato não está ativo ou não cobre esta competência.</p>}
      <div className="flex flex-wrap gap-sm"><Button onClick={preview} disabled={busy || (!summary.invoiceId && (!summary.covered || !!summary.warning))} loading={busy}>{summary.invoiceId ? 'Visualizar PDF da competência' : 'Preparar rascunho e visualizar PDF'}</Button>{summary.invoiceId && <a className="text-primary underline self-center text-sm" href={`/dashboard/invoices/${summary.invoiceId}`}>Abrir fatura e revisar envio</a>}</div>
      <p className="text-xs text-on-surface-variant">A prévia não emite a fatura nem envia email. Preparar cria apenas um rascunho salvo.</p>
    </>}
  </section>;
}
