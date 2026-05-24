import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../i18n/useI18n';

interface TopbarProps {
  title: string;
  onMenuClick?: () => void; // for mobile drawer
}

export const Topbar: React.FC<TopbarProps> = ({ title, onMenuClick }) => {
  const router = useRouter();
  const { t } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-topbar-height flex justify-between items-center px-lg w-full sticky top-0 z-40 bg-surface border-b border-outline-variant select-none">
      <div className="flex items-center gap-md md:gap-xl flex-1">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onMenuClick}
          className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant md:hidden"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <h1 className="font-headline-md text-headline-md font-bold text-primary truncate max-w-[200px] md:max-w-none">
          {title}
        </h1>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-xs md:max-w-md group hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
            search
          </span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-1.5 pl-10 pr-16 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary transition-all duration-200"
            placeholder={t.common.search}
            type="text"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-focus-within:opacity-100 transition-opacity">
            <span className="px-1 border border-outline-variant rounded text-[10px] font-mono">⌘</span>
            <span className="px-1 border border-outline-variant rounded text-[10px] font-mono">K</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-sm md:gap-md relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="bg-primary text-on-primary-fixed font-semibold text-sm px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-primary-fixed-dim transition-all active:scale-95 shadow-lg shadow-primary/10"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>{t.navigation.new}</span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-11 w-56 bg-surface-container-low border border-outline-variant rounded-xl p-xs shadow-2xl shadow-black/80 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                router.push('/dashboard/clients/new');
                setDropdownOpen(false);
              }}
              className="flex items-center gap-md w-full px-md py-sm hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded text-left transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span className="text-body-sm">{t.navigation.newClient}</span>
            </button>
            
            <button
              onClick={() => {
                router.push('/dashboard/tickets/new');
                setDropdownOpen(false);
              }}
              className="flex items-center gap-md w-full px-md py-sm hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded text-left transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              <span className="text-body-sm">{t.navigation.newTicket}</span>
            </button>

            <button
              onClick={() => {
                router.push('/dashboard/inventory'); // goes to inventory main list where user can add
                setDropdownOpen(false);
              }}
              className="flex items-center gap-md w-full px-md py-sm hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded text-left transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">devices_other</span>
              <span className="text-body-sm">{t.navigation.newAsset}</span>
            </button>

            <button
              onClick={() => {
                router.push('/dashboard/contracts/new');
                setDropdownOpen(false);
              }}
              className="flex items-center gap-md w-full px-md py-sm hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded text-left transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">assignment</span>
              <span className="text-body-sm">{t.navigation.newContract}</span>
            </button>

            <div className="h-[1px] bg-outline-variant my-xs"></div>

            <div className="flex items-center justify-between px-md py-sm text-on-surface-variant/40 cursor-not-allowed select-none">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-[16px] opacity-40">lock</span>
                <span className="text-body-sm">{t.navigation.quotes}</span>
              </div>
              <span className="text-[9px] bg-secondary-container/20 text-on-secondary-container px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                {t.common.planned}
              </span>
            </div>

            <div className="flex items-center justify-between px-md py-sm text-on-surface-variant/40 cursor-not-allowed select-none">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-[16px] opacity-40">lock</span>
                <span className="text-body-sm">{t.navigation.invoices}</span>
              </div>
              <span className="text-[9px] bg-secondary-container/20 text-on-secondary-container px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                {t.common.planned}
              </span>
            </div>

            <div className="flex items-center justify-between px-md py-sm text-on-surface-variant/40 cursor-not-allowed select-none">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-[16px] opacity-40">lock</span>
                <span className="text-body-sm">{t.navigation.serviceOrders}</span>
              </div>
              <span className="text-[9px] bg-secondary-container/20 text-on-secondary-container px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                {t.common.planned}
              </span>
            </div>
          </div>
        )}

        <div className="h-8 w-[1px] bg-outline-variant mx-xs hidden md:block"></div>

        {/* Action icons with tooltips */}
        <div className="flex items-center gap-xs">
          <button
            className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-lg transition-all relative"
            title={t.navigation.notifications}
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          
          <button
            className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-lg transition-all"
            title={t.navigation.help}
          >
            <span className="material-symbols-outlined">help</span>
          </button>

          <button
            className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-lg transition-all"
            title={t.navigation.account}
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
