"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import { quickActions } from "../../lib/navigation";
export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number | null>>({}),
    [loading, setLoading] = useState(true);
  const cards = [
    { name: "Clientes", path: "/dashboard/clients", api: "/clients?limit=1" },
    {
      name: "Equipamentos",
      path: "/dashboard/inventory",
      api: "/assets?limit=1",
    },
    { name: "Chamados", path: "/dashboard/tickets", api: "/tickets?limit=1" },
    {
      name: "Contratos",
      path: "/dashboard/contracts",
      api: "/contracts?limit=1",
    },
  ].filter(
    (c) =>
      c.name !== "Equipamentos" ||
      ["OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY"].includes(user?.role),
  );
  useEffect(() => {
    let current = true;
    Promise.allSettled(cards.map((c) => apiRequest(c.api))).then((results) => {
      if (current) {
        setStats(
          Object.fromEntries(
            results.map((r, i) => [
              cards[i]!.name,
              r.status === "fulfilled"
                ? (r.value?.meta?.total ?? r.value?.data?.length ?? null)
                : null,
            ]),
          ),
        );
        setLoading(false);
      }
    });
    return () => {
      current = false;
    };
  }, [user?.role]);
  return (
    <div className="space-y-lg">
      <header className="overview-welcome">
        <div>
          <span className="eyebrow">Seu espaço de trabalho</span>
          <h1>Olá, {user?.name?.split(" ")[0] || "bem-vindo"}.</h1>
          <p className="text-sm text-on-surface-variant mt-sm">
            O que vamos resolver hoje?
          </p>
        </div>
        <Link href="/dashboard/tickets" className="create-button">
          Ver chamados ↗
        </Link>
      </header>
      <div className="overview-grid">
        {cards.map((c) => (
          <Link key={c.name} href={c.path} className="overview-stat">
            <span>{c.name}</span>
            <strong>{loading ? "…" : (stats[c.name] ?? "—")}</strong>
            <span>
              {!loading && stats[c.name] === null
                ? "Não foi possível carregar"
                : "Abrir " + c.name.toLowerCase() + " ↗"}
            </span>
          </Link>
        ))}
      </div>
      <section className="space-y-md">
        <div className="section-heading">
          <h2>Comece por aqui</h2>
        </div>
        <div className="quick-actions-grid">
          {quickActions
            .filter((a) => !a.roles || a.roles.includes(user?.role))
            .map((a) => (
              <Link className="quick-action" key={a.href} href={a.href}>
                <span>{a.label}</span>
                <span className="text-primary" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-lg text-xs text-on-surface-variant pt-md">
        <Link
          className="text-primary"
          href="/dashboard/configuracoes/preferencias/aparencia"
        >
          Personalizar aparência ↗
        </Link>
        <span>Fixe suas telas favoritas na navegação com ☆</span>
        <span>Ctrl K para encontrar telas e registros</span>
      </div>
    </div>
  );
}
