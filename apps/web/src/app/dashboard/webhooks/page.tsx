'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Breadcrumbs from '../../../components/layout/Breadcrumbs';
import {
  WEBHOOK_EVENT_CATALOG,
  WEBHOOK_EVENTS_BY_CATEGORY,
  WEBHOOK_EVENTS,
  INBOUND_ACTIONS
} from '@peanut/validators';

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  PENDING:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  RETRYING:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FAILED:    'bg-red-500/15 text-red-400 border-red-500/20',
  CANCELLED: 'bg-outline-variant/20 text-on-surface-variant border-outline-variant/30',
  ACTIVE:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  INACTIVE:  'bg-outline-variant/20 text-on-surface-variant border-outline-variant/30',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || STATUS_COLORS.CANCELLED;
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status === 'ACTIVE' ? 'Ativo' : status === 'INACTIVE' ? 'Inativo' : status}
    </span>
  );
}

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 20 ? parsed.pathname.substring(0, 18) + '…' : parsed.pathname;
    return `${parsed.protocol}//${parsed.hostname}${path}`;
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

interface InboundWebhookEndpoint {
  id: string;
  name: string;
  allowedActions: string[];
  isActive: boolean;
  createdAt: string;
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
  payload?: any;
}

export default function WebhooksPage() {
  const { user } = useAuth();
  const canManage = user && ['OWNER', 'ADMIN'].includes(user.role);

  // Top Tabs
  const [activeMainTab, setActiveMainTab] = useState<'outbound' | 'catalog' | 'inbound'>('outbound');

  // Core Data
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [inbounds, setInbounds] = useState<InboundWebhookEndpoint[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [loadingInbounds, setLoadingInbounds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Outbound create/edit modal
  const [showOutboundForm, setShowOutboundForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formEventFilter, setFormEventFilter] = useState<'Todos' | 'Operação' | 'Comercial' | 'Auditoria' | 'Ativos' | 'Planejados'>('Todos');
  const [expandedPreviewEvent, setExpandedPreviewEvent] = useState<string | null>(null);

  // Active events counts
  const auditActiveCount = WEBHOOK_EVENT_CATALOG.filter(e => e.category === 'AUDIT' && e.status === 'active').length;
  const operationActiveCount = WEBHOOK_EVENT_CATALOG.filter(e => e.category === 'OPERATION' && e.status === 'active').length;
  const commercialActiveCount = WEBHOOK_EVENT_CATALOG.filter(e => e.category === 'COMMERCIAL' && e.status === 'active').length;

  const selectAllActiveInFilter = () => {
    let visibleActiveEvents = WEBHOOK_EVENT_CATALOG.filter(ev => ev.status === 'active');
    if (formEventFilter === 'Operação') {
      visibleActiveEvents = visibleActiveEvents.filter(ev => ev.category === 'OPERATION');
    } else if (formEventFilter === 'Comercial') {
      visibleActiveEvents = visibleActiveEvents.filter(ev => ev.category === 'COMMERCIAL');
    } else if (formEventFilter === 'Auditoria') {
      visibleActiveEvents = visibleActiveEvents.filter(ev => ev.category === 'AUDIT');
    }
    const visibleActiveTypes = visibleActiveEvents.map(e => e.type);
    setFormEvents(prev => {
      const merged = new Set([...prev, ...visibleActiveTypes]);
      return Array.from(merged);
    });
  };

  // Inbound create/edit modal
  const [showInboundForm, setShowInboundForm] = useState(false);
  const [editingInbound, setEditingInbound] = useState<InboundWebhookEndpoint | null>(null);
  const [formInboundName, setFormInboundName] = useState('');
  const [formInboundActions, setFormInboundActions] = useState<string[]>([]);
  const [formInboundActive, setFormInboundActive] = useState(true);
  const [formInboundSaving, setFormInboundSaving] = useState(false);
  const [formInboundError, setFormInboundError] = useState<string | null>(null);

  // Secrets modal
  const [revealedSecret, setRevealedSecret] = useState<{ id: string; secret: string; type: 'outbound' | 'inbound' } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Deliveries history modal
  const [deliveriesWebhookId, setDeliveriesWebhookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [deliveryFilterEvent, setDeliveryFilterEvent] = useState('');
  const [deliveryFilterStatus, setDeliveryFilterStatus] = useState('');

  // Event Catalog category and details
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<'AUDIT' | 'OPERATION' | 'COMMERCIAL'>('AUDIT');
  const [selectedCatalogEvent, setSelectedCatalogEvent] = useState<any>(WEBHOOK_EVENT_CATALOG[0]);
  const [copiedCatalogPayload, setCopiedCatalogPayload] = useState(false);

  // Test
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Inbound Details Expand
  const [expandedInboundId, setExpandedInboundId] = useState<string | null>(null);
  const [inboundAudits, setInboundAudits] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  // API Domain
  const [apiOrigin, setApiOrigin] = useState('http://localhost:3001');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Point to backend API port (usually 3001)
      const port = window.location.port ? ':3001' : '';
      setApiOrigin(`${window.location.protocol}//${window.location.hostname}${port}`);
    }
  }, []);

  const loadWebhooks = useCallback(async () => {
    setLoadingWebhooks(true);
    setError(null);
    try {
      const data = await apiRequest('/webhooks');
      setWebhooks(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar webhooks');
    } finally {
      setLoadingWebhooks(false);
    }
  }, []);

  const loadInbounds = useCallback(async () => {
    setLoadingInbounds(true);
    try {
      const data = await apiRequest('/inbound-webhooks');
      setInbounds(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      console.warn('Inbound webhooks list load failed:', err.message);
    } finally {
      setLoadingInbounds(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
    loadInbounds();
  }, [loadWebhooks, loadInbounds]);

  // Outbound CRUD
  const openCreateForm = () => {
    setEditingWebhook(null);
    setFormName('');
    setFormUrl('');
    setFormEvents([]);
    setFormActive(true);
    setFormError(null);
    setShowOutboundForm(true);
  };

  const openEditForm = (wh: WebhookEndpoint) => {
    setEditingWebhook(wh);
    setFormName(wh.name);
    setFormUrl(wh.url);
    setFormEvents(wh.events);
    setFormActive(wh.isActive);
    setFormError(null);
    setShowOutboundForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUrl || formEvents.length === 0) {
      setFormError('Preencha nome, URL e selecione ao menos um evento ativo.');
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
        setShowOutboundForm(false);
        loadWebhooks();
      } else {
        const result = await apiRequest('/webhooks', {
          method: 'POST',
          body: JSON.stringify({ name: formName, url: formUrl, events: formEvents, isActive: formActive }),
        });
        setShowOutboundForm(false);
        setRevealedSecret({ id: result.id, secret: result.secret, type: 'outbound' });
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
      setRevealedSecret({ id: wh.id, secret: result.secret, type: 'outbound' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendTest = async (wh: WebhookEndpoint) => {
    setTestingId(wh.id);
    setTestResult(null);
    try {
      const result = await apiRequest(`/webhooks/${wh.id}/test`, { method: 'POST' });
      setTestResult({ ok: true, msg: `Teste enfileirado. ID da entrega: ${result.deliveryId}` });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Erro ao enviar teste' });
    } finally {
      setTestingId(null);
    }
  };

  // Inbound CRUD
  const openInboundCreate = () => {
    setEditingInbound(null);
    setFormInboundName('');
    setFormInboundActions([]);
    setFormInboundActive(true);
    setFormInboundError(null);
    setShowInboundForm(true);
  };

  const openInboundEdit = (inb: InboundWebhookEndpoint) => {
    setEditingInbound(inb);
    setFormInboundName(inb.name);
    setFormInboundActions(inb.allowedActions);
    setFormInboundActive(inb.isActive);
    setFormInboundError(null);
    setShowInboundForm(true);
  };

  const handleInboundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInboundName || formInboundActions.length === 0) {
      setFormInboundError('Preencha o nome e selecione ao menos uma ação permitida.');
      return;
    }
    setFormInboundSaving(true);
    setFormInboundError(null);
    try {
      if (editingInbound) {
        await apiRequest(`/inbound-webhooks/${editingInbound.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: formInboundName, allowedActions: formInboundActions, isActive: formInboundActive }),
        });
        setShowInboundForm(false);
        loadInbounds();
      } else {
        const result = await apiRequest('/inbound-webhooks', {
          method: 'POST',
          body: JSON.stringify({ name: formInboundName, allowedActions: formInboundActions, isActive: formInboundActive }),
        });
        setShowInboundForm(false);
        setRevealedSecret({ id: result.id, secret: result.secret, type: 'inbound' });
        loadInbounds();
      }
    } catch (err: any) {
      setFormInboundError(err.message || 'Erro ao salvar integração de entrada');
    } finally {
      setFormInboundSaving(false);
    }
  };

  const handleInboundToggleActive = async (inb: InboundWebhookEndpoint) => {
    try {
      await apiRequest(`/inbound-webhooks/${inb.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !inb.isActive }),
      });
      loadInbounds();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInboundRotateSecret = async (inb: InboundWebhookEndpoint) => {
    if (!confirm('Deseja rotacionar a chave secreta de entrada? Assinaturas antigas falharão.')) return;
    try {
      const result = await apiRequest(`/inbound-webhooks/${inb.id}/rotate-secret`, { method: 'POST' });
      setRevealedSecret({ id: inb.id, secret: result.secret, type: 'inbound' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInboundDelete = async (inb: InboundWebhookEndpoint) => {
    if (!confirm(`Tem certeza que deseja DELETAR a integração "${inb.name}" permanentemente?`)) return;
    try {
      await apiRequest(`/inbound-webhooks/${inb.id}`, { method: 'DELETE' });
      loadInbounds();
      if (expandedInboundId === inb.id) {
        setExpandedInboundId(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Deliveries List
  const loadDeliveries = async (webhookId: string) => {
    setDeliveriesWebhookId(webhookId);
    setDeliveriesLoading(true);
    setSelectedDelivery(null);
    try {
      const result = await apiRequest(`/webhooks/${webhookId}/deliveries`);
      setDeliveries(result.data || []);
    } catch {
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

  const copyCatalogPayload = () => {
    if (!selectedCatalogEvent) return;
    navigator.clipboard.writeText(JSON.stringify(selectedCatalogEvent.payloadExample, null, 2)).then(() => {
      setCopiedCatalogPayload(true);
      setTimeout(() => setCopiedCatalogPayload(false), 2000);
    });
  };

  const toggleEventCheckbox = (ev: string) => {
    setFormEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  const toggleActionCheckbox = (act: string) => {
    setFormInboundActions(prev => prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]);
  };

  // Expand Inbound Logs/Details
  const handleToggleExpandInbound = async (inbId: string) => {
    if (expandedInboundId === inbId) {
      setExpandedInboundId(null);
      return;
    }
    setExpandedInboundId(inbId);
    setLoadingAudits(true);
    setInboundAudits([]);
    try {
      // Query audits specifically related to InboundWebhook entity
      const result = await apiRequest<any>(`/auditoria?entityType=INBOUND_WEBHOOK&limit=15`);
      setInboundAudits(result.data || []);
    } catch {
      setInboundAudits([]);
    } finally {
      setLoadingAudits(false);
    }
  };

  // Filter deliveries
  const filteredDeliveries = deliveries.filter(d => {
    if (deliveryFilterEvent && d.eventType !== deliveryFilterEvent) return false;
    if (deliveryFilterStatus && d.status !== deliveryFilterStatus) return false;
    return true;
  });

  return (
    <main className="max-w-7xl mx-auto space-y-lg p-md animate-fade-in pb-xl select-none">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Início', href: '/dashboard' },
          { label: 'Configurações', href: '/dashboard/configuracoes' },
          { label: 'Webhooks' },
        ]}
        className="mb-sm"
      />

      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-lg border-b border-outline-variant/30 pb-md">
        <div className="space-y-sm">
          <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">Webhooks</h1>
          <p className="font-body-md text-on-surface-variant max-w-2xl text-[14px]">
            Central de automação e integração de dados. Configure disparos em tempo real ou crie endpoints seguros para receber chamadas de parceiros e sistemas de terceiros.
          </p>
        </div>
      </header>

      {/* Main Sliding Tabs Navigation */}
      <div className="flex border-b border-outline-variant/20 gap-sm pb-1 shrink-0">
        <button
          onClick={() => setActiveMainTab('outbound')}
          className={`px-md py-sm flex items-center gap-sm text-[13px] font-semibold border-b-2 transition-all ${activeMainTab === 'outbound' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[18px]">publish</span>
          Webhooks de saída
        </button>
        <button
          onClick={() => setActiveMainTab('catalog')}
          className={`px-md py-sm flex items-center gap-sm text-[13px] font-semibold border-b-2 transition-all ${activeMainTab === 'catalog' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          Catálogo de eventos
        </button>
        <button
          onClick={() => setActiveMainTab('inbound')}
          className={`px-md py-sm flex items-center gap-sm text-[13px] font-semibold border-b-2 transition-all ${activeMainTab === 'inbound' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          Integrações de entrada
        </button>
      </div>

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

      {/* TAB 1: OUTBOUND WEBHOOKS */}
      {activeMainTab === 'outbound' && (
        <section className="space-y-lg animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-on-surface">Endpoints Cadastrados</h2>
            {canManage && (
              <Button variant="primary" onClick={openCreateForm} className="text-xs px-md py-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Novo Endpoint
              </Button>
            )}
          </div>

          {loadingWebhooks ? (
            <div className="flex justify-center items-center py-xl text-on-surface-variant gap-sm">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="font-body-sm text-[13px]">Carregando endpoints…</span>
            </div>
          ) : error ? (
            <div className="bg-error-container/10 border border-error/20 text-error p-md rounded-lg">
              <p className="font-body-sm text-[13px]">{error}</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center space-y-md">
              <span className="material-symbols-outlined text-5xl text-outline-variant">publish</span>
              <h3 className="font-title-md text-on-surface font-semibold">Nenhum webhook cadastrado</h3>
              <p className="font-body-sm text-[13px] text-on-surface-variant max-w-sm mx-auto">
                Crie um endpoint para encaminhar eventos do sistema em tempo real com envelopes criptografados robustos.
              </p>
              {canManage && (
                <Button variant="primary" onClick={openCreateForm}>
                  Cadastrar Webhook
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-md">
              {webhooks.map((wh) => (
                <div key={wh.id} className="bg-surface border border-outline-variant rounded-xl p-md flex flex-col md:flex-row md:items-start justify-between gap-md hover:bg-surface-container/20 transition-all shadow-sm">
                  <div className="flex-1 min-w-0 space-y-sm">
                    <div className="flex items-center gap-sm flex-wrap">
                      <h3 className="font-title-sm text-[14px] text-on-surface font-bold">{wh.name}</h3>
                      <StatusBadge status={wh.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <p className="font-mono text-[11px] text-primary/80 truncate break-all">{maskUrl(wh.url)}</p>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map(ev => (
                        <span key={ev} className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] rounded font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-xs items-center shrink-0">
                    <Button variant="ghost" className="text-[11px] h-7 px-2" onClick={() => loadDeliveries(wh.id)}>
                      <span className="material-symbols-outlined text-[15px] mr-0.5">history</span>
                      Log Entregas
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
                          {testingId === wh.id ? 'Testando…' : 'Testar'}
                        </Button>
                        <Button variant="ghost" className="text-[11px] h-7 px-2" onClick={() => openEditForm(wh)}>
                          <span className="material-symbols-outlined text-[15px] mr-0.5">edit</span>
                          Editar
                        </Button>
                        <Button variant="ghost" className="text-[11px] h-7 px-2" onClick={() => handleToggleActive(wh)}>
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
                          Rotacionar Chave
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Outbound Instructions */}
          <Card title="Padrão Criptográfico HMAC-SHA256">
            <div className="space-y-sm text-[13px] text-on-surface-variant leading-relaxed">
              <p>
                Para atestar a integridade e evitar ataques do tipo replay, cada requisição enviada de forma ativa possui o header <code>X-Peanut-Signature</code>, calculado de forma determinística utilizando a chave secreta simétrica.
              </p>
              <div className="bg-black/30 border border-outline-variant rounded p-md font-mono text-[11px] text-primary select-all">
                <pre>{`Signature = hmac_sha256(secret, timestamp + "." + rawBody)`}</pre>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* TAB 2: EVENT CATALOG */}
      {activeMainTab === 'catalog' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start animate-fade-in">
          {/* Left panel: events catalog listing */}
          <div className="lg:col-span-7 space-y-md">
            <div className="bg-surface border border-outline-variant rounded-xl p-md space-y-md">
              <h3 className="font-title-sm text-on-surface font-bold">Catálogo Geral e Categorias</h3>
              
              {/* Category selector */}
              <div className="flex border-b border-outline-variant/10 gap-xs pb-1">
                {(['AUDIT', 'OPERATION', 'COMMERCIAL'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCatalogCategory(cat);
                      // Select first event in new category
                      const matched = WEBHOOK_EVENT_CATALOG.filter(e => e.category === cat);
                      if (matched.length > 0) setSelectedCatalogEvent(matched[0]);
                    }}
                    className={`px-sm py-1.5 border-b-2 text-[12px] font-semibold transition-all ${activeCatalogCategory === cat ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant'}`}
                  >
                    {cat === 'AUDIT' ? 'Segurança & Auditoria' : cat === 'OPERATION' ? 'Operações & Chamados' : 'Comercial & Faturamento'}
                  </button>
                ))}
              </div>

              {/* Description */}
              <p className="text-[12px] text-on-surface-variant leading-relaxed italic">
                {activeCatalogCategory === 'AUDIT' && 'Eventos relacionados a rastreabilidade, controle de usuários, auditoria, configurações de marca e segurança interna.'}
                {activeCatalogCategory === 'OPERATION' && 'Eventos operacionais de abertura, atualização, encerramento de chamados, prazos de SLA próximos, relatórios técnicos e faturamento físico.'}
                {activeCatalogCategory === 'COMMERCIAL' && 'Eventos financeiros estruturais, como geração ou vencimentos de faturas, renovações, ciclos e agendas de cobranças recorrentes.'}
              </p>

              {/* Events lists */}
              <div className="space-y-xs max-h-[50vh] overflow-y-auto pr-xs">
                {WEBHOOK_EVENTS_BY_CATEGORY[activeCatalogCategory]?.map((ev) => {
                  const isActive = ev.status === 'active';
                  const isSelected = selectedCatalogEvent?.type === ev.type;
                  return (
                    <div
                      key={ev.type}
                      onClick={() => setSelectedCatalogEvent(ev)}
                      className={`p-sm border rounded-lg cursor-pointer transition-all flex items-center justify-between gap-sm ${isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:bg-surface-container/30'} ${!isActive ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="space-y-xs">
                        <div className="flex items-center gap-xs">
                          <span className={`font-mono text-[12px] ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                            {ev.type}
                          </span>
                          {!isActive && (
                            <span className="text-[9px] bg-outline-variant/30 text-on-surface-variant px-1 rounded uppercase font-bold tracking-tighter shrink-0 select-none">
                              Planejado
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] font-semibold text-on-surface">{ev.label}</p>
                        <p className="text-[11px] text-on-surface-variant truncate max-w-md">{ev.description}</p>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">chevron_right</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right panel: preview payload */}
          <div className="lg:col-span-5 space-y-md">
            {selectedCatalogEvent ? (
              <div className="bg-surface border border-outline-variant rounded-xl p-md space-y-md shadow-lg sticky top-md">
                <div className="flex justify-between items-start gap-sm">
                  <div className="space-y-xs">
                    <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] rounded font-bold uppercase tracking-wider">
                      {selectedCatalogEvent.category}
                    </span>
                    <h3 className="font-title-sm text-[15px] font-bold text-on-surface">{selectedCatalogEvent.label}</h3>
                    <code className="text-[11px] text-primary font-mono block break-all">{selectedCatalogEvent.type}</code>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${selectedCatalogEvent.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-outline-variant/30 text-on-surface-variant border-outline-variant/45'}`}>
                    {selectedCatalogEvent.status}
                  </span>
                </div>

                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {selectedCatalogEvent.description}
                </p>

                <div className="space-y-sm text-[11px]">
                  <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-xs">
                    <span>Entidade Relacionada:</span>
                    <strong className="font-mono text-primary">{selectedCatalogEvent.entityType}</strong>
                  </div>
                  <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-xs">
                    <span>Gatilho / Ciclo:</span>
                    <strong className="uppercase">{selectedCatalogEvent.lifecycle}</strong>
                  </div>
                </div>

                {/* Payload Example */}
                {selectedCatalogEvent.status === 'active' ? (
                  <div className="space-y-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-[9px] uppercase font-bold text-on-surface-variant">Exemplo de Payload Outbound:</span>
                      <Button variant="ghost" className="text-[10px] h-6 px-2 py-0" onClick={copyCatalogPayload}>
                        <span className="material-symbols-outlined text-[13px] mr-1">
                          {copiedCatalogPayload ? 'check' : 'content_copy'}
                        </span>
                        {copiedCatalogPayload ? 'Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                    <div className="bg-black/40 border border-outline-variant rounded p-sm max-h-72 overflow-y-auto font-mono text-[11px] text-primary">
                      <pre>{JSON.stringify(selectedCatalogEvent.payloadExample, null, 2)}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container border border-outline-variant/20 rounded p-md text-center text-on-surface-variant/50 space-y-sm py-lg">
                    <span className="material-symbols-outlined text-4xl block opacity-40">lock</span>
                    <p className="text-[12px] leading-relaxed max-w-xs mx-auto">
                      Este evento faz parte do escopo planejado (Planned) e estará ativo assim que o respectivo módulo for disponibilizado no Peanut OS.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-xl text-center text-on-surface-variant border border-outline-variant rounded-xl bg-surface">
                Selecione um evento para visualizar os detalhes
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: INBOUND WEBHOOKS */}
      {activeMainTab === 'inbound' && (
        <section className="space-y-lg animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-on-surface">Integrações de Entrada (Inbound API)</h2>
            {canManage && (
              <Button variant="primary" onClick={openInboundCreate} className="text-xs px-md py-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Cadastrar API de Entrada
              </Button>
            )}
          </div>

          {loadingInbounds ? (
            <div className="flex justify-center items-center py-xl text-on-surface-variant gap-sm">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="font-body-sm text-[13px]">Carregando inbounds…</span>
            </div>
          ) : inbounds.length === 0 ? (
            <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center space-y-md">
              <span className="material-symbols-outlined text-5xl text-outline-variant">file_download</span>
              <h3 className="font-title-md text-on-surface font-semibold">Nenhuma integração de entrada configurada</h3>
              <p className="font-body-sm text-[13px] text-on-surface-variant max-w-sm mx-auto">
                Cadastre chaves de entrada para permitir que sistemas externos atualizem chamados, adicionem comentários ou alterem status contratuais com validação HMAC.
              </p>
              {canManage && (
                <Button variant="primary" onClick={openInboundCreate}>
                  Criar API de Entrada
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-md">
              {inbounds.map((inb) => {
                const isExpanded = expandedInboundId === inb.id;
                const publicUrl = `${apiOrigin}/api/v1/inbound/${inb.id}`;
                return (
                  <div key={inb.id} className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="p-md flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant/10 bg-surface-container/10">
                      <div className="space-y-xs min-w-0">
                        <div className="flex items-center gap-sm flex-wrap">
                          <h3 className="font-title-sm text-[14px] text-on-surface font-bold">{inb.name}</h3>
                          <StatusBadge status={inb.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </div>
                        <p className="font-mono text-[11px] text-primary truncate max-w-xl select-all break-all">{publicUrl}</p>
                      </div>

                      <div className="flex flex-wrap gap-xs shrink-0 items-center">
                        <Button variant="ghost" className="text-[11px] h-7 px-2" onClick={() => handleToggleExpandInbound(inb.id)}>
                          <span className="material-symbols-outlined text-[15px] mr-0.5">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                          {isExpanded ? 'Recolher' : 'Instruções & Logs'}
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" className="text-[11px] h-7 px-2" onClick={() => openInboundEdit(inb)}>
                              <span className="material-symbols-outlined text-[15px] mr-0.5">edit</span>
                              Editar
                            </Button>
                            <Button variant="ghost" className="text-[11px] h-7 px-2" onClick={() => handleInboundToggleActive(inb)}>
                              <span className="material-symbols-outlined text-[15px] mr-0.5">
                                {inb.isActive ? 'toggle_on' : 'toggle_off'}
                              </span>
                              {inb.isActive ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-[11px] h-7 px-2 text-amber-400 hover:text-amber-300"
                              onClick={() => handleInboundRotateSecret(inb)}
                            >
                              <span className="material-symbols-outlined text-[15px] mr-0.5">key</span>
                              Novo Segredo
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-[11px] h-7 px-2 text-red-400 hover:text-red-300"
                              onClick={() => handleInboundDelete(inb)}
                            >
                              <span className="material-symbols-outlined text-[15px] mr-0.5">delete</span>
                              Deletar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Allowed Actions list */}
                    <div className="px-md py-sm flex flex-wrap gap-sm items-center border-b border-outline-variant/10 text-[12px] text-on-surface-variant">
                      <span>Ações Permitidas:</span>
                      {inb.allowedActions.map(act => (
                        <span key={act} className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] rounded font-mono">
                          {act}
                        </span>
                      ))}
                    </div>

                    {/* Instructions and Logs expand panel */}
                    {isExpanded && (
                      <div className="p-md space-y-lg bg-surface-container/20 border-t border-outline-variant/10 animate-slide-down">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                          {/* Exemplo de Request cURL */}
                          <div className="space-y-xs">
                            <span className="font-label-caps text-[9px] uppercase font-bold text-on-surface-variant">Exemplo de Requisição Assinada (cURL):</span>
                            <div className="bg-black/40 border border-outline-variant rounded p-sm font-mono text-[10px] text-primary overflow-x-auto whitespace-pre-wrap select-all">
                              {`curl -X POST "${publicUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Peanut-Timestamp: 1779836400" \\
  -H "X-Peanut-Signature: sha256=a88e99...aef1a" \\
  -d '{
    "action": "ticket.update_status",
    "entity": {
      "type": "TICKET",
      "id": "tkt_123456"
    },
    "data": {
      "status": "IN_PROGRESS",
      "comment": "Atualizado por integração externa"
    },
    "externalReference": "zapier-ref-abc"
  }'`}
                            </div>
                          </div>

                          {/* Payload Esperado */}
                          <div className="space-y-xs">
                            <span className="font-label-caps text-[9px] uppercase font-bold text-on-surface-variant">Esquema do Payload JSON Esperado:</span>
                            <div className="bg-black/40 border border-outline-variant rounded p-sm font-mono text-[10px] text-primary overflow-x-auto select-all">
                              <pre>{`{
  "action": "ticket.update_status | ticket.add_comment | ticket.assign | contract.update_status",
  "entity": {
    "type": "TICKET | CONTRACT",
    "id": "UUID"
  },
  "data": {
    "status": "IN_PROGRESS | RESOLVED | DRAFT | ACTIVE ...",
    "comment": "Comentário opcional",
    "assignedToId": "UUID do técnico (opcional)"
  },
  "externalReference": "String para idempotência"
}`}</pre>
                            </div>
                          </div>
                        </div>

                        {/* Audits / Logs of Inbound actions */}
                        <div className="space-y-xs">
                          <h4 className="font-label-caps text-[9px] uppercase font-bold text-on-surface-variant">Histórico de Chamadas Recebidas (Logs de Auditoria)</h4>
                          {loadingAudits ? (
                            <div className="py-md text-center text-[12px] text-on-surface-variant gap-sm flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                              <span>Carregando auditoria…</span>
                            </div>
                          ) : inboundAudits.length === 0 ? (
                            <div className="py-md text-center text-[12px] text-on-surface-variant/60 bg-black/10 rounded">
                              Nenhuma chamada auditada nas últimas requisições.
                            </div>
                          ) : (
                            <div className="bg-black/35 border border-outline-variant/30 rounded overflow-hidden divide-y divide-outline-variant/10 text-[11px] font-mono">
                              {inboundAudits.slice(0, 10).map((aud: any) => {
                                const details = aud.afterJson ? JSON.parse(aud.afterJson) : {};
                                return (
                                  <div key={aud.id} className="p-sm flex justify-between gap-md items-center hover:bg-black/20">
                                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wide text-[9px] ${aud.action.includes('failed') ? 'bg-red-500/25 text-red-400' : aud.action.includes('rejected') ? 'bg-amber-500/25 text-amber-400' : 'bg-emerald-500/25 text-emerald-400'}`}>
                                      {aud.action}
                                    </span>
                                    <span className="text-on-surface-variant">Ação: {details.action || 'indefinido'}</span>
                                    {details.externalReference && <span className="text-on-surface-variant/70">Ref: {details.externalReference}</span>}
                                    <span className="text-on-surface-variant/40 ml-auto">{new Date(aud.createdAt).toLocaleString('pt-BR')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Secret Reveal Modal */}
      {revealedSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-lg border-b border-outline-variant">
              <h2 className="font-title-md text-on-surface font-semibold flex items-center gap-sm">
                <span className="material-symbols-outlined text-amber-400">key</span>
                Chave Secreta HMAC
              </h2>
            </div>
            <div className="p-lg space-y-md">
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-md rounded-lg flex items-start gap-sm">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
                <p className="font-body-sm text-[12px] leading-relaxed">
                  <strong>Este segredo simétrico será exibido apenas uma vez.</strong> Copie e guarde em segurança.
                  Ele é exigido para calcular ou validar a assinatura do header.
                </p>
              </div>
              <div className="bg-black/40 border border-outline-variant rounded p-md font-mono text-[12px] text-primary break-all select-all">
                {revealedSecret.secret}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                {revealedSecret.type === 'outbound'
                  ? 'Use para validar a assinatura no cabeçalho X-Peanut-Signature das requisições outbound.'
                  : 'Assine suas chamadas de entrada enviando a assinatura calculada no header X-Peanut-Signature.'}
              </p>
              <div className="flex gap-sm justify-end pt-sm border-t border-outline-variant/30">
                <Button variant="outline" onClick={copySecret}>
                  <span className="material-symbols-outlined text-[16px] mr-1">{copiedSecret ? 'check' : 'content_copy'}</span>
                  {copiedSecret ? 'Copiado!' : 'Copiar Chave'}
                </Button>
                <Button variant="primary" onClick={() => { setRevealedSecret(null); setCopiedSecret(false); }}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outbound Form Modal */}
      {showOutboundForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-zoom-in">
            <div className="p-lg border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-title-md text-on-surface font-bold">
                {editingWebhook ? 'Editar Webhook Endpoint' : 'Novo Webhook Endpoint'}
              </h2>
              <button onClick={() => setShowOutboundForm(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
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
                  Nome do Endpoint <span className="text-error">*</span>
                </label>
                <input
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none"
                  placeholder="Ex: Integração n8n Comercial"
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
                  className="bg-background border border-outline-variant rounded p-sm font-mono text-[12px] text-on-surface focus:border-primary outline-none"
                  placeholder="https://sua-api.com/webhooks/peanut"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                  type="url"
                />
                <p className="text-[11px] text-on-surface-variant/70">Endpoint externo seguro para recebimento via HTTP POST.</p>
              </div>

              <div className="flex flex-col gap-xs animate-fade-in">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Filtrar e Selecionar Eventos <span className="text-error">*</span>
                </label>

                {/* Category filter chips inside the form */}
                <div className="flex flex-wrap gap-xs pb-xs border-b border-outline-variant/20 mb-xs">
                  {(['Todos', 'Operação', 'Comercial', 'Auditoria', 'Ativos', 'Planejados'] as const).map(filter => {
                    let badge = '';
                    if (filter === 'Operação') badge = ` (${operationActiveCount} ativos)`;
                    else if (filter === 'Comercial') badge = ` (${commercialActiveCount} ativos)`;
                    else if (filter === 'Auditoria') badge = ` (${auditActiveCount} ativos)`;

                    const isActiveFilter = formEventFilter === filter;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setFormEventFilter(filter)}
                        className={`px-sm py-1 rounded-full text-[11px] font-semibold transition-all border ${isActiveFilter ? 'bg-primary border-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container/50 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
                      >
                        {filter}{badge}
                      </button>
                    );
                  })}
                </div>

                {/* Bulk Select all button */}
                {['Todos', 'Operação', 'Comercial', 'Auditoria'].includes(formEventFilter) && (
                  <div className="flex justify-between items-center py-xs">
                    <span className="text-[11px] text-on-surface-variant/70 italic">Visualizando: {formEventFilter}</span>
                    <button
                      type="button"
                      onClick={selectAllActiveInFilter}
                      className="text-[11px] text-primary font-bold hover:underline flex items-center gap-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      Selecionar todos ativos desta categoria
                    </button>
                  </div>
                )}

                <div className="bg-background border border-outline-variant rounded p-sm max-h-60 overflow-y-auto space-y-md">
                  {WEBHOOK_EVENT_CATALOG.filter(ev => {
                    if (formEventFilter === 'Operação') return ev.category === 'OPERATION';
                    if (formEventFilter === 'Comercial') return ev.category === 'COMMERCIAL';
                    if (formEventFilter === 'Auditoria') return ev.category === 'AUDIT';
                    if (formEventFilter === 'Ativos') return ev.status === 'active';
                    if (formEventFilter === 'Planejados') return ev.status === 'planned';
                    return true;
                  }).map(ev => {
                    const isActive = ev.status === 'active';
                    const isSelected = formEvents.includes(ev.type);
                    const isPreviewExpanded = expandedPreviewEvent === ev.type;

                    return (
                      <div key={ev.type} className={`border-b border-outline-variant/15 pb-sm last:border-b-0 last:pb-0 ${!isActive ? 'opacity-50' : ''}`}>
                        <label className={`flex items-start gap-sm cursor-pointer hover:bg-surface-container/20 rounded p-1 transition-colors ${!isActive ? 'cursor-not-allowed' : ''}`}>
                          <input
                            type="checkbox"
                            className="accent-primary mt-1 shrink-0"
                            disabled={!isActive}
                            checked={isSelected}
                            onChange={() => toggleEventCheckbox(ev.type)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-xs flex-wrap">
                              <span className="font-body-sm text-[12px] text-on-surface font-semibold">{ev.label}</span>
                              <span className="font-mono text-[9px] text-primary/80 bg-primary/5 px-1 rounded">{ev.type}</span>
                              {!isActive && (
                                <span className="text-[8px] bg-outline-variant/35 text-on-surface-variant px-1 rounded font-bold uppercase shrink-0">
                                  Planejado
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-[11px] text-on-surface-variant/70 mt-0.5 leading-relaxed">
                                {ev.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Toggle Preview Button */}
                          {isActive && ev.payloadExample && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedPreviewEvent(isPreviewExpanded ? null : ev.type);
                              }}
                              className={`p-1 rounded hover:bg-surface-container shrink-0 text-on-surface-variant hover:text-on-surface ${isPreviewExpanded ? 'text-primary' : ''}`}
                              title="Visualizar Exemplo de Payload"
                            >
                              <span className="material-symbols-outlined text-[16px]">terminal</span>
                            </button>
                          )}
                        </label>

                        {/* Inline Payload Preview */}
                        {isPreviewExpanded && isActive && ev.payloadExample && (
                          <div className="ml-7 mt-xs bg-black/45 border border-outline-variant/30 rounded p-sm font-mono text-[10px] text-primary max-h-40 overflow-y-auto animate-slide-down">
                            <pre>{JSON.stringify(ev.payloadExample, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {formEvents.length === 0 && (
                  <p className="text-[11px] text-error">Selecione ao menos um evento ativo para assinar</p>
                )}
              </div>

              <label className="flex items-center gap-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                <span className="font-body-sm text-[13px] text-on-surface">Ativar endpoint de imediato</span>
              </label>

              <div className="flex gap-sm justify-end pt-md border-t border-outline-variant/30">
                <Button variant="ghost" type="button" onClick={() => setShowOutboundForm(false)} disabled={formSaving}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={formSaving || formEvents.length === 0}>
                  {formSaving ? 'Salvando…' : editingWebhook ? 'Confirmar Alterações' : 'Criar Endpoint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inbound Form Modal */}
      {showInboundForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-zoom-in">
            <div className="p-lg border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-title-md text-on-surface font-bold">
                {editingInbound ? 'Editar API de Entrada' : 'Nova API de Entrada'}
              </h2>
              <button onClick={() => setShowInboundForm(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleInboundSubmit} className="p-lg space-y-md">
              {formInboundError && (
                <div className="bg-error-container/10 border border-error/20 text-error p-sm rounded text-[12px]">
                  {formInboundError}
                </div>
              )}

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Nome da Integração <span className="text-error">*</span>
                </label>
                <input
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none"
                  placeholder="Ex: Integração Zapier / Chamados"
                  value={formInboundName}
                  onChange={(e) => setFormInboundName(e.target.value)}
                  required
                  maxLength={150}
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Ações Ativas Permitidas <span className="text-error">*</span>
                </label>
                <div className="bg-background border border-outline-variant rounded p-sm space-y-1">
                  {INBOUND_ACTIONS.map(act => (
                    <label key={act} className="flex items-center gap-sm cursor-pointer hover:bg-surface-container/30 rounded px-1 py-0.5 transition-colors">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={formInboundActions.includes(act)}
                        onChange={() => toggleActionCheckbox(act)}
                      />
                      <span className="font-body-sm text-[12px] text-on-surface flex-1">
                        {act === 'ticket.update_status' && 'ticket.update_status (Alterar Status de Chamados)'}
                        {act === 'ticket.add_comment' && 'ticket.add_comment (Adicionar Comentários)'}
                        {act === 'ticket.assign' && 'ticket.assign (Designar Técnico)'}
                        {act === 'contract.update_status' && 'contract.update_status (Alterar Status de Contratos)'}
                      </span>
                    </label>
                  ))}
                </div>
                {formInboundActions.length === 0 && (
                  <p className="text-[11px] text-error">Selecione ao menos uma ação de entrada permitida</p>
                )}
              </div>

              <label className="flex items-center gap-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={formInboundActive}
                  onChange={(e) => setFormInboundActive(e.target.checked)}
                />
                <span className="font-body-sm text-[13px] text-on-surface">API de entrada ativa</span>
              </label>

              <div className="flex gap-sm justify-end pt-md border-t border-outline-variant/30">
                <Button variant="ghost" type="button" onClick={() => setShowInboundForm(false)} disabled={formInboundSaving}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={formInboundSaving || formInboundActions.length === 0}>
                  {formInboundSaving ? 'Salvando…' : editingInbound ? 'Salvar Configuração' : 'Criar Integração'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deliveries Modal */}
      {deliveriesWebhookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-zoom-in">
            <div className="p-md border-b border-outline-variant flex items-center justify-between shrink-0">
              <h2 className="font-title-sm text-on-surface font-semibold">Histórico de Entregas Outbound</h2>
              <button
                onClick={() => { setDeliveriesWebhookId(null); setSelectedDelivery(null); }}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="p-sm bg-surface-container-low border-b border-outline-variant/10 flex flex-wrap gap-sm items-center text-[12px]">
              <div className="flex items-center gap-xs">
                <span>Filtrar Evento:</span>
                <select
                  value={deliveryFilterEvent}
                  onChange={(e) => setDeliveryFilterEvent(e.target.value)}
                  className="bg-background border border-outline-variant/30 rounded p-1 outline-none text-on-surface text-[12px]"
                >
                  <option value="">Todos</option>
                  {WEBHOOK_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-xs">
                <span>Status:</span>
                <select
                  value={deliveryFilterStatus}
                  onChange={(e) => setDeliveryFilterStatus(e.target.value)}
                  className="bg-background border border-outline-variant/30 rounded p-1 outline-none text-on-surface text-[12px]"
                >
                  <option value="">Todos</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="FAILED">Failed</option>
                  <option value="RETRYING">Retrying</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
              {(deliveryFilterEvent || deliveryFilterStatus) && (
                <Button variant="ghost" className="h-6 py-0 px-2 text-[11px]" onClick={() => { setDeliveryFilterEvent(''); setDeliveryFilterStatus(''); }}>
                  Limpar
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12">
              {/* Deliveries list */}
              <div className={`divide-y divide-outline-variant/20 md:col-span-5 border-r border-outline-variant/15`}>
                {deliveriesLoading ? (
                  <div className="flex justify-center items-center py-xl text-on-surface-variant gap-sm">
                    <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <span className="font-body-sm text-[13px]">Carregando…</span>
                  </div>
                ) : filteredDeliveries.length === 0 ? (
                  <div className="p-xl text-center text-on-surface-variant space-y-sm">
                    <span className="material-symbols-outlined text-3xl block">inbox</span>
                    <p className="font-body-sm text-[12px]">Nenhuma entrega registrada com estes filtros.</p>
                  </div>
                ) : (
                  filteredDeliveries.map(d => {
                    const isSelected = selectedDelivery?.id === d.id;
                    return (
                      <div
                        key={d.id}
                        className={`p-sm transition-colors cursor-pointer text-[12px] flex items-center justify-between gap-sm ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-surface-container/20'}`}
                        onClick={() => loadDeliveryDetail(d.id)}
                      >
                        <div className="space-y-xs min-w-0 flex-1">
                          <div className="flex items-center gap-xs">
                            <StatusBadge status={d.status} />
                            <span className="font-mono text-[11px] text-primary truncate max-w-[120px]">{d.eventType}</span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant/60">
                            Tentativa {d.attempt}/{d.maxAttempts}
                          </p>
                        </div>
                        {d.responseStatus && (
                          <span className={`font-mono text-[11px] shrink-0 font-bold ${d.responseStatus >= 200 && d.responseStatus < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                            HTTP {d.responseStatus}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Delivery Details preview panel */}
              <div className="md:col-span-7 p-md space-y-md bg-surface-container-lowest overflow-y-auto">
                {selectedDelivery ? (
                  <div className="space-y-md animate-fade-in">
                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-xs">
                      <h3 className="font-title-sm text-[13px] font-bold text-on-surface">Detalhes da Entrega</h3>
                      <span className="font-mono text-[10px] text-on-surface-variant">{selectedDelivery.id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-sm text-[11px] text-on-surface-variant">
                      <div>Status final: <strong>{selectedDelivery.status}</strong></div>
                      <div>Tentativas: <strong>{selectedDelivery.attempt}/{selectedDelivery.maxAttempts}</strong></div>
                      <div>Código HTTP: <strong>{selectedDelivery.responseStatus || '--'}</strong></div>
                      <div>Enviado em: <strong>{new Date(selectedDelivery.createdAt).toLocaleString('pt-BR')}</strong></div>
                    </div>

                    {selectedDelivery.errorMessage && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-sm rounded text-[11px] font-mono whitespace-pre-wrap break-all">
                        Erro: {selectedDelivery.errorMessage}
                      </div>
                    )}

                    {selectedDelivery.responseBody && (
                      <div className="space-y-xs">
                        <span className="text-[9px] uppercase font-bold text-on-surface-variant">Retorno do Servidor (Response Body):</span>
                        <div className="bg-black/30 border border-outline-variant rounded p-xs font-mono text-[10px] text-on-surface-variant max-h-24 overflow-y-auto select-all">
                          {selectedDelivery.responseBody}
                        </div>
                      </div>
                    )}

                    {!!selectedDelivery.payload && (
                      <div className="space-y-xs">
                        <span className="text-[9px] uppercase font-bold text-on-surface-variant">Payload Criptografado Sanitizado:</span>
                        <div className="bg-black/40 border border-outline-variant rounded p-sm font-mono text-[10px] text-primary max-h-60 overflow-y-auto select-all">
                          <pre>{JSON.stringify(selectedDelivery.payload, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center py-xl text-on-surface-variant/40 space-y-sm h-full">
                    <span className="material-symbols-outlined text-4xl block opacity-40">wysiwyg</span>
                    <p className="text-[12px]">Selecione uma entrega na lista ao lado para ver o payload auditado completo.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
