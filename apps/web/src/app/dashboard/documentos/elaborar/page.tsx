"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AuthoredDocumentInput,
  authoredDocumentSchema,
} from "@peanut/validators";
import { apiRequest, apiBlobRequest } from "../../../../lib/api";
import { useAuth } from "../../../../context/AuthContext";
import Button from "../../../../components/ui/Button";
import HtmlDocumentPreview from "../../../../components/ui/HtmlDocumentPreview";

const sectionNames = {
  REPORT: [
    "Contexto",
    "Diagnóstico",
    "Recomendação",
    "Validação e limites",
    "Próximos passos",
  ],
  PROPOSAL: [
    "Objetivo",
    "Escopo e entregas",
    "Limites e dependências",
    "Condições comerciais",
    "Próximos passos",
  ],
};
const empty = (kind: "REPORT" | "PROPOSAL"): AuthoredDocumentInput => ({
  kind,
  title:
    kind === "REPORT" ? "Relatório técnico" : "Proposta técnica e comercial",
  clientId: "",
  quoteId: null,
  project: "",
  sections: sectionNames[kind].map((title) => ({ title, body: "" })),
});
export default function DocumentEditor() {
  const { user } = useAuth(),
    [input, setInput] = useState<AuthoredDocumentInput>(empty("REPORT")),
    [id, setId] = useState(""),
    [revision, setRevision] = useState(0),
    [status, setStatus] = useState("DRAFT");
  const [clients, setClients] = useState<any[]>([]),
    [quotes, setQuotes] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [html, setHtml] = useState(""),
    [dirty, setDirty] = useState(false),
    [previewBusy, setPreviewBusy] = useState(false),
    [confirmFinal, setConfirmFinal] = useState(false);
  const canEdit = ["OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN"].includes(
      user?.role,
    ),
    finance = ["OWNER", "ADMIN", "FINANCIAL"].includes(user?.role),
    locked = status === "FINAL";
  useEffect(() => {
    if (!user) return;
    let active = true;
    const params = new URLSearchParams(location.search),
      documentId = params.get("id"),
      kind = params.get("kind") === "PROPOSAL" ? "PROPOSAL" : "REPORT";
    const readClients = apiRequest("/clients?limit=100").then((r) => {
      if (active) setClients(r.data || []);
    });
    const readQuotes = finance
      ? apiRequest("/quotes?limit=100").then((r) => {
          if (active) setQuotes(r.data || []);
        })
      : Promise.resolve();
    const readDocument = documentId
      ? apiRequest(`/authored-documents/${documentId}`).then((r) => {
          if (active) {
            setInput({
              kind: r.kind,
              title: r.title,
              clientId: r.clientId,
              quoteId: r.quoteId,
              project: r.project,
              sections: r.sections,
            });
            setId(r.id);
            setRevision(r.revision);
            setStatus(r.status);
          }
        })
      : Promise.resolve().then(async () => {
          const next = empty(kind),
            quoteId = params.get("quoteId");
          if (quoteId && finance) {
            const q = await apiRequest(`/quotes/${quoteId}`);
            next.clientId = q.clientId || "";
            next.quoteId = q.clientId ? q.id : null;
          }
          if (active) setInput(next);
        });
    Promise.all([readClients, readQuotes, readDocument])
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user?.id, finance]);
  useEffect(() => {
    if (!ready) return;
    if (!locked && !authoredDocumentSchema.safeParse(input).success) {
      setHtml("");
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      setPreviewBusy(true);
      try {
        const blob = await apiBlobRequest(
          locked
            ? `/authored-documents/${id}/preview`
            : "/authored-documents/preview",
          locked
            ? { signal: controller.signal }
            : {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
                signal: controller.signal,
              },
        );
        const text = await blob.text();
        if (active) {
          setHtml(text);
          setError("");
        }
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setPreviewBusy(false);
      }
    }, 600);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [ready, input, locked, id]);
  function change(next: AuthoredDocumentInput) {
    setInput(next);
    setDirty(true);
    setMessage("");
    setConfirmFinal(false);
  }
  async function save() {
    const checked = authoredDocumentSchema.safeParse(input);
    if (!checked.success) {
      setError("Informe um título, um cliente e os títulos das seções.");
      return null;
    }
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest(
        id ? `/authored-documents/${id}` : "/authored-documents",
        {
          method: id ? "PUT" : "POST",
          body: JSON.stringify({
            ...checked.data,
            ...(id ? { revision } : {}),
          }),
        },
      );
      setId(r.id);
      setRevision(r.revision);
      setDirty(false);
      setMessage("Rascunho salvo.");
      history.replaceState(null, "", `?id=${r.id}`);
      return r;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function finalize() {
    setConfirmFinal(false);
    const saved = dirty || !id ? await save() : { id, revision };
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest(
        `/authored-documents/${saved.id}/finalize`,
        { method: "POST", body: JSON.stringify({ revision: saved.revision }) },
      );
      setStatus(result.status);
      setRevision(result.revision);
      setMessage(
        "Documento finalizado. Conteúdo e identidade foram preservados nesta versão.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="brand-studio">
      <header className="brand-studio-header">
        <div>
          <span className="eyebrow">
            Documentos /{" "}
            {input.kind === "REPORT"
              ? "Relatório técnico"
              : "Proposta comercial"}
          </span>
          <h1>{locked ? "Documento finalizado" : "Elaborar documento"}</h1>
          <p>
            {locked
              ? "Esta versão preserva o conteúdo, os valores vinculados e a identidade da emissão."
              : "Conteúdo estruturado, com prévia da identidade da empresa."}
          </p>
        </div>
        <div className="brand-studio-actions">
          <Link
            href="/dashboard/documentos/relatorios"
            className="text-sm text-primary"
          >
            Voltar à biblioteca
          </Link>
          {!locked && canEdit && (
            <>
              <Button
                variant="outline"
                disabled={busy || !ready}
                onClick={save}
                loading={busy}
              >
                Salvar rascunho
              </Button>
              <Button
                disabled={busy || !ready || !input.clientId}
                onClick={() => setConfirmFinal(true)}
              >
                Finalizar documento
              </Button>
            </>
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className="brand-notice brand-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="brand-notice">
          {message}
        </p>
      )}
      {confirmFinal && (
        <div className="brand-panel">
          <h2>Finalizar esta versão?</h2>
          <p>
            O conteúdo e a identidade serão preservados. Esta versão ficará
            disponível para consulta e impressão, sem edição.
          </p>
          <div className="brand-studio-actions">
            <Button disabled={busy} onClick={finalize}>
              Confirmar finalização
            </Button>
            <Button variant="outline" onClick={() => setConfirmFinal(false)}>
              Continuar editando
            </Button>
          </div>
        </div>
      )}
      {!ready ? (
        <p role="status">Carregando documento…</p>
      ) : (
        <div className="authored-layout">
          <div className="authored-sections">
            <fieldset disabled={locked || !canEdit} className="brand-panel">
              <h2>Dados do documento</h2>
              {!id && finance && (
                <label className="brand-field">
                  Tipo
                  <select
                    value={input.kind}
                    onChange={(e) => change(empty(e.target.value as any))}
                  >
                    <option value="REPORT">Relatório técnico</option>
                    <option value="PROPOSAL">
                      Proposta técnica e comercial
                    </option>
                  </select>
                </label>
              )}
              <label className="brand-field">
                Título
                <input
                  value={input.title}
                  maxLength={180}
                  onChange={(e) => change({ ...input, title: e.target.value })}
                />
              </label>
              <label className="brand-field">
                Cliente
                <select
                  aria-label="Cliente"
                  value={input.clientId}
                  onChange={(e) =>
                    change({
                      ...input,
                      clientId: e.target.value,
                      quoteId: null,
                    })
                  }
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.legalName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="brand-field">
                Projeto
                <input
                  value={input.project}
                  maxLength={180}
                  placeholder="Nome ou referência do projeto"
                  onChange={(e) =>
                    change({ ...input, project: e.target.value })
                  }
                />
              </label>
              {input.kind === "PROPOSAL" && (
                <label className="brand-field">
                  Orçamento vinculado
                  <select
                    aria-label="Orçamento vinculado"
                    value={input.quoteId || ""}
                    onChange={(e) =>
                      change({ ...input, quoteId: e.target.value || null })
                    }
                  >
                    <option value="">Sem orçamento vinculado</option>
                    {quotes
                      .filter((q) => q.clientId === input.clientId)
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.number}
                        </option>
                      ))}
                  </select>
                  <span className="brand-hint">
                    Os itens e o total serão apresentados a partir do orçamento.
                  </span>
                </label>
              )}
            </fieldset>
            <fieldset disabled={locked || !canEdit} className="brand-panel">
              <h2>Conteúdo</h2>
              {input.sections.map((section, index) => (
                <label className="brand-field" key={index}>
                  {section.title}
                  <textarea
                    aria-label={section.title}
                    rows={5}
                    value={section.body}
                    maxLength={12000}
                    onChange={(e) =>
                      change({
                        ...input,
                        sections: input.sections.map((s, i) =>
                          i === index ? { ...s, body: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
              ))}
            </fieldset>
          </div>
          <div className="brand-studio-preview">
            <div className="brand-preview-chrome">
              <h2>{locked ? "Versão preservada" : "Prévia do documento"}</h2>
              <span role="status" className="brand-hint">
                {previewBusy
                  ? "Atualizando…"
                  : dirty
                    ? "Alterações não salvas"
                    : locked
                      ? "Finalizado"
                      : "Rascunho"}
              </span>
            </div>
            {html ? (
              <HtmlDocumentPreview
                html={html}
                title="Prévia do documento em elaboração"
                printable
              />
            ) : (
              <div className="brand-panel">
                <p>Selecione o cliente para visualizar o documento.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
