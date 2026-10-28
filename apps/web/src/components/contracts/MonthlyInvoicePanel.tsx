'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { dateKey } from '@peanut/utils/dist/timezone';
import { useWorkspaceFormatters } from '../../i18n/useWorkspaceFormatters';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const labels: Record<string, string> = { NOT_REQUESTED: 'Envio manual', PAUSED: 'SMTP desativado ou indisponível', QUEUED: 'Aguardando PDF/envio', SENDING: 'Enviando', SENT: 'Aceito pelo servidor SMTP', PARTIAL: 'Aceitação parcial', FAILED: 'Falha no envio', UNKNOWN: 'Confirmação pendente', CANCELLED: 'Cancelado' };

export default function MonthlyInvoicePanel({ invoice, onReload }: { invoice: any; onReload: () => Promise<void> }) {
  const { timeZone, localDateTimeToIso, formatDateTime } = useWorkspaceFormatters();
  const event = invoice.billingScheduleEvent;
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!event) return;
    const date = new Date(event.scheduledFor);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    setForm({ scheduled: `${dateKey(date, timeZone)}T${time}`, dueDate: invoice.dueDate.slice(0, 10), emails: event.emailRecipients.join('\n'), paymentMethod: invoice.paymentMethod, pixKey: invoice.pixKey || '', observations: invoice.observations || '', discountAmount: Number(invoice.discountAmount || 0) });
    setDirty(false);
  }, [invoice, timeZone, event]);
  if (!event) return null;
  const change = (key: string, value: any) => { setForm((old: any) => ({ ...old, [key]: value })); setDirty(true); };
  async function action(operation: string) {
    setSaving(true); setError('');
    try {
      if (operation === 'save') await apiRequest(`/invoices/${invoice.id}`, { method: 'PATCH', body: JSON.stringify({ scheduledFor: localDateTimeToIso(form.scheduled), dueDate: `${form.dueDate}T00:00:00.000Z`, emailRecipients: form.emails.split(/[\n;,]+/).map((email: string) => email.trim()).filter(Boolean), paymentMethod: form.paymentMethod, pixKey: form.pixKey || null, observations: form.observations || null, discountAmount: Number(form.discountAmount) }) });
      if (operation === 'approve') await apiRequest(`/invoices/${invoice.id}/approve-monthly`, { method: 'POST' });
      if (operation === 'refresh-base') {
        if (!window.confirm('Atualizar os itens fixos deste rascunho com o contrato atual? Os adicionais serão preservados e a conferência será desfeita.')) return;
        await apiRequest(`/invoices/${invoice.id}`, { method: 'PATCH', body: JSON.stringify({ refreshBase: true }) });
      }
      if (operation === 'retry') {
        if (!window.confirm(event.emailStatus === 'UNKNOWN' ? 'O servidor pode ter aceitado o email anterior. Confira a caixa de saída antes de continuar. Confirmar nova tentativa?' : 'Tentar novamente somente para os destinatários ainda não aceitos?')) return;
        await apiRequest(`/invoices/${invoice.id}/retry-email`, { method: 'POST', body: JSON.stringify({ confirmResend: true }) });
      }
      await onReload();
    } catch (cause: any) { setError(cause.message || 'Não foi possível atualizar a cobrança.'); }
    finally { setSaving(false); }
  }
  return <section className="rounded-xl border border-primary/30 bg-surface p-md space-y-md select-text">
    <div className="flex flex-wrap justify-between gap-sm"><h3 className="font-semibold">Cobrança mensal · {event.periodKey}</h3><div className="flex flex-wrap gap-sm items-center"><a href={`/dashboard/contracts/${invoice.contractId}`} className="text-primary underline text-sm">Contrato {event.contract?.number}</a><Button variant="ghost" onClick={onReload} disabled={saving || dirty}>Atualizar situação</Button></div></div>
    <p className="text-sm text-on-surface-variant">A mensalidade fixa está preservada. Adicione serviços e materiais na aba Itens; eles valem somente para esta competência. Chamado e O.S. são opcionais.</p>
    {error && <p role="alert" className="text-error text-sm">{error}</p>}
    {invoice.status === 'DRAFT' && <>
      <div className="grid md:grid-cols-3 gap-md">
        <Input label={`Emissão/envio (${timeZone})`} type="datetime-local" value={form.scheduled || ''} onChange={value => change('scheduled', value.target.value)} />
        <Input label="Vencimento" type="date" value={form.dueDate || ''} onChange={value => change('dueDate', value.target.value)} />
        <Input label="Desconto deste mês (R$)" type="number" min="0" step="0.01" value={form.discountAmount ?? 0} onChange={value => change('discountAmount', value.target.value)} />
        <Select label="Pagamento" value={form.paymentMethod || 'PIX'} onChange={value => change('paymentMethod', value.target.value)} options={[{ value: 'PIX', label: 'Pix' }, { value: 'TRANSFER', label: 'Transferência' }, { value: 'CASH', label: 'Dinheiro' }, { value: 'OTHER', label: 'Outro' }]} />
        <Input label="Chave Pix" value={form.pixKey || ''} onChange={value => change('pixKey', value.target.value)} />
      </div>
      <div className="grid md:grid-cols-2 gap-md">
        <label className="text-sm">Destinatários deste mês (um email por linha)<textarea className="block w-full rounded border border-outline-variant bg-surface p-sm" rows={3} value={form.emails || ''} onChange={value => change('emails', value.target.value)} /></label>
        <label className="text-sm">Observações do mês<textarea className="block w-full rounded border border-outline-variant bg-surface p-sm" rows={3} value={form.observations || ''} onChange={value => change('observations', value.target.value)} /></label>
      </div>
      <div className="flex flex-wrap gap-sm">
        <Button onClick={() => action('save')} loading={saving} disabled={saving}>Salvar rascunho</Button>
        <Button variant="secondary" onClick={() => action('approve')} disabled={saving || dirty || !!event.approvedAt}>Conferir e agendar</Button>
        <Button variant="ghost" onClick={() => action('refresh-base')} disabled={saving || dirty}>Atualizar mensalidade do contrato</Button>
        <a className="text-primary underline text-sm self-center" href={`/dashboard/invoices/${invoice.id}/preview`}>Conferir prévia do PDF</a>
      </div>
      <p className="text-xs text-on-surface-variant">{event.approvedAt ? `Conferida em ${formatDateTime(event.approvedAt)}.` : 'Aguardando conferência.'} Qualquer alteração no rascunho exige nova conferência. {event.contract?.billingAutoIssue ? 'A emissão ocorrerá na data programada.' : 'Emissão automática desativada no contrato; use Emitir na data programada.'} {event.contract?.billingAutoEmail ? 'Email automático ativado.' : 'Email automático desativado.'}</p>
      {new Date(event.scheduledFor) < new Date() && <p className="text-warning text-xs">A data programada já passou. Ao conferir, a cobrança poderá ser emitida na próxima execução do worker.</p>}
    </>}
    <div className="text-sm space-y-xs"><p>Email: <strong>{labels[event.emailStatus] || event.emailStatus}</strong></p><p>Destinatários: {event.emailRecipients.join(', ') || 'Nenhum configurado'}</p>{event.emailLastError && <p className="text-warning">{event.emailLastError}</p>}{event.emailSentAt && <p>Última aceitação pelo servidor: {formatDateTime(event.emailSentAt)}. A aceitação SMTP não confirma leitura ou entrega na caixa de entrada.</p>}
      {['FAILED', 'PARTIAL', 'UNKNOWN'].includes(event.emailStatus) && invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && <Button variant="secondary" onClick={() => action('retry')} disabled={saving}>Nova tentativa de email</Button>}
    </div>
    {invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && <div className="text-sm space-y-sm"><p>WhatsApp manual: baixe o PDF na prévia e anexe à conversa.</p><div className="flex flex-wrap gap-sm">{(event.contract?.billingWhatsappNumbers || []).map((phone: string) => <a key={phone} className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Olá! Segue a fatura ${invoice.number}, referente à competência ${event.periodKey}.`)}`}>Abrir WhatsApp · {phone}</a>)}<a className="text-primary underline" href={`/dashboard/invoices/${invoice.id}/preview`}>Abrir PDF para baixar</a></div></div>}
  </section>;
}
