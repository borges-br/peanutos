'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewWebhookPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After creation: show secret once
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleEvent = (ev: string) =>
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url || events.length === 0) {
      setError('Preencha nome, URL e selecione ao menos um evento.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await apiRequest('/webhooks', {
        method: 'POST',
        body: JSON.stringify({ name, url, events, isActive }),
      });
      setRevealedSecret(result.secret);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar webhook');
    } finally {
      setSaving(false);
    }
  };

  const copySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Secret reveal screen after creation
  if (revealedSecret) {
    return (
      <main className="max-w-lg mx-auto p-md space-y-lg animate-fade-in">
        <div className="bg-surface border border-outline-variant rounded-xl shadow-lg p-lg space-y-lg">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-amber-400 text-2xl">key</span>
            <h1 className="font-title-md text-on-surface font-semibold">Webhook criado com sucesso</h1>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-md rounded-lg flex items-start gap-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
            <p className="font-body-sm text-[12px] leading-relaxed">
              <strong>Este segredo será exibido apenas uma vez.</strong> Copie-o agora e armazene com segurança.
              Ele é usado para verificar a autenticidade das requisições via HMAC SHA-256.
            </p>
          </div>

          <div className="bg-black/40 border border-outline-variant rounded p-md font-mono text-[12px] text-primary break-all select-all">
            {revealedSecret}
          </div>

          <p className="text-[11px] text-on-surface-variant">
            Use este segredo para verificar a assinatura no header{' '}
            <code className="bg-surface-container px-1 py-0.5 rounded text-primary">X-Peanut-Signature</code>.
          </p>

          <div className="flex gap-sm justify-end pt-sm border-t border-outline-variant/30">
            <Button variant="outline" onClick={copySecret}>
              <span className="material-symbols-outlined text-[16px] mr-1">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copiado!' : 'Copiar Segredo'}
            </Button>
            <Button variant="primary" onClick={() => router.push('/dashboard/webhooks')}>
              Ir para Webhooks
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="space-y-xs">
          <button
            onClick={() => router.push('/dashboard/webhooks')}
            className="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors font-body-sm text-[12px] mb-xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Webhooks
          </button>
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">Novo Webhook</h2>
          <p className="text-[14px] text-on-surface-variant">Configure um endpoint para receber eventos do Peanut OS via HTTP POST.</p>
        </div>
        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/webhooks')}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || events.length === 0}>
            {saving ? 'Criando…' : 'Criar Webhook'}
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-error-container/10 border border-error/20 text-error p-md rounded-lg text-[13px]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        <div className="lg:col-span-8 space-y-lg">
          <Card title="Identificação">
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Nome <span className="text-error">*</span>
              </label>
              <input
                className="bg-background border border-outline-variant rounded-lg px-md py-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors w-full"
                placeholder="Ex.: Notificações de Fatura para n8n"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={150}
              />
            </div>
          </Card>

          <Card title="URL do Endpoint">
            <div className="space-y-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  URL <span className="text-error">*</span>
                </label>
                <input
                  className="bg-background border border-outline-variant rounded-lg px-md py-sm font-mono text-[12px] text-on-surface focus:border-primary outline-none transition-colors w-full"
                  placeholder="https://seu-sistema.com/webhooks/peanut"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  required
                  type="url"
                />
              </div>
              <div className="flex items-center gap-sm p-sm bg-error-container/10 border border-error-container/20 rounded">
                <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                <p className="font-body-sm text-[12px] text-error/80">Nunca inclua tokens, senhas ou chaves diretamente na URL.</p>
              </div>
            </div>
          </Card>

          <Card title="Eventos">
            <div className="space-y-sm">
              <p className="font-body-sm text-[12px] text-on-surface-variant">
                Selecione os eventos que este webhook deve receber. Ao menos um é obrigatório.
              </p>
              <div className="bg-background border border-outline-variant rounded-lg p-sm space-y-0.5">
                {WEBHOOK_EVENTS.map(ev => (
                  <label key={ev.value} className="flex items-center gap-sm cursor-pointer hover:bg-surface-container/30 rounded px-sm py-1 transition-colors">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={events.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                    />
                    <span className="font-body-sm text-[13px] text-on-surface flex-1">{ev.label}</span>
                    <span className="font-mono text-[10px] text-on-surface-variant/60">{ev.value}</span>
                  </label>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Status">
            <label className="flex items-center gap-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
              <span className="font-body-sm text-[13px] text-on-surface">Webhook ativo imediatamente após criação</span>
            </label>
          </Card>
        </div>

        <aside className="lg:col-span-4 space-y-lg">
          <Card title="Resumo">
            <div className="space-y-md text-[13px]">
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Nome</span>
                <span className="text-on-surface">{name || '—'}</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">URL</span>
                <span className="font-mono text-[11px] text-on-surface-variant break-all">{url || '—'}</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">
                  Eventos ({events.length})
                </span>
                {events.length === 0 ? (
                  <span className="text-on-surface-variant/60">Nenhum selecionado</span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {events.map(ev => (
                      <span key={ev} className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] rounded font-mono">
                        {ev}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card title="Boas práticas">
            <ul className="space-y-md">
              {[
                'Use um endpoint sob seu controle (n8n, Zapier ou servidor próprio).',
                'Valide a assinatura HMAC em cada requisição recebida.',
                'Selecione apenas os eventos necessários para a sua automação.',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check_circle</span>
                  <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </form>
    </main>
  );
}
