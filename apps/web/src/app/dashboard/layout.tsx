'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AppShell from '../../components/layout/AppShell';
import { useI18n } from '../../i18n/useI18n';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const getPageTitle = () => {
    if (pathname === '/dashboard') return t.navigation.home;
    if (pathname?.startsWith('/dashboard/clients')) return t.navigation.clients;
    if (pathname?.startsWith('/dashboard/inventory')) return t.navigation.technicalInventory;
    if (pathname?.startsWith('/dashboard/tickets')) return t.navigation.tickets;
    if (pathname?.startsWith('/dashboard/contracts')) return t.navigation.contracts;
    if (pathname?.startsWith('/dashboard/financials')) return t.navigation.recurringFinancials;
    return 'Peanut OS';
  };

  return (
    <AppShell title={getPageTitle()}>
      {children}
    </AppShell>
  );
}
;
