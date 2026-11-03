"use client";

import { NormalizedInput } from '../ui/NormalizedInput';
import { useEffect, useState } from "react";
import type { EmailSignatureConfig } from "@peanut/validators";
import { apiRequest } from "../../lib/api";
import Button from "../ui/Button";

const fields: Array<[keyof EmailSignatureConfig, string, string?]> = [
  ["displayName", "Nome na assinatura"],
  ["jobTitle", "Cargo"],
  ["company", "Empresa"],
  ["email", "Email de contato", "email"],
  ["phone", "Telefone"],
  ["whatsapp", "WhatsApp com código do país"],
  ["website", "Site (https://...)", "url"],
  ["address", "Endereço"],
  ["registration", "Identificação da empresa (ex.: CNPJ)"],
];
export default function EmailSignatureSettings() {
  const [config, setConfig] = useState<EmailSignatureConfig | null>(null),
    [baseline, setBaseline] = useState(""),
    [html, setHtml] = useState(""),
    [error, setError] = useState(""),
    [previewError, setPreviewError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    apiRequest<EmailSignatureConfig>("/users/me/email-signature")
      .then((c) => {
        if (active) {
          setConfig(c);
          setBaseline(JSON.stringify(c));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!config) return;
    let active = true;
    const timer = setTimeout(() => {
      apiRequest<{ html: string }>("/users/me/email-signature/preview", {
        method: "POST",
        body: JSON.stringify(config),
      })
        .then((r) => {
          if (active) {
            setHtml(r.html);
            setPreviewError("");
          }
        })
        .catch((e) => {
          if (active) {
            setPreviewError(e.message);
            setHtml("");
          }
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [config]);
  async function save() {
    if (!config) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const c = await apiRequest<EmailSignatureConfig>(
        "/users/me/email-signature",
        { method: "PUT", body: JSON.stringify(config) },
      );
      setConfig(c);
      setBaseline(JSON.stringify(c));
      setNotice("Assinatura de email salva.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const change = (key: keyof EmailSignatureConfig, value: unknown) => {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
    setNotice("");
  };
  return (
    <section id="email-signature-settings" className="brand-panel" aria-labelledby="email-signature-title">
      <h2 id="email-signature-title">Minha assinatura de email</h2>
      <p>
        Usada nos emails que você autorizar. Em cobranças agendadas, a
        assinatura é registrada na conferência e preservada até o envio. A
        imagem de assinatura dos documentos é configurada separadamente.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {config && (
        <>
          <fieldset disabled={busy} className="space-y-md">
            <label className="brand-check">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => change("enabled", e.target.checked)}
              />
              Incluir minha assinatura nos emails
            </label>
            <label className="brand-check">
              <input
                type="checkbox"
                checked={config.showLogo}
                onChange={(e) => change("showLogo", e.target.checked)}
              />
              Exibir o símbolo público da empresa
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {fields.map(([key, label, type]) => (
                <label className="brand-field" key={key}>
                  {label}
                  <NormalizedInput mask={key === "phone" || key === "whatsapp" ? "phone" : key === "address" ? "address" : key === "website" ? "website" : key === "email" ? "email" : "text"}
                    type={type || "text"}
                    value={String(config[key])}
                    maxLength={
                      key === "address" ? 400 : key === "website" ? 255 : key === "email" ? 254 : key === "phone" || key === "whatsapp" ? 40 : key === "registration" ? 80 : 150
                    }
                    onChange={(e) => change(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-md">
            <Button
              onClick={save}
              loading={busy}
              disabled={JSON.stringify(config) === baseline || busy}
            >
              Salvar assinatura de email
            </Button>
            <Button
              variant="outline"
              disabled={JSON.stringify(config) === baseline || busy}
              onClick={() => {
                setConfig(JSON.parse(baseline));
                setError("");
                setNotice("");
              }}
            >
              Descartar alterações da assinatura
            </Button>
          </div>
          <h3>Prévia HTML com dados fictícios</h3>
          {!config.enabled && (
            <p>
              A assinatura está desativada. Ative a opção acima para vê-la na
              prévia.
            </p>
          )}
          {previewError && <p role="alert">{previewError}</p>}
          {html && (
            <iframe
              title="Prévia da minha assinatura de email"
              sandbox=""
              srcDoc={html}
              style={{
                width: "100%",
                height: 600,
                border: "1px solid #c2cdd8",
                background: "#fff",
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
