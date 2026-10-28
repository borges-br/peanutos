'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { dateKey } from '@peanut/utils/dist/timezone';
import { useWorkspaceFormatters } from '../../i18n/useWorkspaceFormatters';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const emailLabels: Record<string, string> = { NOT_REQUESTED: 'Manual', PAUSED: 'Envio pausado', QUEUED: 'Aguardando PDF/envio', SENDING: 'Enviando', SENT: 'Aceito pelo servidor', PARTIAL: 'Aceitação parcial', FAILED: 'Falha', UNKNOWN: 'Confirmação pendente', CANCELLED: 'Cancelado' };

export default function ContractBillingPanel({ contract, onSaved }: { contract: any; onSaved: () => Promise<void> }) {
  const { timeZone, formatDateTime, formatCalendarDate } = useWorkspaceFormatters();
  const [templates, setTemplates] = useState<any[]>([]);
  useEffect(() => { apiRequest('/financials/email-templates').then(data => setTemplates(data.data)).catch(() => {}); }, []);
  const [form, setForm] = useState<any>({});
  const [period, setPeriod] = useState(() => dateKey(new Date(), timeZone).slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    setForm({ title: contract.title, startDate: String(contract.startDate).slice(0, 10), endDate: contract.endDate?.slice(0, 10) || '', monthlyAmount: (contract.monthlyAmountCents / 100).toFixed(2), billingDay: contract.billingDay, billingIssueDay: contract.billingIssueDay || contract.billingDay, billingIssueTime: contract.billingIssueTime || '09:00', billingAutoIssue: contract.billingAutoIssue, billingAutoEmail: contract.billingAutoEmail, emails: (contract.billingEmailRecipients || []).join('\n'), phones: (contract.billingWhatsappNumbers || []).join('\n'), billingPaymentMethod: contract.billingPaymentMethod || 'PIX', billingPixKey: contract.billingPixKey || '', billingEmailTemplateId: contract.billingEmailTemplateId || '', gatewayBillingType: contract.gatewayBillingType || 'PIX' });
  }, [contract]);
  const change = (field: string, value: any) => { setForm((old: any) => ({ ...old, [field]: value })); setSuccess(''); };
  const split = (value: string) => value.split(/[\n;,]+/).map(part => part.trim()).filter(Boolean);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await apiRequest(`/contracts/${contract.id}`, { method: 'PATCH', body: JSON.stringify({
        title: form.title, startDate: form.startDate, endDate: form.endDate || null,
        monthlyAmountCents: Math.round(Number(form.monthlyAmount) * 100), billingDay: Number(form.billingDay),
        billingIssueDay: Number(form.billingIssueDay), billingIssueTime: form.billingIssueTime,
        billingAutoIssue: !!form.billingAutoIssue, billingAutoEmail: !!form.billingAutoEmail,
        billingEmailRecipients: split(form.emails), billingWhatsappNumbers: split(form.phones).map(phone => phone.replace(/\D/g, '')),
        gatewayBillingType: form.gatewayBillingType || 'PIX', billingEmailTemplateId: form.billingEmailTemplateId || null, billingPaymentMethod: form.billingPaymentMethod, billingPixKey: form.billingPixKey || null,
      }) });
      await onSaved(); setSuccess('Contrato salvo. Competências já preparadas conservam os valores e destinatários copiados; revise-as individualmente.');
    } catch (cause: any) { setError(cause.message || 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }
  async function prepare() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await apiRequest(`/contracts/${contract.id}/periods`, { method: 'POST', body: JSON.stringify({ periodKey: period }) });
      await onSaved();
      setSuccess(result.invoiceId ? `Competência ${period} disponível. Abra a fatura para incluir adicionais e conferir o agendamento.` : 'Esta competência foi cancelada ou ignorada e não será recriada automaticamente.');
    } catch (cause: any) { setError(cause.message || 'Não foi possível preparar a competência.'); }
    finally { setSaving(false); }
  }
  const recurring = (contract.lineItems || []).filter((item: any) => item.recurring && item.billingRole !== 'ADDON');
  const sum = recurring.reduce((total: number, item: any) => total + Math.round(Number(item.quantity) * item.unitPriceCents), 0);
  const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  return <div className="space-y-lg">
    <p className="text-sm text-on-surface-variant">A cobrança reúne a mensalidade, os adicionais recorrentes vigentes (com rateio conforme cada item) e os pontuais deste mês. Cadastre ou converta os recorrentes na aba Itens. O envio por WhatsApp continua manual.</p>
    {error && <p role="alert" className="text-error text-sm">{error}</p>}
    {success && <p role="status" className="text-success text-sm">{success}</p>}
    {recurring.length > 0 && sum !== contract.monthlyAmountCents && <p className="text-warning text-sm">Os itens fixos somam {money(sum)}, mas a mensalidade é {money(contract.monthlyAmountCents)}. Ajuste os itens ou a mensalidade antes de preparar o mês.</p>}
    <form onSubmit={save} className="space-y-md rounded-xl border border-outline-variant p-md">
      <h3 className="font-semibold">Mensalidade e programação</h3>
      <div className="grid md:grid-cols-3 gap-md">
        <Input label="Título" value={form.title || ''} onChange={event => change('title', event.target.value)} required minLength={3} />
        <Input label="Início" type="date" value={form.startDate || ''} onChange={event => change('startDate', event.target.value)} required />
        <Input label="Término (opcional)" type="date" value={form.endDate || ''} onChange={event => change('endDate', event.target.value)} />
        <Input label="Mensalidade fixa (R$)" type="number" min="0" step="0.01" value={form.monthlyAmount || ''} onChange={event => change('monthlyAmount', event.target.value)} required />
        <Input label="Dia de vencimento" type="number" min="1" max="31" value={form.billingDay || ''} onChange={event => change('billingDay', event.target.value)} required />
        <Input label="Dia de emissão/envio" type="number" min="1" max="31" value={form.billingIssueDay || ''} onChange={event => change('billingIssueDay', event.target.value)} required />
        <Input label={`Horário (${timeZone})`} type="time" value={form.billingIssueTime || '09:00'} onChange={event => change('billingIssueTime', event.target.value)} required />
        <Select label="Pagamento" value={form.billingPaymentMethod || 'PIX'} onChange={event => change('billingPaymentMethod', event.target.value)} options={[{ value: 'PIX', label: 'Pix' }, { value: 'TRANSFER', label: 'Transferência' }, { value: 'CASH', label: 'Dinheiro' }, { value: 'OTHER', label: 'Outro' }]} />
        <Input label="Chave Pix (opcional)" value={form.billingPixKey || ''} maxLength={100} onChange={event => change('billingPixKey', event.target.value)} />
      </div>
      <Select label="Forma sugerida para cobranças bancárias" value={form.gatewayBillingType || 'PIX'} onChange={event => change('gatewayBillingType', event.target.value)} options={[{ value: 'PIX', label: 'Pix' }, { value: 'BOLETO', label: 'Boleto' }]} />
      <p className="text-xs text-on-surface-variant">O padrão sugere a forma de pagamento; a criação da cobrança é escolhida individualmente em cada fatura.</p>
      <Select label="Modelo de email da cobrança" value={form.billingEmailTemplateId || ''} onChange={event => change('billingEmailTemplateId', event.target.value)} options={[{ value: '', label: 'Padrão do workspace' }, ...templates.map(row => ({ value: row.id, label: row.name }))]} />
      <a href="/dashboard/templates-email" className="text-primary underline text-sm">Criar ou editar templates de email</a>
      <div className="grid md:grid-cols-2 gap-md">
        <label className="text-sm space-y-xs"><span>Emails do financeiro e diretores (um por linha)</span><textarea value={form.emails || ''} onChange={event => change('emails', event.target.value)} rows={4} className="block w-full rounded border border-outline-variant bg-surface p-sm" /></label>
        <label className="text-sm space-y-xs"><span>WhatsApp para envio manual (com DDI, um por linha)</span><textarea value={form.phones || ''} onChange={event => change('phones', event.target.value)} rows={4} className="block w-full rounded border border-outline-variant bg-surface p-sm" /></label>
      </div>
      <label className="flex gap-sm items-center text-sm"><input type="checkbox" checked={!!form.billingAutoIssue} onChange={event => { change('billingAutoIssue', event.target.checked); if (!event.target.checked) change('billingAutoEmail', false); }} /> Emitir automaticamente as competências conferidas, na data programada</label>
      <label className="flex gap-sm items-center text-sm"><input type="checkbox" checked={!!form.billingAutoEmail} disabled={!form.billingAutoIssue} onChange={event => change('billingAutoEmail', event.target.checked)} /> Enviar por email após a emissão e a geração do PDF</label>
      <p className="text-xs text-on-surface-variant">Cada mês precisa ser conferido e agendado. O worker prepara o mês vigente em rascunho; você pode antecipar outros meses abaixo. Datas 29–31 são ajustadas ao último dia do mês. Se o vencimento preceder a emissão, será usado o mês seguinte. O email depende do SMTP configurado no servidor.</p>
      <Button type="submit" loading={saving} disabled={saving}>Salvar contrato</Button>
    </form>
    <div className="flex flex-wrap items-end gap-md">
      <Input label="Competência" type="month" value={period} onChange={event => setPeriod(event.target.value)} required />
      <Button onClick={prepare} loading={saving} disabled={saving || !period}>Preparar cobrança do mês</Button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left"><thead><tr className="border-b border-outline-variant"><th className="p-sm">Competência</th><th className="p-sm">Emissão programada</th><th className="p-sm">Vencimento</th><th className="p-sm">Total</th><th className="p-sm">Conferência / email</th><th className="p-sm">Fatura</th></tr></thead>
        <tbody>{(contract.billingScheduleEvents || []).map((event: any) => <tr key={event.id} className="border-b border-outline-variant/30">
          <td className="p-sm">{event.periodKey}</td><td className="p-sm">{formatDateTime(event.scheduledFor)}</td><td className="p-sm">{event.invoice ? formatCalendarDate(event.invoice.dueDate) : '--'}</td><td className="p-sm">{money(event.amountCents)}</td>
          <td className="p-sm">{event.status === 'CANCELLED' ? 'Cancelada' : event.needsRecurringRefresh ? 'Atualizar itens' : event.approvedAt ? 'Conferida' : 'A conferir'} · {emailLabels[event.emailStatus] || event.status}</td>
          <td className="p-sm">{event.invoiceId ? <a className="text-primary underline" href={`/dashboard/invoices/${event.invoiceId}`}>{event.invoice?.number || 'Abrir fatura'}</a> : 'Previsão antiga'}</td>
        </tr>)}</tbody>
      </table>
      {!contract.billingScheduleEvents?.length && <p className="py-md text-sm text-on-surface-variant">Nenhuma competência preparada. Salve a configuração e prepare o primeiro mês.</p>}
    </div>
  </div>;
}
