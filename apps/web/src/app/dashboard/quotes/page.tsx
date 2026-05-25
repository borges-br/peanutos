'use client';

import React from 'react';
import { useI18n } from '../../../i18n/useI18n';
import Button from '../../../components/ui/Button';
import PlannedState from '../../../components/ui/PlannedState';

export default function QuotesPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.quotes.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.quotes.subtitle}
          </p>
        </div>
        <Button variant="primary" disabled className="opacity-60">
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
          Novo Orçamento — Planejado
        </Button>
      </header>

      {/* Planned State component */}
      <PlannedState
        title={t.quotes.cardTitle}
        description="O módulo de orçamentos permitirá criar propostas técnicas comerciais para serviços e equipamentos de TI, com aprovação online."
      />
    </div>
  );
}
