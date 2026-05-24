'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import { apiRequest } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'next/navigation';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  // Real data state
  const [stats, setStats] = useState({
    clients: null as number | null,
    assets: null as number | null,
    tickets: null as number | null,
    contracts: null as number | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const [clientsRes, assetsRes, ticketsRes, contractsRes] = await Promise.allSettled([
          apiRequest('/clients?limit=1'),
          apiRequest('/assets?limit=1'),
          apiRequest('/tickets?limit=1'),
          apiRequest('/contracts?limit=1'),
        ]);

        setStats({
          clients: clientsRes.status === 'fulfilled' ? clientsRes.value?.meta?.total ?? 0 : null,
          assets: assetsRes.status === 'fulfilled' ? assetsRes.value?.meta?.total ?? 0 : null,
          tickets: ticketsRes.status === 'fulfilled' ? ticketsRes.value?.meta?.total ?? 0 : null,
          contracts: contractsRes.status === 'fulfilled' ? contractsRes.value?.meta?.total ?? 0 : null,
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, []);

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Page Header */}
      <header className="flex flex-col gap-xs mb-md">
        <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
          {t.dashboard.greeting}, {user?.name}! 👋
        </h2>
        <p className="text-[14px] text-on-surface-variant">
          {t.dashboard.subtitle}
        </p>
      </header>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter">
        {/* Open Tickets */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              confirmation_number
            </span>
            <span className="text-[10px] uppercase font-label-caps text-on-surface-variant tracking-wider font-semibold">
              {t.dashboard.cards.openTickets}
            </span>
          </div>
          <div className="mt-base">
            <h4 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
              {loading ? '--' : stats.tickets ?? 'Aguardando dados'}
            </h4>
          </div>
        </div>

        {/* SLA Attention */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
              alarm
            </span>
            <span className="text-[10px] uppercase font-label-caps text-on-surface-variant tracking-wider font-semibold">
              {t.dashboard.cards.slaAttention}
            </span>
          </div>
          <div className="mt-base">
            <h4 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
              --
            </h4>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">
              Aguardando dados
            </p>
          </div>
        </div>

        {/* Assets Maintenance */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>
              build
            </span>
            <span className="text-[10px] uppercase font-label-caps text-on-surface-variant tracking-wider font-semibold">
              {t.dashboard.cards.maintenanceAssets}
            </span>
          </div>
          <div className="mt-base">
            <h4 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
              {loading ? '--' : stats.assets !== null ? '0' : '--'}
            </h4>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">
              Total ativos: {stats.assets ?? '--'}
            </p>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              description
            </span>
            <span className="text-[10px] uppercase font-label-caps text-on-surface-variant tracking-wider font-semibold">
              {t.dashboard.cards.activeContracts}
            </span>
          </div>
          <div className="mt-base">
            <h4 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
              {loading ? '--' : stats.contracts ?? 'Aguardando dados'}
            </h4>
          </div>
        </div>

        {/* Next Expirations */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
              calendar_month
            </span>
            <span className="text-[10px] uppercase font-label-caps text-on-surface-variant tracking-wider font-semibold">
              {t.dashboard.cards.nextExpirations}
            </span>
          </div>
          <div className="mt-base">
            <h4 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
              --
            </h4>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">
              Sem registros
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Detail Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mt-md">
        
        {/* Quick Actions Panel */}
        <section className="lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-xl shadow-black/20">
          <div className="p-md px-lg border-b border-outline-variant bg-surface-container-high">
            <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
              {t.dashboard.sections.quickActions}
            </h3>
          </div>
          <div className="p-lg flex flex-col gap-md">
            <Button variant="secondary" onClick={() => router.push('/dashboard/clients/new')} className="w-full justify-start text-left gap-md py-2">
              <span className="material-symbols-outlined">person_add</span>
              <span>{t.navigation.newClient}</span>
            </Button>
            
            <Button variant="secondary" onClick={() => router.push('/dashboard/tickets/new')} className="w-full justify-start text-left gap-md py-2">
              <span className="material-symbols-outlined">add_task</span>
              <span>{t.navigation.newTicket}</span>
            </Button>

            <Button variant="secondary" onClick={() => router.push('/dashboard/inventory')} className="w-full justify-start text-left gap-md py-2">
              <span className="material-symbols-outlined">devices_other</span>
              <span>{t.navigation.newAsset}</span>
            </Button>

            <Button variant="secondary" onClick={() => router.push('/dashboard/contracts/new')} className="w-full justify-start text-left gap-md py-2">
              <span className="material-symbols-outlined">assignment</span>
              <span>{t.navigation.newContract}</span>
            </Button>

            <div className="h-[1px] bg-outline-variant my-xs"></div>

            <Button variant="secondary" planned className="w-full justify-start text-left gap-md py-2">
              {t.navigation.quotes}
            </Button>

            <Button variant="secondary" planned className="w-full justify-start text-left gap-md py-2">
              {t.navigation.invoices}
            </Button>

            <Button variant="secondary" planned className="w-full justify-start text-left gap-md py-2">
              {t.navigation.serviceOrders}
            </Button>
          </div>
        </section>

        {/* Shortcuts & Operational State */}
        <section className="lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-xl shadow-black/20">
          <div className="p-md px-lg border-b border-outline-variant bg-surface-container-high">
            <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
              {t.dashboard.sections.shortcuts}
            </h3>
          </div>
          <div className="p-lg grid grid-cols-1 md:grid-cols-2 gap-md">
            <div
              onClick={() => router.push('/dashboard/clients')}
              className="flex items-start gap-md p-md bg-surface-container-low border border-outline-variant/40 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors duration-150"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <h4 className="font-title-sm text-sm font-semibold text-on-surface">{t.navigation.clients}</h4>
                <p className="text-[12px] text-on-surface-variant mt-1">Gerencie a carteira de parceiros de suporte.</p>
              </div>
            </div>

            <div
              onClick={() => router.push('/dashboard/inventory')}
              className="flex items-start gap-md p-md bg-surface-container-low border border-outline-variant/40 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors duration-150"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div>
                <h4 className="font-title-sm text-sm font-semibold text-on-surface">{t.navigation.technicalInventory}</h4>
                <p className="text-[12px] text-on-surface-variant mt-1">Ativos, servidores, licenças e roteadores cadastrados.</p>
              </div>
            </div>

            <div
              onClick={() => router.push('/dashboard/tickets')}
              className="flex items-start gap-md p-md bg-surface-container-low border border-outline-variant/40 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors duration-150"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">confirmation_number</span>
              </div>
              <div>
                <h4 className="font-title-sm text-sm font-semibold text-on-surface">{t.navigation.tickets}</h4>
                <p className="text-[12px] text-on-surface-variant mt-1">Chamados de suporte técnico em atendimento.</p>
              </div>
            </div>

            <div
              onClick={() => router.push('/dashboard/contracts')}
              className="flex items-start gap-md p-md bg-surface-container-low border border-outline-variant/40 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors duration-150"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div>
                <h4 className="font-title-sm text-sm font-semibold text-on-surface">{t.navigation.contracts}</h4>
                <p className="text-[12px] text-on-surface-variant mt-1">Termos de compromisso de suporte e acordos SLA.</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
