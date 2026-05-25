'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import PlannedState from '../../../../components/ui/PlannedState';

export default function ServiceOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const serviceOrderId = params.serviceOrderId as string;

  const [activeTab, setActiveTab] = useState<'summary' | 'service' | 'items' | 'history'>('summary');

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      {/* Header */}
      <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-lg">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Ordem de Serviço #{serviceOrderId?.substring(0, 8) || 'OS-2026-0043'}
            </h2>
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase">
              Planejada
            </span>
          </div>
          <p className="text-[12px] text-on-surface-variant font-mono">
            Módulo operacional planejado para controle em campo.
          </p>
        </div>
        
        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/service-orders')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
            {t.common.back}
          </Button>

          <Button
            variant="secondary"
            onClick={() => router.push(`/dashboard/service-orders/${serviceOrderId}/preview`)}
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">visibility</span>
            Visualizar A4
          </Button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex gap-xs border-b border-outline-variant/20 -mt-md">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'summary'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => setActiveTab('service')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'service'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Serviço
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'items'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Itens
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'history'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Histórico
        </button>
      </div>

      {/* Planned State component */}
      <PlannedState
        title="Dossiê Técnico da Ordem de Serviço Planejado"
        description="A visualização detalhada de checklists operacionais, relatórios fotográficos de manutenção preventiva e histórico de execução física ficará disponível na próxima fase."
      />
    </div>
  );
}
