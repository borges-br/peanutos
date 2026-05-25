'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '../../i18n/useI18n';

interface ClientContextTabsProps {
  clientId: string;
}

export const ClientContextTabs: React.FC<ClientContextTabsProps> = ({ clientId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const activeTabParam = searchParams.get('tab');

  const tabItems = [
    {
      label: t.clients.tabs.summary || 'Resumo',
      path: `/dashboard/clients/${clientId}`,
      active: pathname === `/dashboard/clients/${clientId}` && activeTabParam !== 'contacts',
    },
    {
      label: t.clients.tabs.contacts || 'Contatos',
      path: `/dashboard/clients/${clientId}?tab=contacts`,
      active: pathname === `/dashboard/clients/${clientId}` && activeTabParam === 'contacts',
    },
    {
      label: t.clients.tabs.users || 'Usuários',
      path: `/dashboard/clients/${clientId}/users`,
      active: pathname === `/dashboard/clients/${clientId}/users` || pathname.startsWith(`/dashboard/clients/${clientId}/users/`),
    },
    {
      label: t.clients.tabs.inventory || 'Inventário',
      path: `/dashboard/clients/${clientId}/inventory`,
      active: pathname === `/dashboard/clients/${clientId}/inventory` || pathname.startsWith(`/dashboard/clients/${clientId}/inventory/`) || pathname.includes('/assets/'),
    },
    {
      label: t.clients.tabs.tickets || 'Chamados',
      path: `/dashboard/clients/${clientId}/tickets`,
      active: pathname === `/dashboard/clients/${clientId}/tickets` || pathname.startsWith(`/dashboard/clients/${clientId}/tickets/`),
    },
    {
      label: t.clients.tabs.contracts || 'Contratos',
      path: `/dashboard/clients/${clientId}/contracts`,
      active: pathname === `/dashboard/clients/${clientId}/contracts` || pathname.startsWith(`/dashboard/clients/${clientId}/contracts/`),
    },
    {
      label: t.clients.tabs.history || 'Histórico',
      path: '#',
      planned: true,
    },
    {
      label: 'Documentos',
      path: '#',
      planned: true,
    },
  ];

  return (
    <div className="flex flex-wrap gap-xs border-b border-outline-variant/30 pt-md -mb-4 w-full overflow-x-auto scrollbar-none">
      {tabItems.map((tab, index) => {
        if (tab.planned) {
          return (
            <div
              key={index}
              className="px-md py-2 border-b-2 border-transparent text-[13px] text-on-surface-variant/35 cursor-not-allowed select-none flex items-center gap-1.5 whitespace-nowrap"
              title="Módulo planejado"
            >
              <span className="material-symbols-outlined text-[13px] opacity-40">lock</span>
              <span>{tab.label}</span>
            </div>
          );
        }
        return (
          <button
            key={index}
            onClick={() => router.push(tab.path)}
            className={`px-md py-2 border-b-2 text-[13px] font-medium transition-all duration-150 whitespace-nowrap outline-none ${
              tab.active
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default ClientContextTabs;
