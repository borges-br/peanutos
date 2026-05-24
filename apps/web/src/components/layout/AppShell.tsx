import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AppFooter from './AppFooter';
import { useI18n } from '../../i18n/useI18n';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, title }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#08090D] gap-md">
        <div className="w-10 h-10 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p className="text-on-surface-variant font-body-sm">{t.common.loading}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#08090D] text-on-surface overflow-hidden relative">
      {/* Sidebar - Desktop (Fixed Sidebar) */}
      <div className="hidden md:block h-screen flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative flex w-sidebar-width max-w-xs flex-1 flex-col bg-surface shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area Wrapper */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* TopBar */}
        <Topbar title={title} onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto p-md md:p-lg pb-12 bg-background relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in duration-300">
            {children}
          </div>
        </main>

        {/* Global Footer (hidden on mobile if it obstructs layout) */}
        <div className="hidden sm:block">
          <AppFooter />
        </div>
      </div>
    </div>
  );
};

export default AppShell;
