'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { useI18n } from '../../../../i18n/useI18n';

export default function WebhookExecutionsPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Inner Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Execuções de Webhook
            </h2>
            <span className="text-[10px] bg-secondary-container/30 border border-outline-variant/30 text-on-secondary-container px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="text-[14px] text-on-surface-variant">
            Histórico e status de tentativas de entrega de eventos para endpoints externos.
          </p>
        </div>

        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/webhooks')}>
            Voltar para Webhooks
          </Button>
        </div>
      </header>

      {/* Planned Warning Block */}
      <section className="bg-surface-container/40 border border-outline-variant/40 rounded-xl p-lg border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent flex items-start gap-md">
        <div className="p-sm bg-primary/20 rounded-lg shrink-0">
          <span className="material-symbols-outlined text-primary text-[28px]">analytics</span>
        </div>
        <div>
          <h2 className="font-headline-md text-sm text-primary font-semibold mb-1">Módulo de Telemetria Planejado</h2>
          <p className="font-body-md text-on-surface-variant text-[13px] leading-relaxed">
            O rastreamento de logs técnicos de webhooks não registrará dados reais nesta fase. O painel abaixo é uma simulação de telemetria operacional.
          </p>
        </div>
      </section>

      {/* Execution Logs Table Card */}
      <Card title="Logs de Execução Recentes">
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-background">
          {/* Mock Filters Bar */}
          <div className="bg-surface-container-low p-md flex flex-wrap gap-md items-center border-b border-outline-variant opacity-60">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input
                disabled
                className="w-full bg-background border border-outline-variant rounded-lg py-1.5 pl-10 pr-md font-body-sm text-[13px] text-on-surface cursor-not-allowed outline-none"
                placeholder="Filtrar por URL ou ID..."
                type="text"
              />
            </div>
            <div className="flex gap-sm">
              <select disabled className="bg-background border border-outline-variant rounded-lg px-md py-1.5 font-body-sm text-[13px] text-on-surface cursor-not-allowed">
                <option>Todos os Eventos</option>
              </select>
              <select disabled className="bg-background border border-outline-variant rounded-lg px-md py-1.5 font-body-sm text-[13px] text-on-surface cursor-not-allowed">
                <option>Filtrar por Status</option>
              </select>
            </div>
          </div>

          {/* Table / Empty State */}
          <div className="min-h-[300px] flex flex-col items-center justify-center p-xl text-center">
            <div className="w-14 h-14 bg-surface-variant/30 rounded-full flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl opacity-40">troubleshoot</span>
            </div>
            <h4 className="font-title-sm text-sm font-semibold text-on-surface">Nenhuma execução registrada</h4>
            <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs max-w-xs leading-relaxed">
              O histórico de requisições enviadas e respostas HTTP (200, 500, etc.) aparecerá estruturado nesta seção quando o módulo for integrado.
            </p>
          </div>
        </div>
      </Card>
    </main>
  );
}
