'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import { useI18n } from '../../../../../i18n/useI18n';

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { t } = useI18n();

  const rules = [
    { event: 'Novo chamado aberto', desc: 'Disparar quando um ticket de suporte for registrado.', channels: ['Sistema', 'E-mail'] },
    { event: 'SLA em atenção', desc: 'Gatilho quando o prazo limite de resposta estiver próximo.', channels: ['Sistema', 'Webhook'] },
    { event: 'Alteração crítica de acesso', desc: 'Alertar quando as regras de operador ou senhas mudarem.', channels: ['E-mail', 'Webhook'] }
  ];

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Preferências de Notificação
            </h2>
            <span className="text-[10px] bg-secondary-container/30 border border-outline-variant/30 text-on-secondary-container px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="text-[14px] text-on-surface-variant">
            Gerencie as regras de envio e distribuição de alertas operacionais.
          </p>
        </div>

        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/configuracoes')}>
            Voltar para Configurações
          </Button>
        </div>
      </header>

      {/* Planned Warning Block */}
      <section className="bg-surface-container/40 border border-outline-variant/40 rounded-xl p-lg border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent flex items-start gap-md">
        <div className="p-sm bg-primary/20 rounded-lg shrink-0">
          <span className="material-symbols-outlined text-primary text-[28px]">notifications_active</span>
        </div>
        <div>
          <h2 className="font-headline-md text-sm text-primary font-semibold mb-1">Módulo de Regras Planejado</h2>
          <p className="font-body-md text-on-surface-variant text-[13px] leading-relaxed">
            Esta tela é uma simulação operacional em planejamento. Nenhuma notificação ou alerta real está sendo configurado ou transmitido pelo Peanut OS nesta fase.
          </p>
        </div>
      </section>

      {/* Rules Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Main rules list */}
        <div className="lg:col-span-2 space-y-lg">
          <Card title="Gatilhos e Canais Previstos">
            <div className="divide-y divide-outline-variant/30 text-[13px]">
              {rules.map((rule, idx) => (
                <div key={idx} className="py-md flex flex-col md:flex-row justify-between items-start md:items-center gap-md opacity-60">
                  <div className="space-y-xs">
                    <h4 className="font-title-sm text-sm font-semibold text-on-surface flex items-center gap-sm">
                      {rule.event}
                      <span className="text-[8px] bg-secondary-container/40 border border-outline-variant/30 text-on-secondary-container px-1 py-0.5 rounded uppercase font-bold tracking-widest select-none">
                        Previsto
                      </span>
                    </h4>
                    <p className="text-body-sm text-[12px] text-on-surface-variant max-w-md">{rule.desc}</p>
                  </div>
                  <div className="flex gap-xs">
                    {rule.channels.map((chan) => (
                      <span key={chan} className="px-2 py-0.5 bg-surface-container-high border border-outline-variant/40 text-on-surface-variant rounded text-[11px] font-medium font-sans">
                        {chan}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Channels sidebar details */}
        <div className="space-y-lg">
          <Card title="Canais Habilitados">
            <div className="space-y-md text-[12px] text-on-surface-variant">
              <p className="leading-relaxed">
                Apenas os canais abaixo estão mapeados na arquitetura operacional do sistema:
              </p>
              <div className="space-y-xs font-medium">
                {['Sistema (Alerta Visual)', 'E-mail (SMTP)', 'Webhook (JSON Gateway)'].map((chan) => (
                  <div key={chan} className="flex items-center gap-sm py-1 border-b border-outline-variant/20">
                    <span className="material-symbols-outlined text-[16px] text-primary">circle</span>
                    <span>{chan}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
