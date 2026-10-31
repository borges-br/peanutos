"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TEMPLATE_BLOCKS } from "@peanut/validators";
import { apiRequest, apiBlobRequest } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../../components/ui/Button";
import HtmlDocumentPreview from "../../../components/ui/HtmlDocumentPreview";

const types = [
  ["INVOICE", "Fatura"],
  ["QUOTE", "Orçamento"],
  ["SERVICE_ORDER", "Ordem de serviço"],
  ["REPORT", "Relatório operacional"],
] as const;
const labels: Record<string, string> = {
  header: "Cabeçalho",
  logo: "Logo da empresa",
  companyInfo: "Dados da empresa",
  clientInfo: "Dados do cliente",
  documentTitle: "Título do documento",
  itemsTable: "Tabela de itens",
  financialSummary: "Resumo financeiro",
  paymentInfo: "Dados de pagamento",
  terms: "Termos e condições",
  observations: "Observações",
  responsibleSignature: "Assinatura do responsável",
  clientSignature: "Assinatura do cliente",
  qrCode: "QR Code",
  footer: "Rodapé",
};
type Setting = {
  enabledBlocks: Record<string, boolean>;
  blockOrder: string[];
  settings?: any;
};
export default function DocumentTemplates() {
  const { user } = useAuth(),
    editable = ["OWNER", "ADMIN"].includes(user?.role);
  const [type, setType] = useState("INVOICE"),
    [data, setData] = useState<Setting | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [html, setHtml] = useState(""),
    [previewBusy, setPreviewBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setHtml("");
    setMessage("");
    apiRequest(`/document-templates/${type}`)
      .then((r) => {
        if (active) {
          const order = [
            ...r.blockOrder,
            ...TEMPLATE_BLOCKS.filter((b) => !r.blockOrder.includes(b)),
          ];
          setData({
            enabledBlocks: r.enabledBlocks,
            blockOrder: order,
            settings: r.settings,
          });
        }
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
  }, [type]);
  useEffect(() => {
    if (!data || loading) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewBusy(true);
      try {
        const blob = await apiBlobRequest(
          `/document-templates/${type}/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: controller.signal,
          },
        );
        const text = await blob.text();
        if (active) setHtml(text);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setPreviewBusy(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [data, type, loading]);
  function toggle(block: string) {
    if (data)
      setData({
        ...data,
        enabledBlocks: {
          ...data.enabledBlocks,
          [block]: !data.enabledBlocks[block],
        },
      });
    setMessage("");
  }
  function move(block: string, direction: number) {
    if (!data) return;
    const order = [...data.blockOrder],
      index = order.indexOf(block),
      target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target]!, order[index]!];
    setData({ ...data, blockOrder: order });
    setMessage("");
  }
  async function save(reset = false) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest(
        `/document-templates/${type}${reset ? "/reset" : ""}`,
        {
          method: reset ? "POST" : "PATCH",
          ...(reset ? {} : { body: JSON.stringify(data) }),
        },
      );
      if (reset)
        setData({
          enabledBlocks: r.enabledBlocks,
          blockOrder: [
            ...r.blockOrder,
            ...TEMPLATE_BLOCKS.filter((b) => !r.blockOrder.includes(b)),
          ],
        });
      setMessage(reset ? "Modelo restaurado." : "Modelo salvo.");
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
          <span className="eyebrow">Documentos / Modelos de PDF</span>
          <h1>Modelos de documentos</h1>
          <p>
            Configure os blocos e confira a prévia com a identidade da empresa.
          </p>
        </div>
        <Link
          className="text-primary text-sm"
          href="/dashboard/configuracoes/marca"
        >
          Ajustar marca e aparência →
        </Link>
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
      <label className="brand-field max-w-md">
        Tipo de documento
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {types.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="authored-layout">
        <section className="brand-panel">
          <h2>Blocos do documento</h2>
          {loading || !data ? (
            <p role="status">Carregando modelo…</p>
          ) : (
            <>
              <fieldset disabled={!editable || busy} className="space-y-2">
                {data.blockOrder.map((block, index) => (
                  <div
                    className="flex gap-2 items-center justify-between"
                    key={block}
                  >
                    <label className="flex gap-2 items-center text-sm min-w-0">
                      <input
                        type="checkbox"
                        checked={!!data.enabledBlocks[block]}
                        onChange={() => toggle(block)}
                      />
                      {labels[block] || block}
                    </label>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        aria-label={`Subir ${labels[block]}`}
                        disabled={index === 0}
                        onClick={() => move(block, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Descer ${labels[block]}`}
                        disabled={index === data.blockOrder.length - 1}
                        onClick={() => move(block, 1)}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                ))}
              </fieldset>
              {editable && (
                <div className="brand-studio-actions">
                  <Button loading={busy} onClick={() => save()}>
                    Salvar modelo
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => save(true)}
                  >
                    Restaurar padrão
                  </Button>
                </div>
              )}
            </>
          )}
          <p>
            Os exemplos usam dados fictícios. A prévia é gerada pelo mesmo
            renderizador dos PDFs.
          </p>
          <Link
            href="/dashboard/documentos/relatorios"
            className="text-primary text-sm"
          >
            Elaborar relatórios técnicos e propostas →
          </Link>
        </section>
        <section className="brand-studio-preview">
          <span role="status" className="brand-hint">
            {previewBusy
              ? "Atualizando prévia…"
              : "Prévia com a identidade aplicada à empresa"}
          </span>
          {html && (
            <HtmlDocumentPreview
              html={html}
              title="Prévia do modelo de documento"
              printable
            />
          )}
        </section>
      </div>
    </div>
  );
}
