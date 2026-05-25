'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { useI18n } from '../../../../i18n/useI18n';

export const dynamic = 'force-dynamic';

export default function WebhookDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Inner Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Detalhes do Webhook
            </h2>
            <span className="text-[10px] bg-secondary-container/30 border border-outline-variant/30 text-on-secondary-container px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="text-[14px] text-on-surface-variant font-mono">
            ID: {params.id || 'wh_default_uuid'}
          </p>
        </div>

        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/webhooks')}>
            Voltar
          </Button>
          <Button variant="danger" disabled title="Módulo planejado para uma próxima fase">
            Excluir Webhook
          </Button>
        </div>
      </header>

      {/* Access Restriction Banner */}
      <section className="bg-error-container/10 border border-error/20 rounded-xl p-lg flex items-start gap-md">
        <div className="p-sm bg-error-container/20 rounded-lg shrink-0">
          <span className="material-symbols-outlined text-error text-[28px]">lock</span>
        </div>
        <div>
          <h2 className="font-headline-md text-sm text-error font-semibold mb-1">Dados de Acesso Restrito</h2>
          <p className="font-body-md text-on-surface-variant text-[13px] leading-relaxed">
            As credenciais de segurança e payloads completos associados a este webhook estão sob criptografia AES-256 e protegidos por permissões de auditoria administrativa.
          </p>
        </div>
      </section>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Webhook Configuration Block */}
        <div className="lg:col-span-2 space-y-lg">
          <Card title="Configuração">
            <div className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Nome do webhook</span>
                  <span className="font-body-md text-[14px] text-on-surface font-semibold">Gatilho de Chamado Externo</span>
                </div>
                <div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Status</span>
                  <div className="flex items-center gap-xs mt-1">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="font-mono text-[11px] text-on-surface uppercase font-bold">Planejado</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">URL de Destino</span>
                <span className="font-mono text-[13px] text-primary select-all">https://exemplo.local/webhook</span>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Evento Vinculado</span>
                <span className="font-body-md text-[13px] text-on-surface">Novo chamado criado no sistema (ticket.created)</span>
              </div>
            </div>
          </Card>

          <Card title="Parâmetros de Segurança">
            <div className="space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Segredo de Assinatura</span>
                  <div className="bg-black/30 p-sm rounded border border-outline-variant/30 font-mono text-[12px] text-on-surface-variant tracking-wider mt-1">
                    ••••••••••••
                  </div>
                </div>
                <div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Nível de Privacidade</span>
                  <span className="block mt-2 text-body-sm text-[13px] text-on-surface">Dado protegido / Metadados Higienizados</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Audit Details Sidebar */}
        <div className="flex flex-col gap-lg">
          <Card title="Metadados">
            <div className="space-y-md">
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Criado em</span>
                <span className="font-body-md text-[13px] text-on-surface-variant">--</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Modificado por</span>
                <span className="font-body-md text-[13px] text-on-surface-variant">Dado protegido</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Total de Disparos</span>
                <span className="font-mono text-[12px] text-on-surface font-semibold">0</span>
              </div>
            </div>
          </Card>

          <Card title="Logs e Testes">
            <div className="space-y-sm text-center py-md flex flex-col items-center">
              <span className="material-symbols-outlined text-[36px] text-on-surface-variant opacity-30 mb-2">science</span>
              <p className="font-body-sm text-[12px] text-on-surface-variant max-w-[200px] leading-relaxed">
                A simulação de envio e histórico de disparos estarão ativos após a homologação operacional.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
