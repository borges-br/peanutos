'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { useI18n } from '../../../../i18n/useI18n';

export default function NewWebhookPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Inner Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Novo Webhook
            </h2>
            <span className="text-[10px] bg-secondary-container/30 border border-outline-variant/30 text-on-secondary-container px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="text-[14px] text-on-surface-variant">
            Configure uma integração futura para enviar eventos do Peanut OS a ferramentas externas.
          </p>
        </div>

        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/webhooks')}>
            Cancelar
          </Button>
          <Button variant="primary" disabled title="Módulo planejado para uma próxima fase">
            Salvar Webhook
          </Button>
        </div>
      </header>

      {/* Planned Warning Block */}
      <section className="bg-surface-container/40 border border-outline-variant/40 rounded-xl p-lg border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent flex items-start gap-md">
        <div className="p-sm bg-primary/20 rounded-lg shrink-0">
          <span className="material-symbols-outlined text-primary text-[28px]">rocket_launch</span>
        </div>
        <div>
          <h2 className="font-headline-md text-sm text-primary font-semibold mb-1">Integração planejada</h2>
          <p className="font-body-md text-on-surface-variant text-[13px] leading-relaxed">
            A criação de webhooks ainda não está ativa. Esta tela representa a estrutura de metadados prevista para a configuração futura de integrações.
          </p>
        </div>
      </section>

      {/* Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Main Column: Form Fields */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* 1. Identificação */}
          <Card title="Identificação">
            <div className="space-y-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Nome do webhook</label>
                <input
                  disabled
                  className="bg-background border border-outline-variant rounded-lg px-md py-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors opacity-60 cursor-not-allowed w-full"
                  placeholder="Ex.: Avisar n8n sobre novo chamado"
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Descrição</label>
                <textarea
                  disabled
                  className="bg-background border border-outline-variant rounded-lg px-md py-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors opacity-60 cursor-not-allowed w-full resize-none"
                  placeholder="Descreva o propósito desta integração..."
                  rows={2}
                />
              </div>
            </div>
          </Card>

          {/* 2. Evento de disparo */}
          <Card title="Evento de disparo">
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Selecione o evento</label>
              <select disabled className="bg-background border border-outline-variant rounded-lg px-md py-sm font-body-sm text-[13px] text-on-surface outline-none opacity-60 cursor-not-allowed w-full">
                <option disabled selected>Selecione um gatilho...</option>
                <option>Novo chamado (Planejado)</option>
                <option>Status alterado (Planejado)</option>
                <option>Contrato vencendo (Planejado)</option>
                <option>Fatura vencida (Planejado)</option>
              </select>
            </div>
          </Card>

          {/* 3. Destino */}
          <Card title="Destino">
            <div className="space-y-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">URL de Destino (Endpoint)</label>
                <input
                  disabled
                  className="bg-background border border-outline-variant rounded-lg px-md py-sm font-mono text-[12px] text-on-surface focus:border-primary outline-none transition-colors opacity-60 cursor-not-allowed w-full"
                  placeholder="https://exemplo.local/webhook"
                  type="url"
                />
              </div>
              <div className="flex items-center gap-sm p-sm bg-error-container/10 border border-error-container/20 rounded">
                <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                <p className="font-body-sm text-[12px] text-error/80">Por segurança, nunca informe tokens, senhas ou chaves diretamente na URL.</p>
              </div>
            </div>
          </Card>

          {/* 4. Segurança */}
          <Card title="Segurança">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Segredo de assinatura (Signing Secret)</label>
                <input
                  disabled
                  className="bg-background border border-outline-variant rounded-lg px-md py-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors opacity-60 cursor-not-allowed w-full"
                  placeholder="••••••••••••"
                  type="password"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Privacidade de Dados</label>
                <select disabled className="bg-background border border-outline-variant rounded-lg px-md py-sm font-body-sm text-[13px] text-on-surface outline-none opacity-60 cursor-not-allowed w-full">
                  <option selected>Não enviar dados sensíveis</option>
                  <option>Enviar apenas metadados</option>
                  <option>Payload completo (Acesso restrito)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* 5. Payload */}
          <Card title="Dados enviados (Payload)">
            <div className="space-y-md">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                {['ID', 'Tipo', 'Data', 'Status'].map((field) => (
                  <label key={field} className="flex items-center gap-sm cursor-not-allowed opacity-60">
                    <div className="w-5 h-5 rounded border border-outline-variant bg-surface-container-lowest flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'wght' 600" }}>check</span>
                    </div>
                    <span className="font-body-md text-[13px] text-on-surface-variant">{field}</span>
                  </label>
                ))}
                {['Cliente', 'Responsável', 'Resumo'].map((field) => (
                  <label key={field} className="flex items-center gap-sm cursor-not-allowed opacity-30">
                    <div className="w-5 h-5 rounded border border-outline-variant bg-surface-container-lowest"></div>
                    <span className="font-body-md text-[13px] text-on-surface-variant">{field}</span>
                  </label>
                ))}
              </div>
              <p className="font-body-sm text-[12px] text-on-surface-variant italic opacity-60 border-t border-outline-variant/20 pt-md">
                * O conteúdo do payload JSON de envio será definido na fase de ativação do módulo.
              </p>
            </div>
          </Card>
        </div>

        {/* Sidebar Column */}
        <aside className="lg:col-span-4 flex flex-col gap-lg">
          {/* Summary */}
          <Card title="Resumo do Webhook">
            <div className="flex flex-col gap-lg">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Status</span>
                  <div className="flex items-center gap-xs mt-xs">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <span className="font-mono text-[11px] text-on-surface uppercase font-bold">Planejado</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Versão API</span>
                  <span className="block font-mono text-[11px] text-on-surface font-semibold">v2024.1 (beta)</span>
                </div>
              </div>
              <div className="space-y-md">
                <div className="flex flex-col border-l-2 border-outline-variant pl-md">
                  <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Nome</span>
                  <span className="font-body-md text-[13px] text-on-surface-variant">--</span>
                </div>
                <div className="flex flex-col border-l-2 border-outline-variant pl-md">
                  <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Evento</span>
                  <span className="font-body-md text-[13px] text-on-surface-variant">--</span>
                </div>
                <div className="flex flex-col border-l-2 border-outline-variant pl-md">
                  <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Destino</span>
                  <span className="font-mono text-[11px] text-on-surface-variant/40 truncate">Aguardando URL...</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Guidelines */}
          <Card title="Boas práticas">
            <ul className="flex flex-col gap-md">
              {[
                'Utilize um endpoint sob seu controle (Ex: n8n, Zapier ou servidor próprio).',
                'Nunca envie segredos ou tokens de autenticação via query params na URL.',
                'Selecione apenas os dados estritamente necessários para a sua automação.',
                'Audite regularmente integrações que possuam acesso a dados sensíveis.',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-primary text-[16px] mt-xs">check_circle</span>
                  <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </main>
  );
}
