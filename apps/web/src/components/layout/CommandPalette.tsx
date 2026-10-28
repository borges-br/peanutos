"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import { matchDestinations } from "../../lib/navigation";
export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState(""),
    [records, setRecords] = useState<any[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [active, setActive] = useState(0);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const usageKey = "peanut:search-usage:" + user?.workspaceId + ":" + user?.id;
  useEffect(() => {
    try {
      setUsage(JSON.parse(localStorage.getItem(usageKey) || "{}"));
    } catch {
      setUsage({});
    }
  }, [usageKey]);
  const results = [
    ...matchDestinations(query, user?.role || "", usage).map((d) => ({
      ...d,
      kind: d.group,
    })),
    ...records,
  ];
  useEffect(() => {
    const modal = dialog.current,
      surface = modal?.querySelector(".t-modal");
    if (open) {
      modal?.showModal();
      if (surface) {
        surface.classList.remove("is-closing");
        void (surface as HTMLElement).offsetWidth;
        surface.classList.add("is-open");
      }
      input.current?.focus();
    } else {
      surface?.classList.remove("is-open");
      surface?.classList.add("is-closing");
      const ms =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--modal-close-dur",
          ),
        ) || 150;
      const timer = setTimeout(() => {
        modal?.close();
        surface?.classList.remove("is-closing");
        setQuery("");
        setRecords([]);
      }, ms);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let current = true;
    setActive(0);
    setRecords([]);
    setError("");
    setLoading(query.trim().length >= 2);
    const timer = setTimeout(() => {
      if (query.trim().length < 2) return;
      apiRequest("/search?q=" + encodeURIComponent(query))
        .then((data) => {
          if (current) setRecords(data.data || []);
        })
        .catch(() => {
          if (current)
            setError("Não foi possível buscar os registros. Tente novamente.");
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, open]);
  function go(item: any) {
    const next = { ...usage, [item.href]: (usage[item.href] || 0) + 1 };
    setUsage(next);
    localStorage.setItem(usageKey, JSON.stringify(next));
    onClose();
    router.push(item.href);
  }
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      className="command-dialog"
      aria-labelledby="command-title"
    >
      <div className="command-surface t-modal">
        <header className="flex items-center gap-md border-b border-outline-variant p-md">
          <span
            className="material-symbols-outlined text-primary"
            aria-hidden="true"
          >
            search
          </span>
          <label id="command-title" className="sr-only" htmlFor="command-query">
            Buscar telas, ações e registros
          </label>
          <input
            ref={input}
            id="command-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você precisa fazer?"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={
              results[active] ? "command-" + active : undefined
            }
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active]);
              }
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca"
            className="icon-button"
          >
            ×
          </button>
        </header>
        <div
          className="command-results"
          id="command-results"
          role="listbox"
          aria-label="Resultados da busca"
        >
          {results.map((item, i) => (
            <button
              type="button"
              role="option"
              aria-selected={i === active}
              id={"command-" + i}
              key={item.href}
              className={"command-option " + (i === active ? "is-active" : "")}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
            >
              <span>
                <span className="block font-medium">{item.label}</span>
                <span className="text-xs text-on-surface-variant">
                  {item.kind}
                </span>
              </span>
              <span className="text-primary" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
          {!loading && !results.length && (
            <div className="p-lg text-on-surface-variant">
              Nenhum resultado para “{query}”. Tente o nome, número ou outra
              palavra.
            </div>
          )}
        </div>
        <footer
          className="px-md py-sm border-t border-outline-variant text-xs text-on-surface-variant flex justify-between"
          aria-live="polite"
        >
          <span>
            {loading
              ? "Buscando nos seus registros…"
              : error || results.length + " resultados"}
          </span>
          <span>↑ ↓ navegar · Enter abrir · Esc sair</span>
        </footer>
      </div>
    </dialog>
  );
}
