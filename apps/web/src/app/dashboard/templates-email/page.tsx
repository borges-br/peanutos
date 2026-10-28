"use client";
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { DEFAULT_BILLING_EMAIL } from "@peanut/utils/dist/billing-email";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import RestrictedState from "../../../components/ui/RestrictedState";
import EmailComposer from "../../../components/contracts/EmailComposer";
const blank = () => ({ ...DEFAULT_BILLING_EMAIL, name: "", isDefault: false });
export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const allowed = !!user && ["OWNER", "ADMIN", "FINANCIAL"].includes(user.role);
  const [templates, setTemplates] = useState<any[]>([]),
    [selected, setSelected] = useState(""),
    [form, setForm] = useState<any>(blank),
    [baseline, setBaseline] = useState(() => JSON.stringify(blank())),
    [preview, setPreview] = useState<any>(null),
    [error, setError] = useState(""),
    [previewError, setPreviewError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [loading, setLoading] = useState(true);
  const dirty = JSON.stringify(form) !== baseline;
  const load = () =>
    apiRequest("/financials/email-templates").then((data) =>
      setTemplates(data.data),
    );
  useEffect(() => {
    if (allowed)
      load()
        .catch(() =>
          setError(
            "Não foi possível carregar os modelos. Recarregue a página para tentar novamente.",
          ),
        )
        .finally(() => setLoading(false));
  }, [allowed]);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const leave = (event: MouseEvent) => {
      const link = (event.target as HTMLElement)?.closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        link &&
        link.href !== window.location.href &&
        !link.hash &&
        !confirm("Sair sem salvar as alterações do modelo?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", leave, true);
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    const timer = setTimeout(() => {
      apiRequest("/financials/email-templates/preview", {
        method: "POST",
        body: JSON.stringify({ subject: form.subject, body: form.body }),
      })
        .then((data) => {
          if (current) {
            setPreview(data);
            setPreviewError("");
          }
        })
        .catch((cause) => {
          if (current) {
            setPreview(null);
            setPreviewError(cause.message);
          }
        });
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [form.subject, form.body, allowed]);
  function change(key: string, value: any) {
    setForm((old: any) => ({ ...old, [key]: value }));
    setNotice("");
  }
  function select(id: string) {
    if (dirty && !confirm("Descartar as alterações ainda não salvas?")) return;
    const next = id ? { ...templates.find((t) => t.id === id) } : blank();
    setSelected(id);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setNotice("");
    setError("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const row = await apiRequest(
        "/financials/email-templates" + (selected ? "/" + selected : ""),
        { method: selected ? "PATCH" : "POST", body: JSON.stringify(form) },
      );
      await load();
      setSelected(row.id);
      setForm(row);
      setBaseline(JSON.stringify(row));
      setNotice("Modelo salvo.");
    } catch (cause: any) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  if (!user) return <div className="loading-panel">Carregando…</div>;
  if (!allowed)
    return (
      <RestrictedState
        title="Acesso restrito"
        description="Modelos de cobrança estão disponíveis aos perfis financeiros."
      />
    );
  return (
    <div className="email-studio space-y-lg">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Comunicação com seus clientes</span>
          <h1>Modelos de email</h1>
        </div>
        <Button variant="outline" onClick={() => select("")}>
          ＋ Novo modelo
        </Button>
      </header>
      {error && (
        <div role="alert" className="notice-error">
          {error}
        </div>
      )}
      <div className="email-workspace">
        <aside className="email-models">
          <h2>
            Seus modelos <span className="count-badge">{templates.length}</span>
          </h2>
          {loading ? (
            <p role="status">Carregando…</p>
          ) : !templates.length ? (
            <p className="text-xs text-on-surface-variant">
              Crie seu primeiro modelo.
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                className={selected === t.id ? "selected" : ""}
                aria-pressed={selected === t.id}
                onClick={() => select(t.id)}
              >
                <span>{t.name}</span>
                {t.isDefault && <small>Padrão</small>}
              </button>
            ))
          )}
          <div className="email-model-hint">
            <span
              className="material-symbols-outlined text-primary"
              aria-hidden="true"
            >
              attach_file
            </span>
            <span>O PDF da fatura acompanha a mensagem.</span>
          </div>
        </aside>
        <form onSubmit={save} className="email-form">
          <div className="email-editor-heading">
            <h2>{selected ? "Editar modelo" : "Novo modelo"}</h2>
            <span
              role="status"
              className={dirty ? "text-tertiary" : "text-primary"}
            >
              {busy
                ? "Salvando…"
                : notice ||
                  (dirty
                    ? "Alterações não salvas"
                    : selected
                      ? "Salvo"
                      : "Rascunho")}
            </span>
          </div>
          <div className="email-compose-grid">
            <section className="space-y-md min-w-0">
              <Input
                label="Nome do modelo"
                placeholder="Ex.: Cobrança mensal"
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
                maxLength={100}
                required
              />
              <Input
                label="Assunto"
                value={form.subject}
                onChange={(e) => change("subject", e.target.value)}
                maxLength={200}
                required
              />
              <EmailComposer
                value={form.body}
                onChange={(value) => change("body", value)}
              />
              <label className="flex gap-sm items-start text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => change("isDefault", e.target.checked)}
                />
                Usar como modelo padrão
              </label>
            </section>
            <section className="email-preview">
              <div className="email-preview-heading">
                <h2>Prévia</h2>
                <div className="segmented-control">
                  <button
                    type="button"
                    aria-pressed={!mobile}
                    onClick={() => setMobile(false)}
                  >
                    Computador
                  </button>
                  <button
                    type="button"
                    aria-pressed={mobile}
                    onClick={() => setMobile(true)}
                  >
                    Celular
                  </button>
                </div>
              </div>
              <span className="text-xs text-on-surface-variant">
                Exemplo com dados fictícios
              </span>
              <div className="email-envelope">
                <div>
                  <span>Para</span>
                  <strong>Financeiro · Cliente de exemplo</strong>
                </div>
                <div>
                  <span>Assunto</span>
                  <strong>{preview?.subject || "…"}</strong>
                </div>
                <div>
                  <span>Anexo</span>
                  <span className="attachment-chip">Fatura.pdf</span>
                </div>
              </div>
              {previewError ? (
                <p role="alert" className="notice-error">
                  {previewError}
                </p>
              ) : preview ? (
                <iframe
                  title="Prévia do template de email"
                  sandbox=""
                  srcDoc={preview.html}
                  style={{ width: mobile ? 320 : "100%" }}
                />
              ) : (
                <div role="status" className="loading-panel">
                  Atualizando prévia…
                </div>
              )}
            </section>
          </div>
          <footer className="email-save-bar">
            <span className="text-xs text-on-surface-variant">
              {selected
                ? "Disponível para os contratos que usam este modelo."
                : "Salve para usar nos seus contratos."}
            </span>
            <div className="flex gap-sm">
              <Button
                type="button"
                variant="ghost"
                disabled={!dirty || busy}
                onClick={() => {
                  if (confirm("Descartar as alterações?")) {
                    setForm(JSON.parse(baseline));
                    setNotice("Alterações descartadas.");
                  }
                }}
              >
                Descartar
              </Button>
              <Button
                type="submit"
                disabled={
                  busy || !preview || !dirty || form.body.length > 10000
                }
                loading={busy}
              >
                Salvar modelo
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
