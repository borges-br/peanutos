"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import logoImg from "../../../images/layout/logo.webp";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { destinations } from "../../lib/navigation";
export default function Sidebar({
  onCloseMobile,
}: {
  onCloseMobile?: () => void;
}) {
  const { user, logout } = useAuth();
  const path = usePathname();
  const [pins, setPins] = useState<string[]>([]);
  const key = "peanut:pins:" + user?.workspaceId + ":" + user?.id;
  useEffect(() => {
    try {
      setPins(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      setPins([]);
    }
  }, [key]);
  function pin(href: string) {
    const next = pins.includes(href)
      ? pins.filter((p) => p !== href)
      : [...pins, href];
    setPins(next);
    localStorage.setItem(key, JSON.stringify(next));
  }
  const entries = destinations.filter(
    (d) => !d.roles || d.roles.includes(user?.role),
  );
  const icons = [
    "space_dashboard",
    "groups",
    "devices",
    "confirmation_number",
    "construction",
    "description",
    "receipt_long",
    "account_balance_wallet",
    "request_quote",
    "mail",
    "folder",
    "picture_as_pdf",
    "settings",
    "palette",
    "webhook",
    "history",
  ];
  function item(d: (typeof destinations)[number]) {
    const active =
      entries
        .filter((e) =>
          e.href === "/dashboard" ? path === e.href : path?.startsWith(e.href),
        )
        .sort((a, b) => b.href.length - a.href.length)[0]?.href === d.href;
    return (
      <div key={d.href} className={"nav-row " + (active ? "active-nav" : "")}>
        <Link
          href={d.href}
          onClick={onCloseMobile}
          aria-current={active ? "page" : undefined}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {icons[destinations.indexOf(d)]}
          </span>
          <span>{d.label}</span>
        </Link>
        <button
          className={"pin-button " + (pins.includes(d.href) ? "is-pinned" : "")}
          onClick={() => pin(d.href)}
          aria-label={
            (pins.includes(d.href) ? "Desafixar " : "Fixar ") + d.label
          }
          aria-pressed={pins.includes(d.href)}
        >
          ☆
        </button>
      </div>
    );
  }
  return (
    <aside className="app-sidebar">
      <Link href="/dashboard" className="brand" onClick={onCloseMobile}>
        <img
          src={logoImg.src}
          alt=""
          width={40}
          height={40}
          className="rounded-xl"
        />
        <span>
          <strong>
            peanut<span className="text-primary">os</span>
          </strong>
          <small>Seu trabalho, conectado.</small>
        </span>
      </Link>
      <nav aria-label="Navegação principal" className="sidebar-navigation">
        {pins.length > 0 && (
          <section>
            <h2>Seus atalhos</h2>
            {entries.filter((d) => pins.includes(d.href)).map(item)}
          </section>
        )}
        {["Dia a dia", "Financeiro", "Documentos", "Preferências"].map(
          (group) => (
            <section key={group}>
              <h2>{group}</h2>
              {entries
                .filter((d) => d.group === group && !pins.includes(d.href))
                .map(item)}
            </section>
          ),
        )}
      </nav>
      <div className="sidebar-account">
        <Link href="/dashboard/configuracoes/perfil" onClick={onCloseMobile}>
          <span className="profile-trigger">
            {(user?.name || "P").slice(0, 2).toUpperCase()}
          </span>
          <span>
            <strong>{user?.name}</strong>
            <small>Minha conta</small>
          </span>
        </Link>
        <button
          onClick={logout}
          className="icon-button"
          aria-label="Sair da conta"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            logout
          </span>
        </button>
      </div>
    </aside>
  );
}
