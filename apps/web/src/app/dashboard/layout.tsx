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
    if (pathname?.startsWith('/dashboard/webhooks')) return t.navigation.webhooks;
    if (pathname?.startsWith('/dashboard/auditoria')) return t.navigation.audit;
    if (pathname?.startsWith('/dashboard/configuracoes')) return t.navigation.settings;
    if (pathname?.startsWith('/dashboard/documentos')) return t.navigation.centralDocuments;
    if (pathname?.startsWith('/dashboard/templates-a4')) return t.navigation.templatesA4;
    if (pathname?.startsWith('/dashboard/perfil')) return t.navigation.profile;
    return 'Peanut OS';
  };

  return (
    <AppShell title={getPageTitle()}>
      {children}
    </AppShell>
  );
}
;
