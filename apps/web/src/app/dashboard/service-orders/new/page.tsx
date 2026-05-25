'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import PlannedState from '../../../../components/ui/PlannedState';

export default function NewServiceOrderPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      {/* Header */}
      <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            Nova Ordem de Serviço (O.S.)
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            Registre uma nova visita ou atendimento para controle técnico presencial.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/service-orders')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
          {t.common.back}
        </Button>
      </header>

      {/* Planned State component */}
      <PlannedState
        title="Formulário de Abertura de O.S. Planejado"
        description="A criação rápida de O.S. a partir de chamados e inventários associados fará parte do fluxo de expedição técnica na Fase 2."
      />
    </div>
  );
}
