'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import PlannedState from '../../../../components/ui/PlannedState';

export default function QuoteDetailPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.quotes.detailTitle}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.quotes.detailSubtitle}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/quotes')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
          {t.common.back}
        </Button>
      </header>

      {/* Planned State component */}
      <PlannedState
        title="Dossiê Comercial Planejado"
        description="A visualização de propostas enviadas aos clientes contará com controle de aprovação por assinatura digital na próxima fase."
      />
    </div>
  );
}
