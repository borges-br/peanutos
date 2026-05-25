'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';
import { useI18n } from '../../../i18n/useI18n';


export default function WebhooksPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="max-w-7xl mx-auto space-y-lg p-md animate-fade-in">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-lg border-b border-outline-variant/30 pb-md">
        <div className="space-y-sm">
          <div className="flex items-center gap-md">
            <h1 className="font-headline-md text-3xl text-on-surface font-semibold tracking-tight">Webhooks</h1>
            <span className="bg-tertiary/10 border border-tertiary/30 text-tertiary px-2.5 py-0.5 font-label-caps text-[10px] rounded uppercase tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="font-body-md text-on-surface-variant max-w-2xl text-[14px]">
            Prepare integrações futuras entre o Peanut OS e ferramentas externas como n8n, ERPs, CRMs e automações internas.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-xs">
          <div className="flex gap-sm flex-wrap">
            <Button
              variant="primary"
              onClick={() => router.push('/dashboard/webhooks/new')}
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">add</span>
              Novo Webhook
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard/webhooks/executions')}
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">history</span>
              Execuções
            </Button>
          </div>
          <p className="font-mono text-[11px] text-on-surface-variant/60 italic mt-1">
            Disponível em uma próxima fase do Peanut OS.
          </p>
        </div>
      </header>

      {/* Highlighted Bento Module */}
      <section className="bg-surface-container/40 border border-outline-variant/40 p-xl rounded-xl relative overflow-hidden group shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-lg items-center">
          <div className="shrink-0 w-14 h-14 bg-primary-container/10 flex items-center justify-center rounded-full border border-primary/20">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>api</span>
          </div>
          <div className="space-y-sm">
            <h2 className="font-headline-md text-lg text-primary font-semibold">Módulo planejado</h2>
            <p className="font-body-md text-on-surface-variant text-[14px] leading-relaxed">
              Esta funcionalidade permitirá que o Peanut OS dispare eventos automáticos em tempo real para URLs externas. Desenvolvemos esta arquitetura para garantir que dados sensíveis nunca sejam expostos, utilizando sistemas de <strong>Signing Secrets</strong> e payloads higienizados para segurança máxima em suas integrações.
            </p>
          </div>
        </div>
      </section>

      {/* Info Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Eventos */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl space-y-md shadow-md">
          <span className="material-symbols-outlined text-tertiary text-2xl">bolt</span>
          <div>
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">Eventos previstos</h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs">Assine disparos baseados em mudanças de estado no sistema.</p>
          </div>
        </div>
        {/* Destinos */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl space-y-md shadow-md">
          <span className="material-symbols-outlined text-primary text-2xl">cloud_sync</span>
          <div>
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">Destinos externos</h3>
            <p className="font-mono text-[12px] text-primary/80 mt-xs truncate">https://exemplo.local/webhook</p>
            <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs">Integração nativa com n8n, Zapier e APIs REST.</p>
          </div>
        </div>
        {/* Segurança */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl space-y-md shadow-md">
          <span className="material-symbols-outlined text-on-secondary-container text-2xl">key</span>
          <div>
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">Segurança</h3>
            <p className="font-mono text-[12px] text-on-surface-variant mt-xs">secret_••••••••••••</p>
            <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs">Segredos protegidos e rotação de chaves integrada.</p>
          </div>
        </div>
        {/* Histórico */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl space-y-md shadow-md">
          <span className="material-symbols-outlined text-on-surface-variant text-2xl">analytics</span>
          <div>
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">Histórico</h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs">Rastreabilidade completa de cada tentativa de envio e retornos de teste.</p>
          </div>
        </div>
      </section>

      {/* Planned Events Chips */}
      <section className="space-y-md">
        <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Eventos planejados</h3>
        <div className="flex flex-wrap gap-sm">
          {[
            'Novo chamado',
            'Fatura vencida',
            'Dispositivo Offline',
            'Alteração de SLA',
            'Upgrade de Plano',
          ].map((event) => (
            <div key={event} className="flex items-center gap-xs bg-surface-container border border-outline-variant px-md py-sm rounded-full">
              <span className="font-body-sm text-[13px] text-on-surface">{event}</span>
              <span className="font-label-caps text-[9px] bg-tertiary/10 border border-tertiary/30 text-tertiary px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                {t.common.planned}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Configured Webhooks Table Section */}
      <section className="space-y-md">
        <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Webhooks configurados</h3>
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xl">
          {/* Filter Bar */}
          <div className="bg-surface-container-low p-md flex flex-wrap gap-md items-center border-b border-outline-variant">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input
                className="w-full bg-background border border-outline-variant rounded-lg py-1.5 pl-10 pr-md font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors"
                placeholder="Buscar webhooks..."
                type="text"
                disabled
              />
            </div>
            <div className="flex gap-sm">
              <select disabled className="bg-background border border-outline-variant rounded-lg px-md py-1.5 font-body-sm text-[13px] text-on-surface outline-none opacity-50 cursor-not-allowed">
                <option>Todos os Eventos</option>
              </select>
              <select disabled className="bg-background border border-outline-variant rounded-lg px-md py-1.5 font-body-sm text-[13px] text-on-surface outline-none opacity-50 cursor-not-allowed">
                <option>Status: Ativos</option>
              </select>
            </div>
          </div>
          {/* Empty State */}
          <div className="min-h-[250px] flex flex-col items-center justify-center p-xl text-center">
            <div className="w-14 h-14 bg-surface-variant/30 rounded-full flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl opacity-40">tab_unselected</span>
            </div>
            <h4 className="font-title-sm text-sm font-semibold text-on-surface">Nenhum webhook configurado</h4>
            <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs max-w-xs leading-relaxed">
              Quando esta funcionalidade for liberada, seus webhooks ativos aparecerão listados aqui.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-md pt-md">
        <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Como vai funcionar</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          {[
            { step: '1', title: 'Escolher evento', desc: 'Selecione o gatilho operacional no Peanut OS.' },
            { step: '2', title: 'URL segura', desc: 'Informe o endpoint HTTPS do seu sistema ou middleware.' },
            { step: '3', title: 'Definir dados', desc: 'Mapeie quais campos do JSON devem ser transmitidos.' },
            { step: '4', title: 'Acompanhar', desc: 'Monitore logs de sucesso e falha em tempo real.' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col gap-sm bg-surface-container/20 p-md rounded-lg border border-outline-variant/30">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-mono font-bold flex items-center justify-center text-sm">
                {item.step}
              </div>
              <h4 className="font-title-sm text-sm font-semibold text-on-surface">{item.title}</h4>
              <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
