import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AppFooter from "./AppFooter";
import { applyAppearance } from "../../lib/appearance";
import { useI18n } from "../../i18n/useI18n";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, title }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previous = document.activeElement as HTMLElement;
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
      if (event.key !== "Tab") return;
      const items = Array.from(
        drawer.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) || [],
      );
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) applyAppearance(user);
  }, [user]);
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background gap-md">
        <div className="w-10 h-10 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p className="text-on-surface-variant font-body-sm">
          {t.common.loading}
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="app-shell flex min-h-screen bg-background text-on-surface overflow-hidden relative">
      <a href="#main-content" className="skip-link">
        Ir para o conteúdo
      </a>
      {/* Sidebar - Desktop (Fixed Sidebar) */}
      <div className="hidden md:block h-screen flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile Drawer */}
      {mobileSidebarOpen && (
        <div
          ref={drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Navegação principal"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative flex w-sidebar-width max-w-xs flex-1 flex-col bg-surface shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="icon-button absolute right-2 top-1 z-10"
              aria-label="Fechar navegação"
            >
              ×
            </button>
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area Wrapper */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* TopBar */}
        <Topbar title={title} onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Content Canvas */}
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main flex-1 overflow-y-auto p-md md:p-lg pb-12 bg-background relative"
        >
          <div className="app-content max-w-[1400px] mx-auto w-full animate-in fade-in duration-300">
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
