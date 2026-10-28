'use client';

import { useWorkspaceFormatters } from '../../../../i18n/useWorkspaceFormatters';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { apiRequest } from '../../../../lib/api';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';

export const dynamic = 'force-dynamic';

const WEBHOOK_EVENTS = [
  { value: 'invoice.created', label: 'Fatura criada' },
  { value: 'invoice.status_changed', label: 'Status de fatura alterado' },
  { value: 'document.generated', label: 'Documento PDF gerado' },
  { value: 'ticket.created', label: 'Chamado criado' },
  { value: 'ticket.status_changed', label: 'Status de chamado alterado' },
  { value: 'user.created', label: 'Usuário criado' },
  { value: 'user.role_changed', label: 'Papel de usuário alterado' },
  { value: 'client.created', label: 'Cliente criado' },
  { value: 'client.updated', label: 'Cliente atualizado' },
  { value: 'contract.created', label: 'Contrato criado' },
  { value: 'contract.status_changed', label: 'Status de contrato alterado' },
];

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  PENDING:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  RETRYING:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FAILED:    'bg-red-500/15 text-red-400 border-red-500/20',
  CANCELLED: 'bg-outline-variant/20 text-on-surface-variant border-outline-variant/30',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || STATUS_COLORS.CANCELLED;
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Delivery {
  id: string;
  eventType: string;
  status: string;
  attempt: number;
  maxAttempts: number;
  responseStatus: number | null;
  errorMessage: string | null;
  createdAt: string;
  deliveredAt: string | null;
  payload?: unknown;
}

export default function WebhookDetailPage({ params }: { params: { id: string } }) {
  const { formatDate, formatDateTime } = useWorkspaceFormatters();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user && ['OWNER', 'ADMIN'].includes(user.role);

  const [webhook, setWebhook] = useState<WebhookEndpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Deliveries
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Secret rotation
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/webhooks/${params.id}`);
      setWebhook(data);
    } catch (err: any) {
      setError(err.message || 'Webhook não encontrado');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    try {
      const result = await apiRequest(`/webhooks/${params.id}/deliveries?limit=20`);
      setDeliveries(result.data || []);
    } catch {
      setDeliveries([]);
    } finally {
      setDeliveriesLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
    loadDeliveries();
  }, [load, loadDeliveries]);

  const openEdit = () => {
    if (!webhook) return;
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormEvents(webhook.events);
    setFormActive(webhook.isActive);
    setSaveError(null);
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formEvents.length === 0) { setSaveError('Selecione ao menos um evento.'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      await apiRequest(`/webhooks/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: formName, url: formUrl, events: formEvents, isActive: formActive }),
      });
      setEditing(false);
      load();
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!webhook) return;
    try {
      await apiRequest(`/webhooks/${webhook.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRotate = async () => {
    if (!confirm('Rotacionar o segredo? O segredo atual será invalidado imediatamente.')) return;
    try {
      const result = await apiRequest(`/webhooks/${params.id}/rotate-secret`, { method: 'POST' });
      setRevealedSecret(result.secret);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTest = async () => {
    if (!webhook?.isActive) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiRequest(`/webhooks/${params.id}/test`, { method: 'POST' });
      setTestResult({ ok: true, msg: `Teste enfileirado. ID: ${result.deliveryId}` });
      setTimeout(loadDeliveries, 2000);
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Erro ao enviar teste' });
    } finally {
      setTesting(false);
    }
  };

  const loadDeliveryDetail = async (deliveryId: string) => {
    try {
      const result = await apiRequest(`/webhooks/deliveries/${deliveryId}`);
      setSelectedDelivery(result);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleEvent = (ev: string) =>
    setFormEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-xl text-on-surface-variant gap-sm">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <span className="font-body-sm text-[13px]">Carregando…</span>
      </div>
    );
  }

  if (error || !webhook) {
    return (
      <div className="max-w-7xl mx-auto p-md">
        <div className="bg-error-container/10 border border-error/20 text-error p-md rounded-lg text-[13px]">
          {error || 'Webhook não encontrado'}
        </div>
        <Button variant="outline" className="mt-md" onClick={() => router.push('/dashboard/webhooks')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="space-y-xs">
          <button
            onClick={() => router.push('/dashboard/webhooks')}
            className="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors font-body-sm text-[12px] mb-xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Webhooks
          </button>
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">{webhook.name}</h2>
          <p className="font-mono text-[12px] text-on-surface-variant">{webhook.url}</p>
        </div>
        {canManage && (
          <div className="flex gap-sm flex-wrap">
            <Button variant="ghost" onClick={handleTest} disabled={testing || !webhook.isActive}>
              <span className="material-symbols-outlined text-[16px] mr-1">send</span>
              {testing ? 'Enviando…' : 'Enviar Teste'}
            </Button>
            <Button variant="ghost" onClick={handleRotate}>
              <span className="material-symbols-outlined text-[16px] mr-1 text-amber-400">key</span>
              Rotacionar Segredo
            </Button>
            <Button variant={webhook.isActive ? 'outline' : 'secondary'} onClick={handleToggleActive}>
              {webhook.isActive ? 'Desativar' : 'Ativar'}
            </Button>
            <Button variant="primary" onClick={openEdit}>
              <span className="material-symbols-outlined text-[16px] mr-1">edit</span>
              Editar
            </Button>
          </div>
        )}
      </header>

      {/* Test feedback */}
      {testResult && (
        <div className={`p-md rounded-lg border flex items-center gap-sm animate-fade-in ${testResult.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-error-container/10 border-error/20 text-error'}`}>
          <span className="material-symbols-outlined text-[18px]">{testResult.ok ? 'check_circle' : 'error'}</span>
          <p className="font-body-sm text-[13px] flex-1">{testResult.msg}</p>
          <button onClick={() => setTestResult(null)} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Config */}
        <div className="lg:col-span-2 space-y-lg">
          <Card title="Configuração">
            <div className="space-y-md text-[13px]">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Status</span>
                  <span className={`inline-flex items-center gap-xs text-[12px] font-semibold ${webhook.isActive ? 'text-emerald-400' : 'text-on-surface-variant'}`}>
                    <span className={`w-2 h-2 rounded-full ${webhook.isActive ? 'bg-emerald-400' : 'bg-outline-variant'}`} />
                    {webhook.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Criado em</span>
                  <span className="text-on-surface-variant">{formatDate(webhook.createdAt)}</span>
                </div>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">URL do Endpoint</span>
                <span className="font-mono text-[12px] text-primary select-all">{webhook.url}</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-2">Eventos ({webhook.events.length})</span>
                <div className="flex flex-wrap gap-1">
                  {webhook.events.map(ev => (
                    <span key={ev} className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] rounded font-mono">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Deliveries */}
          <Card title="Histórico de Entregas">
            {deliveriesLoading ? (
              <div className="flex items-center gap-sm text-on-surface-variant py-md">
                <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <span className="font-body-sm text-[13px]">Carregando…</span>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="py-md text-center text-on-surface-variant space-y-sm">
                <span className="material-symbols-outlined text-2xl block">inbox</span>
                <p className="font-body-sm text-[13px]">Nenhuma entrega ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/20 -mx-md">
                {deliveries.map(d => (
                  <div
                    key={d.id}
                    className="px-md py-sm hover:bg-surface-container/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedDelivery(prev => prev?.id === d.id ? null : d)}
                  >
                    <div className="flex items-center gap-sm flex-wrap">
                      <StatusBadge status={d.status} />
                      <span className="font-mono text-[11px] text-primary">{d.eventType}</span>
                      <span className="text-[11px] text-on-surface-variant">
                        {d.attempt}/{d.maxAttempts} tentativa{d.maxAttempts !== 1 ? 's' : ''}
                      </span>
                      {d.responseStatus != null && (
                        <span className={`font-mono text-[11px] ${d.responseStatus >= 200 && d.responseStatus < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                          HTTP {d.responseStatus}
                        </span>
                      )}
                      <span className="text-[11px] text-on-surface-variant/60 ml-auto">
                        {formatDateTime(d.createdAt)}
                      </span>
                    </div>
                    {d.errorMessage && (
                      <p className="text-[11px] text-red-400 mt-xs truncate">{d.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Inline detail */}
            {selectedDelivery && (
              <div className="mt-md border-t border-outline-variant pt-md">
                <div className="flex items-center justify-between mb-sm">
                  <h4 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Payload</h4>
                  <button onClick={() => setSelectedDelivery(null)} className="text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="bg-black/30 border border-outline-variant rounded p-sm font-mono text-[11px] text-on-surface max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedDelivery.payload ?? {}, null, 2)}
                  </pre>
                </div>
                <button
                  className="mt-sm text-[11px] text-primary hover:underline"
                  onClick={() => loadDeliveryDetail(selectedDelivery.id)}
                >
                  Carregar payload completo
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-lg">
          <Card title="Segurança">
            <div className="space-y-md text-[13px]">
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Segredo de Assinatura</span>
                <div className="bg-black/20 p-sm rounded border border-outline-variant/30 font-mono text-[12px] text-on-surface-variant tracking-wider">
                  ••••••••••••••••
                </div>
                {canManage && (
                  <button
                    onClick={handleRotate}
                    className="mt-sm text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">key</span>
                    Rotacionar segredo
                  </button>
                )}
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Criptografia</span>
                <span className="text-on-surface-variant">AES-256-GCM (armazenamento) · HMAC SHA-256 (assinatura)</span>
              </div>
            </div>
          </Card>

          <Card title="Metadados">
            <div className="space-y-md text-[13px]">
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">ID</span>
                <span className="font-mono text-[10px] text-on-surface-variant break-all">{webhook.id}</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Criado em</span>
                <span className="text-on-surface-variant">{formatDateTime(webhook.createdAt)}</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Atualizado em</span>
                <span className="text-on-surface-variant">{formatDateTime(webhook.updatedAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-lg border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-title-md text-on-surface font-semibold">Editar Webhook</h2>
              <button onClick={() => setEditing(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-lg space-y-md">
              {saveError && (
                <div className="bg-error-container/10 border border-error/20 text-error p-sm rounded text-[12px]">{saveError}</div>
              )}
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome</label>
                <input
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  maxLength={150}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">URL</label>
                <input
                  className="bg-background border border-outline-variant rounded p-sm font-mono text-[12px] text-on-surface focus:border-primary outline-none"
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  required
                  type="url"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Eventos</label>
                <div className="bg-background border border-outline-variant rounded p-sm max-h-52 overflow-y-auto space-y-0.5">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev.value} className="flex items-center gap-sm cursor-pointer hover:bg-surface-container/30 rounded px-1 py-0.5">
                      <input type="checkbox" className="accent-primary" checked={formEvents.includes(ev.value)} onChange={() => toggleEvent(ev.value)} />
                      <span className="font-body-sm text-[12px] text-on-surface flex-1">{ev.label}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant/60">{ev.value}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-sm cursor-pointer">
                <input type="checkbox" className="accent-primary" checked={formActive} onChange={e => setFormActive(e.target.checked)} />
                <span className="font-body-sm text-[13px] text-on-surface">Webhook ativo</span>
              </label>
              <div className="flex gap-sm justify-end pt-md border-t border-outline-variant/30">
                <Button variant="ghost" type="button" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                <Button variant="primary" type="submit" disabled={saving || formEvents.length === 0}>
                  {saving ? 'Salvando…' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Reveal Modal */}
      {revealedSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-md p-lg space-y-lg">
            <h2 className="font-title-md text-on-surface font-semibold flex items-center gap-sm">
              <span className="material-symbols-outlined text-amber-400">key</span>
              Novo Segredo
            </h2>
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-md rounded-lg flex items-start gap-sm">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
              <p className="font-body-sm text-[12px] leading-relaxed">
                <strong>Este segredo será exibido apenas uma vez.</strong> O segredo anterior foi invalidado.
              </p>
            </div>
            <div className="bg-black/40 border border-outline-variant rounded p-md font-mono text-[12px] text-primary break-all select-all">
              {revealedSecret}
            </div>
            <div className="flex gap-sm justify-end pt-sm border-t border-outline-variant/30">
              <Button variant="outline" onClick={copySecret}>
                <span className="material-symbols-outlined text-[16px] mr-1">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button variant="primary" onClick={() => { setRevealedSecret(null); setCopied(false); }}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
