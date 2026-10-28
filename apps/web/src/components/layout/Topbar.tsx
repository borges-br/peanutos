"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { quickActions } from "../../lib/navigation";
import CommandPalette from "./CommandPalette";
export default function Topbar({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick?: () => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState(false),
    [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") setMenu(false);
    };
    const outside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", outside);
    };
  }, []);
  return (
    <>
      <header className="app-topbar">
        <div className="flex items-center gap-sm min-w-0">
          <button
            onClick={onMenuClick}
            className="icon-button md:hidden"
            aria-label="Abrir navegação"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              menu
            </span>
          </button>
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => setSearch(true)}
          className="global-search-trigger"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <span className="hidden sm:inline">Buscar ou ir para…</span>
          <kbd className="hidden lg:inline">Ctrl K</kbd>
        </button>
        <div className="flex gap-sm items-center" ref={ref}>
          <div className="relative">
            <button
              type="button"
              className="create-button"
              aria-expanded={menu}
              aria-controls="quick-create"
              onClick={() => setMenu(!menu)}
            >
              <span aria-hidden="true">＋</span> Criar
            </button>
            {menu && (
              <div
                id="quick-create"
                className="quick-menu"
                aria-label="Criar novo registro"
              >
                {quickActions
                  .filter((a) => !a.roles || a.roles.includes(user?.role))
                  .map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      onClick={() => setMenu(false)}
                    >
                      {a.label}
                    </Link>
                  ))}
              </div>
            )}
          </div>
          <details className="context-help">
            <summary aria-label="Ajuda e atalhos">?</summary>
            <div>
              <strong>Encontre seu próximo passo</strong>
              <p>Ctrl K abre a busca por telas e registros.</p>
              <Link href="/dashboard/contracts">
                Revisar cobranças dos contratos ↗
              </Link>
              <Link href="/dashboard/templates-email">
                Criar um modelo de email ↗
              </Link>
              <Link href="/dashboard/configuracoes/preferencias/aparencia">
                Ajustar leitura e aparência ↗
              </Link>
            </div>
          </details>
          <Link
            href="/dashboard/configuracoes/perfil"
            className="profile-trigger"
            aria-label="Abrir meu perfil"
          >
            {(user?.name || "P").slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </header>
      <CommandPalette open={search} onClose={() => setSearch(false)} />
    </>
  );
}
