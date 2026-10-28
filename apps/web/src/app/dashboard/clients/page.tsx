"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../../lib/api";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/DataTable";
import { useAuth } from "../../../context/AuthContext";
export default function ClientsPage() {
  const { user } = useAuth();
  const [visibleColumns, setVisibleColumns] = useState([
    "Contato",
    "Contratos",
    "Situação",
  ]);
  const columnKey = `peanut:client-columns:${user?.workspaceId}:${user?.id}`;
  useEffect(() => {
    try {
      setVisibleColumns(
        JSON.parse(
          localStorage.getItem(columnKey) ||
            '["Contato","Contratos","Situação"]',
        ),
      );
    } catch {
      setVisibleColumns(["Contato", "Contratos", "Situação"]);
    }
  }, [columnKey]);
  function toggleColumn(name: string) {
    const next = visibleColumns.includes(name)
      ? visibleColumns.filter((c) => c !== name)
      : [...visibleColumns, name];
    setVisibleColumns(next);
    localStorage.setItem(columnKey, JSON.stringify(next));
  }
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [pages, setPages] = useState({ active: 1, other: 1 }),
    [groups, setGroups] = useState<any>({ active: null, other: null }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPages({ active: 1, other: 1 });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    Promise.all(
      ["active", "other"].map(
        async (group) =>
          [
            group,
            await apiRequest(
              "/clients?contractGroup=" +
                group +
                "&page=" +
                pages[group as "active" | "other"] +
                "&limit=10&search=" +
                encodeURIComponent(search) +
                "&status=" +
                status,
            ),
          ] as const,
      ),
    )
      .then((entries) => {
        if (current) setGroups(Object.fromEntries(entries));
      })
      .catch(() => {
        if (current) setError("Não foi possível carregar os clientes.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [search, status, pages.active, pages.other, retry]);
  const columns = [
    {
      header: "Cliente",
      render: (c: any) => (
        <div className="flex items-center gap-md">
          <span className="client-monogram">
            {(c.tradeName || c.legalName).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong className="block">{c.tradeName || c.legalName}</strong>
            <span className="text-xs text-on-surface-variant">
              {c.legalName}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Contato",
      render: (c: any) => (
        <div>
          <span className="block">{c.email || "Sem email"}</span>
          <span className="text-xs text-on-surface-variant">
            {c.phone || "Sem telefone"}
          </span>
        </div>
      ),
    },
    {
      header: "Contratos",
      render: (c: any) => (
        <span>
          {c.contracts?.length
            ? c.contracts.length + " ativo(s)"
            : "Sem contrato ativo"}
        </span>
      ),
    },
    {
      header: "",
      render: (c: any) => (
        <Link
          className="text-primary font-medium"
          href={"/dashboard/clients/" + c.id}
        >
          Abrir cadastro ↗
        </Link>
      ),
    },
    {
      header: "Documento",
      render: (c: any) => (
        <span className="font-mono text-xs">{c.document || "—"}</span>
      ),
    },
    {
      header: "Situação",
      render: (c: any) => (
        <span>
          {(
            {
              ACTIVE: "Ativo",
              INACTIVE: "Inativo",
              PROSPECT: "Em negociação",
            } as Record<string, string>
          )[c.status] || "—"}
        </span>
      ),
    },
    {
      header: "Equipamentos",
      render: (c: any) => <span>{c._count?.assets ?? 0}</span>,
    },
  ];
  return (
    <div className="space-y-lg">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Relacionamentos</span>
          <h1>Clientes</h1>
        </div>
        {["OWNER", "ADMIN", "TECHNICIAN"].includes(user?.role) && (
          <Link className="create-button" href="/dashboard/clients/new">
            ＋ Cadastrar cliente
          </Link>
        )}
      </header>
      <div className="filter-bar">
        <details className="column-picker">
          <summary>Colunas</summary>
          <div>
            {[
              "Contato",
              "Contratos",
              "Documento",
              "Situação",
              "Equipamentos",
            ].map((name) => (
              <label key={name}>
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(name)}
                  onChange={() => toggleColumn(name)}
                />
                {name}
              </label>
            ))}
          </div>
        </details>
        <Input
          aria-label="Buscar clientes"
          placeholder="Nome, documento ou email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Situação do cliente"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPages({ active: 1, other: 1 });
          }}
        >
          <option value="">Todas as situações</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
          <option value="PROSPECT">Em negociação</option>
        </select>
        {(query || status) && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setStatus("");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>
      {error ? (
        <div role="alert" className="notice-error">
          {error}{" "}
          <Button onClick={() => setRetry((v) => v + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        ["active", "other"].map((group) => (
          <section key={group} className="space-y-md" aria-busy={loading}>
            <div className="section-heading">
              <h2>
                {group === "active" ? "Com contrato ativo" : "Demais clientes"}
              </h2>
              <span className="count-badge">
                {groups[group]?.meta?.total ?? "…"}
              </span>
            </div>
            {loading ? (
              <div role="status" className="loading-panel">
                Carregando clientes…
              </div>
            ) : !groups[group]?.data?.length ? (
              <div className="empty-panel">
                {search
                  ? "Nenhum cliente encontrado."
                  : group === "active"
                    ? "Nenhum contrato ativo neste momento."
                    : "Nenhum outro cliente cadastrado."}
              </div>
            ) : (
              <>
                <DataTable
                  columns={columns.filter(
                    (c) =>
                      !c.header ||
                      c.header === "Cliente" ||
                      visibleColumns.includes(c.header),
                  )}
                  data={groups[group].data}
                  rowKey={(c: any) => c.id}
                  mobileRender={(c: any) => (
                    <div className="space-y-md">
                      <strong>{c.tradeName || c.legalName}</strong>
                      <p>{c.email || "Sem email"}</p>
                      <Link
                        className="text-primary"
                        href={"/dashboard/clients/" + c.id}
                      >
                        Abrir cadastro ↗
                      </Link>
                    </div>
                  )}
                />
                <div className="pagination">
                  <span>
                    Página {pages[group as "active" | "other"]} de{" "}
                    {groups[group].meta.totalPages || 1}
                  </span>
                  <div className="flex gap-sm">
                    <Button
                      variant="outline"
                      disabled={pages[group as "active" | "other"] <= 1}
                      onClick={() =>
                        setPages((p) => ({
                          ...p,
                          [group]: p[group as "active" | "other"] - 1,
                        }))
                      }
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        pages[group as "active" | "other"] >=
                        groups[group].meta.totalPages
                      }
                      onClick={() =>
                        setPages((p) => ({
                          ...p,
                          [group]: p[group as "active" | "other"] + 1,
                        }))
                      }
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        ))
      )}
    </div>
  );
}
