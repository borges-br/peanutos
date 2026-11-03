"use client";
import React from "react";
import { EMPTY_STATE_MODULES, VisualConfig } from "@peanut/validators";
import { artworkAsset, BrandAsset } from "../../lib/visual-brand";
import AuthenticatedImage from "../ui/AuthenticatedImage";

export default function BrandMediaControls({
  config,
  assets,
  onChange,
}: {
  config: VisualConfig;
  assets: BrandAsset[];
  onChange: (c: VisualConfig) => void;
}) {
  const m = config.media;
  const update = (value: Partial<VisualConfig["media"]>) =>
    onChange({ ...config, media: { ...m, ...value } });
  const picker = (
    label: string,
    value: string | null,
    change: (v: string | null) => void,
  ) => (
    <label className="brand-field">
      {label}
      <select
        aria-label={label}
        value={value || ""}
        onChange={(e) => change(e.target.value || null)}
      >
        <option value="">Nenhuma imagem selecionada</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title}
          </option>
        ))}
      </select>
    </label>
  );
  const labels = {
    clients: "Clientes",
    inventory: "Inventário",
    tickets: "Chamados",
    contracts: "Contratos",
    invoices: "Faturas",
    documents: "Documentos",
  };
  return (
    <section className="brand-panel" aria-labelledby="brand-media-title">
      <h2 id="brand-media-title">Arquivos, favicon e ilustrações</h2>
      <label className="brand-check">
        <input
          type="checkbox"
          checked={m.productIdentity}
          onChange={(e) => update({ productIdentity: e.target.checked })}
        />
        Usar logos e símbolos originais Peanut OS quando não houver imagem
        própria
      </label>
      <p>
        As imagens da sua biblioteca têm prioridade. Desative esta opção para
        usar somente sua marca; sem imagem, será exibida a inicial do nome.
      </p>
      {picker("Favicon da empresa", m.favicon, (v) => update({ favicon: v }))}
      <p>
        Sem favicon próprio, usa o símbolo escolhido. Na marca original, usa o
        favicon Peanut OS. Aceita PNG, WebP, JPEG ou SVG estático da biblioteca.
      </p>
      <label className="brand-field">
        Arte do login
        <select
          aria-label="Arte do login"
          value={m.loginArtwork.mode}
          onChange={(e) =>
            update({
              loginArtwork: {
                ...m.loginArtwork,
                mode: e.target
                  .value as VisualConfig["media"]["loginArtwork"]["mode"],
              },
            })
          }
        >
          <option value="none">Sem ilustração</option>
          <option value="product">Grafismo Circuito do Peanut OS</option>
          <option value="custom">Imagens da empresa</option>
        </select>
      </label>
      {m.loginArtwork.mode === "custom" &&
        (["light", "dark"] as const).map((s) => (
          <React.Fragment key={s}>
            {picker(
              `Arte do login — ${s === "light" ? "tema claro" : "tema escuro"}`,
              m.loginArtwork[s],
              (v) => update({ loginArtwork: { ...m.loginArtwork, [s]: v } }),
            )}
          </React.Fragment>
        ))}
      <label className="brand-field">
        Título do painel de marca no login
        <input
          maxLength={100}
          value={m.heroTitle}
          onChange={(e) => update({ heroTitle: e.target.value })}
        />
      </label>
      <label className="brand-field">
        Mensagem do painel de marca no login
        <textarea
          maxLength={200}
          value={m.heroMessage}
          onChange={(e) => update({ heroMessage: e.target.value })}
        />
      </label>
      <label className="brand-field">
        Ilustrações de primeiro uso
        <select
          aria-label="Ilustrações de primeiro uso"
          value={m.emptyStates.mode}
          onChange={(e) =>
            update({
              emptyStates: {
                ...m.emptyStates,
                mode: e.target
                  .value as VisualConfig["media"]["emptyStates"]["mode"],
              },
            })
          }
        >
          <option value="none">Sem ilustrações</option>
          <option value="product">Família Circuito do Peanut OS</option>
          <option value="custom">Imagens por módulo</option>
        </select>
      </label>
      {m.emptyStates.mode === "custom" &&
        EMPTY_STATE_MODULES.map((key) => (
          <fieldset className="brand-control-fieldset" key={key}>
            <legend>{labels[key]}</legend>
            {(["light", "dark"] as const).map((s) => (
              <React.Fragment key={s}>
                {picker(
                  `${labels[key]} — ${s === "light" ? "claro" : "escuro"}`,
                  m.emptyStates.images[key][s],
                  (v) =>
                    update({
                      emptyStates: {
                        ...m.emptyStates,
                        images: {
                          ...m.emptyStates.images,
                          [key]: { ...m.emptyStates.images[key], [s]: v },
                        },
                      },
                    }),
                )}
              </React.Fragment>
            ))}
          </fieldset>
        ))}
      <p>
        As artes aparecem no primeiro uso, nunca em falhas ou buscas sem
        resultado. Imagens próprias ficam na biblioteca da empresa. SVGs
        animados e vídeos não são aceitos neste controle.
      </p>
      {m.emptyStates.mode !== "none" && (
        <details>
          <summary>Prévia das ilustrações de primeiro uso</summary>
          <div className="brand-media-samples">
            {EMPTY_STATE_MODULES.map((key) => (
              <figure key={key}>
                <figcaption>{labels[key]}</figcaption>
                {(["light", "dark"] as const).map((s) => (
                  <div key={s} style={{ background: config[s].surface }}>
                    <AuthenticatedImage
                      src={artworkAsset(config, assets, s, key)}
                      alt={`${labels[key]} — ${s === "light" ? "claro" : "escuro"}`}
                      style={{ width: 120, height: 80, objectFit: "contain" }}
                    />
                  </div>
                ))}
              </figure>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
