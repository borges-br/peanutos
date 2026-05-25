'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { apiRequest } from '../../../../lib/api';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';

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
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  RETRYING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
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

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return `${parsed.protocol}//${host.length > 30 ? host.substring(0, 27) + '...' : host}${parsed.pathname.substring(0, 20)}${parsed.pathname.length > 20 ? '...' : ''}`;
  } catch {
    return url.substring(0, 50);
  }
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  _count?: { deliveries: number };
}

interface WebhookDelivery {
  id: string;
  eventType: string;
  status: string;
  attempt: number;
  maxAttempts: number;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export default function WebhooksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user && ['OWNER', 'ADMIN'].includes(user.role);

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Secret reveal state
  const [revealedSecret, setRevealedSecret] = useState<{ id: string; secret: string } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Deliveries modal
  const [deliveriesWebhookId, setDeliveriesWebhookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/webhooks');
      setWebhooks(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const openCreateForm = () => {
    setEditingWebhook(null);
    setFormName('');
    setFormUrl('');
    setFormEvents([]);
    setFormActive(true);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (wh: WebhookEndpoint) => {
    setEditingWebhook(wh);
    setFormName(wh.name);
    setFormUrl(wh.url);
    setFormEvents(wh.events);
    setFormActive(wh.isActive);
    setFormError(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUrl || formEvents.length === 0) {
      setFormError('Preencha nome, URL e selecione ao menos um evento.');
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      if (editingWebhook) {
        await apiRequest(`/webhooks/${editingWebhook.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: formName, url: formUrl, events: formEvents, isActive: formActive }),
        });
        setShowForm(false);
        loadWebhooks();
      } else {
        const result = await apiRequest('/webhooks', {
          method: 'POST',
          body: JSON.stringify({ name: formName, url: formUrl, events: formEvents, isActive: formActive }),
        });
        setShowForm(false);
        setRevealedSecret({ id: result.id, secret: result.secret });
        loadWebhooks();
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar webhook');
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleActive = async (wh: WebhookEndpoint) => {
    try {
      await apiRequest(`/webhooks/${wh.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !wh.isActive }),
      });
      loadWebhooks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRotateSecret = async (wh: WebhookEndpoint) => {
    if (!confirm('Tem certeza que deseja rotacionar o segredo? O segredo atual será invalidado imediatamente.')) return;
    try {
      const result = await apiRequest(`/webhooks/${wh.id}/rotate-secret`, { method: 'POST' });
      setRevealedSecret({ id: wh.id, secret: result.secret });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendTest = async (wh: WebhookEndpoint) => {
    setTestingId(wh.id);
    setTestResult(null);
    try {
      const result = await apiRequest(`/webhooks/${wh.id}/test`, { method: 'POST' });
      setTestResult(`Entrega de teste enfileirada. ID: ${result.deliveryId}`);
    } catch (err: any) {
      setTestResult(`Erro: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const loadDeliveries = async (webhookId: string) => {
    setDeliveriesWebhookId(webhookId);
    setDeliveriesLoading(true);
    setSelectedDelivery(null);
    try {
      const result = await apiRequest(`/webhooks/${webhookId}/deliveries`);
      setDeliveries(result.data || []);
    } catch (err: any) {
      setDeliveries([]);
    } finally {
      setDeliveriesLoading(false);
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
    navigator.clipboard.writeText(revealedSecret.secret).then(() => {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    });
  };

  const toggleEvent = (ev: string) => {
    setFormEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  return (
    <main className="max-w-[1200px] mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl pb-md border-b border-outline-variant/30">
        <div>
          <button
            onClick={() => router.push('/dashboard/configuracoes')}
            className="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors mb-sm font-body-sm text-[12px]"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Configurações
          </button>
          <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">Webhooks</h1>
          <p className="font-body-md text-[14px] text-on-surface-variant mt-1">
            Configure endpoints para receber notificações de eventos em tempo real via HTTP POST.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={openCreateForm}>
            <span className="material-symbols-outlined text-[18px] mr-1">add</span>
            Novo Webhook
          </Button>
        )}
      </header>

      {/* Test result */}
      {testResult && (
        <div className={`p-md rounded-lg border flex items-center gap-sm animate-fade-in ${testResult.startsWith('Erro') ? 'bg-error-container/10 border-error/20 text-error' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          <span className="material-symbols-outlined text-[18px]">{testResult.startsWith('Erro') ? 'error' : 'check_circle'}</span>
          <p className="font-body-sm text-[13px]">{testResult}</p>
          <button className="ml-auto text-on-surface-variant hover:text-on-surface" onClick={() => setTestResult(null)}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Webhook List */}
      {loading ? (
        <div className="flex justify-center items-center py-xl text-on-surface-variant">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mr-sm" />
          <span className="font-body-sm text-[13px]">Carregando webhooks...</span>
        </div>
      ) : error ? (
        <div className="bg-error-container/10 border border-error/20 text-error p-md rounded-lg">
          <p className="font-body-sm text-[13px]">{error}</p>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center space-y-md">
          <span className="material-symbols-outlined text-5xl text-outline-variant">webhook</span>
          <h2 className="font-title-md text-on-surface font-semibold">Nenhum webhook configurado</h2>
          <p className="font-body-sm text-[13px] text-on-surface-variant">
            Crie um webhook para integrar o Peanut OS com sistemas externos via HTTP POST.
          </p>
          {canManage && (
            <Button variant="primary" onClick={openCreateForm}>
              <span className="material-symbols-outlined text-[18px] mr-1">add</span>
              Criar primeiro webhook
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow shadow-black/10">
          <div className="p-md border-b border-outline-variant bg-surface-container/50 flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
              {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configurado{webhooks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {webhooks.map((wh) => (
              <div key={wh.id} className="p-md hover:bg-surface-container/20 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start gap-md justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm flex-wrap">
                      <h3 className="font-title-sm text-[14px] text-on-surface font-semibold truncate">{wh.name}</h3>
                      <StatusBadge status={wh.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <p className="font-mono text-[11px] text-on-surface-variant mt-0.5 truncate">{maskUrl(wh.url)}</p>
                    <div className="flex flex-wrap gap-1 mt-sm">
                      {wh.events.slice(0, 5).map(ev => (
                        <span key={ev} className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] rounded font-mono">
                          {ev}
                        </span>
                      ))}
                      {wh.events.length > 5 && (
                        <span className="px-1.5 py-0.5 bg-surface-container border border-outline-variant text-on-surface-variant text-[9px] rounded">
                          +{wh.events.length - 5}
                        </span>
                      )}
                    </div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant/60 mt-xs">
                      Criado em {new Date(wh.createdAt).toLocaleDateString('pt-BR')}
                      {wh._count && ` · ${wh._count.deliveries} entregas`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-xs items-center">
                    <Button
                      variant="ghost"
                      className="text-[11px] h-7 px-2"
                      onClick={() => loadDeliveries(wh.id)}
                    >
                      <span className="material-symbols-outlined text-[15px] mr-0.5">history</span>
                      Entregas
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          className="text-[11px] h-7 px-2"
                          onClick={() => handleSendTest(wh)}
                          disabled={testingId === wh.id || !wh.isActive}
                        >
                          <span className="material-symbols-outlined text-[15px] mr-0.5">send</span>
                          {testingId === wh.id ? 'Enviando...' : 'Testar'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-[11px] h-7 px-2"
                          onClick={() => openEditForm(wh)}
                        >
                          <span className="material-symbols-outlined text-[15px] mr-0.5">edit</span>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-[11px] h-7 px-2"
                          onClick={() => handleToggleActive(wh)}
                        >
                          <span className="material-symbols-outlined text-[15px] mr-0.5">
                            {wh.isActive ? 'toggle_on' : 'toggle_off'}
                          </span>
                          {wh.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-[11px] h-7 px-2 text-amber-400 hover:text-amber-300"
                          onClick={() => handleRotateSecret(wh)}
                        >
                          <span className="material-symbols-outlined text-[15px] mr-0.5">key</span>
                          Rotacionar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-lg border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-title-md text-on-surface font-semibold">
                {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-lg space-y-md">
              {formError && (
                <div className="bg-error-container/10 border border-error/20 text-error p-sm rounded text-[12px]">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Nome <span className="text-error">*</span>
                </label>
                <input
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none"
                  placeholder="Ex: Notificações de Fatura"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  maxLength={150}
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  URL do Endpoint <span className="text-error">*</span>
                </label>
                <input
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm font-mono text-[12px] text-on-surface focus:border-primary outline-none"
                  placeholder="https://seu-sistema.com/webhooks/peanut"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                  type="url"
                />
                <p className="text-[11px] text-on-surface-variant/70">URL pública HTTP/HTTPS que receberá os eventos via POST.</p>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Eventos <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-1 gap-1 bg-background border border-outline-variant rounded p-sm max-h-48 overflow-y-auto">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev.value} className="flex items-center gap-sm cursor-pointer hover:bg-surface-container/30 rounded p-1 transition-colors">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={formEvents.includes(ev.value)}
                        onChange={() => toggleEvent(ev.value)}
                      />
                      <span className="font-body-sm text-[12px] text-on-surface flex-1">{ev.label}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant/60">{ev.value}</span>
                    </label>
                  ))}
                </div>
                {formEvents.length === 0 && (
                  <p className="text-[11px] text-error">Selecione ao menos um evento</p>
                )}
              </div>

              <div className="flex items-center gap-sm">
                <input
                  type="checkbox"
                  id="formActive"
                  className="accent-primary"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                <label htmlFor="formActive" className="font-body-sm text-[13px] text-on-surface cursor-pointer">
                  Webhook ativo
                </label>
              </div>

              <div className="flex gap-sm justify-end pt-md border-t border-outline-variant/30">
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)} disabled={formSaving}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={formSaving || formEvents.length === 0}>
                  {formSaving ? 'Salvando...' : editingWebhook ? 'Salvar Alterações' : 'Criar Webhook'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Reveal Modal */}
      {revealedSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-lg border-b border-outline-variant">
              <h2 className="font-title-md text-on-surface font-semibold flex items-center gap-sm">
                <span className="material-symbols-outlined text-amber-400">key</span>
                Segredo do Webhook
              </h2>
            </div>
            <div className="p-lg space-y-md">
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-md rounded-lg flex items-start gap-sm">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
                <p className="font-body-sm text-[12px] leading-relaxed">
                  <strong>Este segredo será exibido apenas uma vez.</strong> Copie-o agora e armazene com segurança.
                  Ele é usado para verificar a autenticidade das requisições via HMAC SHA-256.
                </p>
              </div>

              <div className="bg-black/40 border border-outline-variant rounded p-md font-mono text-[12px] text-primary break-all select-all">
                {revealedSecret.secret}
              </div>

              <p className="text-[11px] text-on-surface-variant">
                Use este segredo para verificar a assinatura no header{' '}
                <code className="bg-surface-container px-1 py-0.5 rounded text-primary">X-Peanut-Signature</code>.
              </p>

              <div className="flex gap-sm justify-end pt-sm border-t border-outline-variant/30">
                <Button variant="outline" onClick={copySecret}>
                  <span className="material-symbols-outlined text-[16px] mr-1">{copiedSecret ? 'check' : 'content_copy'}</span>
                  {copiedSecret ? 'Copiado!' : 'Copiar Segredo'}
                </Button>
                <Button variant="primary" onClick={() => { setRevealedSecret(null); setCopiedSecret(false); }}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Modal */}
      {deliveriesWebhookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-md border-b border-outline-variant flex items-center justify-between shrink-0">
              <h2 className="font-title-sm text-on-surface font-semibold">
                Histórico de Entregas
              </h2>
              <button
                onClick={() => { setDeliveriesWebhookId(null); setSelectedDelivery(null); }}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {deliveriesLoading ? (
                <div className="flex justify-center items-center py-xl text-on-surface-variant">
                  <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin mr-sm" />
                  <span className="font-body-sm text-[13px]">Carregando...</span>
                </div>
              ) : deliveries.length === 0 ? (
                <div className="p-xl text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl mb-sm block">inbox</span>
                  <p className="font-body-sm text-[13px]">Nenhuma entrega registrada ainda.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {deliveries.map(d => (
                    <div
                      key={d.id}
                      className="p-md hover:bg-surface-container/20 transition-colors cursor-pointer"
                      onClick={() => loadDeliveryDetail(d.id)}
                    >
                      <div className="flex items-center gap-md flex-wrap">
                        <StatusBadge status={d.status} />
                        <span className="font-mono text-[11px] text-primary">{d.eventType}</span>
                        <span className="text-[11px] text-on-surface-variant">
                          Tentativa {d.attempt}/{d.maxAttempts}
                        </span>
                        {d.responseStatus && (
                          <span className={`font-mono text-[11px] ${d.responseStatus >= 200 && d.responseStatus < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                            HTTP {d.responseStatus}
                          </span>
                        )}
                        <span className="text-[11px] text-on-surface-variant/60 ml-auto">
                          {new Date(d.createdAt).toLocaleString('pt-BR')}
                        </span>
                        {d.errorMessage && (
                          <span className="text-[11px] text-red-400 truncate max-w-xs">{d.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Detail */}
            {selectedDelivery && (
              <div className="border-t border-outline-variant p-md shrink-0">
                <div className="flex items-center justify-between mb-sm">
                  <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Detalhes da Entrega
                  </h3>
                  <button onClick={() => setSelectedDelivery(null)} className="text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="bg-background border border-outline-variant rounded p-sm font-mono text-[11px] text-on-surface max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify({
                      id: selectedDelivery.id,
                      eventType: selectedDelivery.eventType,
                      status: selectedDelivery.status,
                      responseStatus: selectedDelivery.responseStatus,
                      errorMessage: selectedDelivery.errorMessage,
                      deliveredAt: selectedDelivery.deliveredAt,
                      payload: selectedDelivery.payload,
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integration Info Card */}
      <Card title="Como verificar a assinatura">
        <div className="space-y-sm text-[13px]">
          <p className="text-on-surface-variant">
            Cada requisição inclui o header{' '}
            <code className="bg-surface-container px-1.5 py-0.5 rounded font-mono text-primary text-[11px]">X-Peanut-Signature</code>{' '}
            com HMAC SHA-256.
          </p>
          <div className="bg-black/30 border border-outline-variant rounded p-md font-mono text-[11px] text-on-surface-variant overflow-x-auto">
            <pre>{`// Node.js
const crypto = require('crypto');
const timestamp = req.headers['x-peanut-timestamp'];
const signature = req.headers['x-peanut-signature'];
const payload = \`\${timestamp}.\${JSON.stringify(req.body)}\`;
const expected = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');
const isValid = crypto.timingSafeEqual(
  Buffer.from(expected), Buffer.from(signature)
);`}</pre>
          </div>
        </div>
      </Card>
    </main>
  );
}
