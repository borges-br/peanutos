import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import logoImg from '../../../images/layout/logo.webp';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const userDisplayName = user?.name || t.auth.userFallback;
  const userRoleName = user?.role || t.auth.administratorFallback;
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  const handleNavigation = (path: string) => {
    router.push(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isRouteActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(path);
  };

  const renderNavItem = (label: string, icon: string, path: string) => {
    const active = isRouteActive(path);
    return (
      <button
        onClick={() => handleNavigation(path)}
        className={`flex items-center gap-md w-full px-md py-sm hover:bg-surface-container-high transition-all text-on-surface-variant hover:text-on-surface rounded duration-150 text-left ${active ? 'active-nav font-medium' : ''}`}
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        <span className="font-body-sm">{label}</span>
      </button>
    );
  };

  const renderPlannedItem = (label: string, icon: string, path?: string) => {
    const active = path ? isRouteActive(path) : false;

    if (path) {
      return (
        <button
          onClick={() => handleNavigation(path)}
          className={`flex items-center justify-between w-full px-md py-sm hover:bg-surface-container-high transition-all text-on-surface-variant hover:text-on-surface rounded duration-150 text-left ${active ? 'active-nav font-medium' : ''}`}
        >
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            <span className="font-body-sm">{label}</span>
          </div>
          <span className="text-[9px] bg-secondary-container/20 text-on-secondary-container px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
            {t.common.planned}
          </span>
        </button>
      );
    }

    return (
      <div className="flex items-center justify-between px-md py-sm hover:bg-surface-container-high transition-all text-on-surface-variant/40 cursor-not-allowed select-none rounded">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined text-[18px] opacity-40">{icon}</span>
          <span className="font-body-sm">{label}</span>
        </div>
        <span className="text-[9px] bg-secondary-container/20 text-on-secondary-container px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
          {t.common.planned}
        </span>
      </div>
    );
  };

  return (
    <aside className="w-sidebar-width bg-surface border-r border-outline-variant flex flex-col py-lg h-full select-none z-50">
      {/* Sidebar Header */}
      <div className="px-md mb-xl">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden">
            <img src={logoImg.src} alt="Peanut OS Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-sm font-bold text-primary tracking-tight">Peanut OS</span>
            <span className="text-[10px] font-label-caps uppercase tracking-widest text-on-surface-variant opacity-60">
              Central de TI
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-xs space-y-md">
        {/* Geral */}
        <div>
          <p className="px-md mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant opacity-60">
            {t.navigation.general}
          </p>
          <div className="space-y-base">
            {renderNavItem(t.navigation.home, 'dashboard', '/dashboard')}
          </div>
        </div>

        {/* Operação */}
        <div>
          <p className="px-md mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant opacity-60">
            {t.navigation.operations}
          </p>
          <div className="space-y-base">
            {renderNavItem(t.navigation.clients, 'groups', '/dashboard/clients')}
            {renderNavItem(t.navigation.technicalInventory, 'inventory_2', '/dashboard/inventory')}
            {renderNavItem(t.navigation.tickets, 'confirmation_number', '/dashboard/tickets')}
            {renderPlannedItem(t.navigation.serviceOrders, 'construction', '/dashboard/service-orders')}
          </div>
        </div>

        {/* Comercial */}
        <div>
          <p className="px-md mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant opacity-60">
            {t.navigation.commercial}
          </p>
          <div className="space-y-base">
            {renderPlannedItem(t.navigation.quotes, 'request_quote', '/dashboard/quotes')}
            {renderNavItem(t.navigation.invoices, 'receipt_long', '/dashboard/invoices')}
            {renderNavItem(t.navigation.contracts, 'description', '/dashboard/contracts')}
            {renderNavItem(t.navigation.recurringFinancials, 'account_balance_wallet', '/dashboard/financials')}
          </div>
        </div>

        {/* Documentos */}
        <div>
          <p className="px-md mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant opacity-60">
            {t.navigation.documents}
          </p>
          <div className="space-y-base">
            {renderNavItem(t.navigation.centralDocuments, 'folder_shared', '/dashboard/documentos')}
            {renderNavItem(t.navigation.templatesA4, 'grid_view', '/dashboard/templates-a4')}
          </div>
        </div>

        {/* Automação */}
        <div>
          <p className="px-md mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant opacity-60">
            {t.navigation.automation}
          </p>
          <div className="space-y-base">
            {renderNavItem(t.navigation.webhooks, 'webhook', '/dashboard/webhooks')}
          </div>
        </div>

        {/* Sistema */}
        <div>
          <p className="px-md mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant opacity-60">
            {t.navigation.system}
          </p>
          <div className="space-y-base">
            {renderNavItem(t.navigation.audit, 'history_edu', '/dashboard/auditoria')}
            {renderNavItem(t.navigation.settings, 'settings', '/dashboard/configuracoes')}
          </div>
        </div>
      </nav>

      {/* Sidebar Footer / User Profile */}
      <div className="mt-auto px-md pt-md border-t border-outline-variant">
        <div className="flex items-center gap-sm p-sm hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors duration-150 group">
          <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center border border-outline-variant overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={userDisplayName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-primary text-sm">{userInitials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-title-sm text-xs truncate text-on-surface font-semibold">{userDisplayName}</p>
            <p className="text-[10px] text-on-surface-variant truncate uppercase tracking-wider">{userRoleName}</p>
          </div>
          <button
            onClick={logout}
            className="material-symbols-outlined text-error-container hover:text-error transition-colors p-1"
            title={t.auth.logout}
          >
            logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
