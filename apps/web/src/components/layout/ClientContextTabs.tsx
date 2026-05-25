'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '../../i18n/useI18n';
import Button from '../ui/Button';

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
      label: t.clients.tabs.summary,
      path: `/dashboard/clients/${clientId}`,
      active: pathname === `/dashboard/clients/${clientId}` && activeTabParam !== 'contacts',
    },
    {
      label: t.clients.tabs.contacts,
      path: `/dashboard/clients/${clientId}?tab=contacts`,
      active: pathname === `/dashboard/clients/${clientId}` && activeTabParam === 'contacts',
    },
    {
      label: t.clients.tabs.users,
      path: `/dashboard/clients/${clientId}/users`,
      active: pathname === `/dashboard/clients/${clientId}/users` || pathname.startsWith(`/dashboard/clients/${clientId}/users/`),
    },
    {
      label: t.clients.tabs.inventory,
      path: `/dashboard/clients/${clientId}/inventory`,
      active: pathname === `/dashboard/clients/${clientId}/inventory` || pathname.startsWith(`/dashboard/clients/${clientId}/inventory/`) || pathname.includes('/assets/'),
    },
    {
      label: t.clients.tabs.tickets,
      path: `/dashboard/clients/${clientId}/tickets`,
      active: pathname === `/dashboard/clients/${clientId}/tickets` || pathname.startsWith(`/dashboard/clients/${clientId}/tickets/`),
    },
    {
      label: t.clients.tabs.contracts,
      path: `/dashboard/clients/${clientId}/contracts`,
      active: pathname === `/dashboard/clients/${clientId}/contracts` || pathname.startsWith(`/dashboard/clients/${clientId}/contracts/`),
    },
    {
      label: t.clients.tabs.history,
      path: '#',
      planned: true,
    },
    {
      label: t.clients.tabs.documents,
      path: '#',
      planned: true,
    },
  ];

  return (
    <div className="flex w-full gap-xs overflow-x-auto border-b border-outline-variant/30 pt-sm -mb-4 pb-0 scrollbar-none">
      {tabItems.map((tab, index) => {
        if (tab.planned) {
          return (
            <div
              key={index}
              className="flex flex-none items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-md py-2 text-[13px] text-on-surface-variant/35 cursor-not-allowed select-none"
              title={t.states.plannedTitle}
            >
              <span className="material-symbols-outlined text-[13px] opacity-40">lock</span>
              <span>{tab.label}</span>
            </div>
          );
        }
        return (
          <Button
            key={index}
            type="button"
            variant="ghost"
            onClick={() => router.push(tab.path)}
            className={`flex-none rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-md py-2 text-[13px] outline-none hover:bg-transparent active:scale-100 ${
              tab.active
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
            }`}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
};

export default ClientContextTabs;
