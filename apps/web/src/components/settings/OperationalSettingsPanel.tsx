'use client';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

const fields = [
  { key: 'sessionDurationMinutes', label: 'Duração da sessão (minutos)', min: 10, max: 1440 },
  { key: 'invoiceDueSoonOffsetHours', label: 'Avisar fatura a vencer com antecedência de (horas)', min: 1, max: 720 },
  { key: 'contractEndingSoonDays', label: 'Avisar encerramento de contrato com antecedência de (dias)', min: 0, max: 365 },
  { key: 'ticketFeedbackAfterHours', label: 'Solicitar feedback após resolução do chamado (horas)', min: 1, max: 720 },
  { key: 'automationIntervalMinutes', label: 'Verificar alertas a cada (minutos)', min: 5, max: 1440 },
  { key: 'webhookMaxAttempts', label: 'Máximo de tentativas por webhook', min: 1, max: 10 },
  { key: 'webhookTimeoutMs', label: 'Tempo limite de resposta do webhook (milissegundos)', min: 1000, max: 60000 },
];
export default function OperationalSettingsPanel({ canEdit }: { canEdit: boolean }) {
  const [form, setForm] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (canEdit) apiRequest('/settings/operations').then(setForm).catch(e => setError(e.message)); }, [canEdit]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { setForm(await apiRequest('/settings/operations', { method: 'PATCH', body: JSON.stringify(form) })); setNotice('Configurações de operação salvas.'); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Card title="Sessão e automações">
    {!canEdit ? <p>Apenas administradores podem configurar a operação.</p> : <>
      {error && <p role="alert" className="text-error mb-md">{error}</p>}
      {notice && <p role="status" className="text-primary mb-md">{notice}</p>}
      {!form ? <p>Carregando configurações…</p> : <form onSubmit={save} className="space-y-lg">
        <fieldset disabled={busy} className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {fields.map(field => <Input key={field.key} label={field.label} type="number" min={field.min} max={field.max} step={1} required value={form[field.key]} onChange={e => { setForm({ ...form, [field.key]: Number(e.target.value) }); setNotice(''); }} />)}
        </fieldset>
        <p className="text-sm text-on-surface-variant">A duração vale para sessões criadas ou renovadas após salvar. Os alertas são enviados aos webhooks configurados para cada evento. O limite de tentativas vale para novas entregas; a cobrança mensal continua verificando a data programada a cada minuto.</p>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar operação'}</Button>
      </form>}
    </>}
  </Card>;
}
