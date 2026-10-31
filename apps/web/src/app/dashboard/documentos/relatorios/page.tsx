"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../../../lib/api";
import { useAuth } from "../../../../context/AuthContext";
export default function AuthoredDocuments() {
  const { user } = useAuth(),
    [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    apiRequest("/authored-documents")
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const finance = ["OWNER", "ADMIN", "FINANCIAL"].includes(user?.role),
    edit = ["OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN"].includes(user?.role);
  return (
    <div className="brand-studio">
      <header className="brand-studio-header">
        <div>
          <span className="eyebrow">Documentos</span>
          <h1>Relatórios e propostas</h1>
          <p>Elabore, revise e preserve os documentos da sua operação.</p>
        </div>
        {edit && (
          <div className="brand-studio-actions">
            <Link
              href="/dashboard/documentos/elaborar?kind=REPORT"
              className="create-button"
            >
              Novo relatório
            </Link>
            {finance && (
              <Link
                href="/dashboard/documentos/elaborar?kind=PROPOSAL"
                className="create-button"
              >
                Nova proposta
              </Link>
            )}
          </div>
        )}
      </header>
      <div className="brand-studio-actions">
        <Link href="/dashboard/documentos" className="text-primary text-sm">
          Arquivos e PDFs emitidos →
        </Link>
        {["OWNER", "ADMIN"].includes(user?.role) && (
          <Link
            href="/dashboard/configuracoes/marca"
            className="text-primary text-sm"
          >
            Identidade dos documentos →
          </Link>
        )}
      </div>
      {error && (
        <p role="alert" className="brand-notice brand-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando documentos…</p>
      ) : rows.length ? (
        <div className="authored-list">
          {rows.map((r) => (
            <article className="brand-panel authored-card" key={r.id}>
              <div>
                <span className="eyebrow">
                  {r.kind === "REPORT"
                    ? "Relatório técnico"
                    : "Proposta comercial"}
                </span>
                <h2>{r.title}</h2>
                <p>
                  {r.project || "Sem projeto informado"} ·{" "}
                  {r.status === "FINAL" ? "Finalizado" : "Rascunho"} · Revisão{" "}
                  {r.revision}
                </p>
              </div>
              <Link
                className="text-primary text-sm"
                href={`/dashboard/documentos/elaborar?id=${r.id}`}
              >
                {r.status === "FINAL"
                  ? "Consultar documento"
                  : "Continuar editando"}{" "}
                →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="brand-panel">
          <h2>Seu primeiro documento começa aqui</h2>
          <p>
            Crie um relatório de diagnóstico ou uma proposta com objetivo,
            escopo e próximos passos.
          </p>
        </div>
      )}
    </div>
  );
}
