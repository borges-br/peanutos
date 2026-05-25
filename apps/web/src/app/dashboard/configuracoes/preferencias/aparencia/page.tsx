'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import { useI18n } from '../../../../../i18n/useI18n';

export default function AppearancePreferencesPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Preferências de Aparência
            </h2>
            <span className="text-[10px] bg-secondary-container/30 border border-outline-variant/30 text-on-secondary-container px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="text-[14px] text-on-surface-variant">
            Personalize a visualização, densidade e acessibilidade da interface do Peanut OS.
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
          <span className="material-symbols-outlined text-primary text-[28px]">palette</span>
        </div>
        <div>
          <h2 className="font-headline-md text-sm text-primary font-semibold mb-1">Personalização planejada</h2>
          <p className="font-body-md text-on-surface-variant text-[13px] leading-relaxed">
            As configurações visuais estão pré-diagramadas. A troca dinâmica de temas, densidades e contrastes será suportada após a liberação da folha de estilos global.
          </p>
        </div>
      </section>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Main Settings Form */}
        <div className="lg:col-span-8 flex flex-col gap-lg opacity-60 cursor-not-allowed">
          {/* Tema */}
          <Card title="Tema do Workspace">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              {[
                { name: 'Claro', desc: 'Visualização clássica e clara.' },
                { name: 'Escuro (NOC)', desc: 'Recomendado para visualização contínua.' },
                { name: 'Sistema', desc: 'Sincronizar com as regras do sistema operacional.' }
              ].map((theme, i) => (
                <div key={i} className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-xl space-y-xs pointer-events-none">
                  <div className="flex justify-between items-center">
                    <span className="font-title-sm text-xs font-semibold text-on-surface">{theme.name}</span>
                    <span className="w-4 h-4 rounded-full border border-outline-variant flex items-center justify-center">
                      {theme.name === 'Escuro (NOC)' && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                    </span>
                  </div>
                  <p className="text-body-sm text-[11px] text-on-surface-variant mt-1 leading-normal">{theme.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Densidade e Contraste */}
          <Card title="Densidade e Contraste">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Densidade Visual</label>
                <select disabled className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface outline-none cursor-not-allowed">
                  <option>Padrão (Confortável)</option>
                  <option>Compacto (Painéis NOC)</option>
                </select>
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Contraste de Tela</label>
                <select disabled className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface outline-none cursor-not-allowed">
                  <option>Normal (Padrão)</option>
                  <option>Alto Contraste</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Acessibilidade */}
          <Card title="Acessibilidade">
            <div className="space-y-md">
              <div className="flex items-center justify-between p-md bg-surface-container/20 rounded border border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="font-title-sm text-xs font-semibold text-on-surface">Fontes Aumentadas</span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-1">Legibilidade facilitada em telas de alta resolução.</span>
                </div>
                <div className="w-10 h-5 bg-outline-variant/30 rounded-full relative">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-on-surface-variant/40 rounded-full"></div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar visual preview */}
        <aside className="lg:col-span-4 flex flex-col gap-lg">
          <Card title="Prévia Visual">
            <div className="bg-background border border-outline-variant p-md rounded-xl space-y-md">
              <span className="font-label-caps text-[9px] text-on-surface-variant uppercase font-bold tracking-widest block opacity-60">Prévia do Componente</span>
              <div className="bg-surface border border-outline-variant/40 p-md rounded-lg flex flex-col gap-sm shadow-md">
                <div className="flex justify-between items-center">
                  <span className="font-title-sm text-xs font-semibold text-on-surface">Módulo NOC</span>
                  <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold rounded">Ativo</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded opacity-40"></div>
                <div className="h-2 w-2/3 bg-surface-container-high rounded opacity-40"></div>
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono mt-1">
                  <span>Ping</span>
                  <span>-- ms</span>
                </div>
              </div>
              <p className="text-[12px] text-on-surface-variant leading-relaxed text-center italic opacity-60">
                Prévia baseada no tema &quot;Escuro (NOC)&quot; e densidade &quot;Padrão&quot;.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
