'use client';
import React, { useEffect, useState } from 'react';
import { dateKey } from '@peanut/utils/dist/timezone';
import { apiRequest } from '../../lib/api';
import { useWorkspaceFormatters } from '../../i18n/useWorkspaceFormatters';
import Input from '../ui/Input';

export default function FinancialForecast() {
  const { timeZone, formatCalendarDate } = useWorkspaceFormatters();
  const [period, setPeriod] = useState(() => { const current = dateKey(new Date(), timeZone); const [year, month] = current.split('-').map(Number); return new Date(Date.UTC(year!, month!, 1)).toISOString().slice(0, 7); });
  const [data, setData] = useState<any>(null), [error, setError] = useState('');
  useEffect(() => { let active = true; setData(null); setError(''); apiRequest(`/financials/forecast?period=${period}`).then(result => { if (active) setData(result); }).catch(cause => { if (active) setError(cause.message); }); return () => { active = false; }; }, [period]);
  const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const kinds: Record<string, string> = { PROJECTED: 'Contrato a preparar', DRAFT: 'Fatura em rascunho', OPEN: 'Fatura emitida em aberto' };
  const table = (rows: any[], overdue = false) => <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b border-outline-variant"><th className="p-sm">Cliente / origem</th><th className="p-sm">Vencimento</th><th className="p-sm">Situação</th><th className="p-sm text-right">Valor</th><th className="p-sm">Abrir</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b border-outline-variant/30"><td className="p-sm">{row.customer}<span className="block text-xs text-on-surface-variant">{row.description}</span></td><td className="p-sm whitespace-nowrap">{formatCalendarDate(row.dueDate)}</td><td className="p-sm">{overdue ? `${row.daysOverdue} dias de atraso` : kinds[row.kind]}</td><td className="p-sm font-mono text-right whitespace-nowrap">{money(row.amountCents)}</td><td className="p-sm"><a className="text-primary underline" href={row.invoiceId ? `/dashboard/invoices/${row.invoiceId}` : `/dashboard/contracts/${row.contractId}`}>{row.invoiceId ? 'Fatura' : 'Contrato'}</a></td></tr>)}</tbody></table></div>;
  return <section className="border border-outline-variant rounded-xl p-md space-y-md" aria-label="Previsão de recebimentos">
    <div className="flex flex-wrap items-end justify-between gap-md"><div><h3 className="font-semibold text-lg">Previsão de recebimentos</h3><p className="text-xs text-on-surface-variant">Por vencimento, incluindo adicionais vigentes. Uma fatura substitui a projeção do mesmo contrato e competência.</p></div><Input label="Mês previsto" type="month" value={period} onChange={e => setPeriod(e.target.value)} required /></div>
    {error && <p role="alert" className="text-error">{error}</p>}
    {data && <><dl className="grid grid-cols-2 md:grid-cols-4 gap-md">{[['Contratos a preparar', data.projectedCents], ['Rascunhos', data.draftCents], ['Emitidas em aberto', data.openCents], ['Total previsto', data.expectedCents]].map(([label, value]) => <div key={label}><dt className="text-xs text-on-surface-variant">{label}</dt><dd className="text-xl font-mono font-semibold mt-xs">{money(Number(value))}</dd></div>)}</dl><p className="text-xs text-on-surface-variant">Previsão não significa recebimento confirmado. Rascunhos podem mudar; contratos sem competência preparada não incluem pontuais futuros.</p>
      {data.warnings.map((warning: string) => <p key={warning} className="text-warning text-sm">{warning}</p>)}
      {data.rows.length ? table(data.rows) : <p className="text-sm text-on-surface-variant">Nenhum recebimento previsto para este mês.</p>}
      <div className="pt-md border-t border-outline-variant"><h4 className="font-semibold">Vencidos e não pagos: {money(data.overdueCents)}</h4><p className="text-xs text-on-surface-variant mb-sm">Atrasos até hoje, separados da previsão mensal. Se você selecionar um mês passado, uma fatura pode aparecer também na lista daquele mês; os totais não devem ser somados.</p>{data.overdue.length ? table(data.overdue, true) : <p className="text-sm text-on-surface-variant">Nenhuma fatura vencida em aberto.</p>}</div>
    </>}
  </section>;
}
