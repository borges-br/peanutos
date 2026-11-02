"use client";
import React, { useState } from "react";
import type { VisualConfig } from "@peanut/validators";
import type { BrandAsset } from "../../lib/visual-brand";
import { Range, Choice } from "./BrandFields";
import Button from "../ui/Button";

export type PublicBrandImage = {
  id: string;
  sourceAssetId: string;
  variant: string;
  url: string;
  width: number;
  height: number;
};
type Props = { config: VisualConfig; onChange: (config: VisualConfig) => void };
export function BrandLoginControls({
  config,
  onChange,
  available,
}: Props & { available: boolean }) {
  const change = (key: keyof VisualConfig["login"], value: unknown) =>
    onChange({ ...config, login: { ...config.login, [key]: value } });
  return (
    <section className="brand-panel">
      <h2>Página de acesso</h2>
      <label className="brand-check">
        <input
          type="checkbox"
          checked={config.login.enabled}
          onChange={(e) => change("enabled", e.target.checked)}
        />
        Exibir a identidade da empresa no login
      </label>
      <p>
        Usa as assinaturas, os símbolos, as cores e as fontes desta marca. No
        celular, a imagem sempre usa o símbolo compacto.
      </p>
      {!available && (
        <p role="status">
          A página de acesso é compartilhada por várias empresas. O
          administrador da instalação precisa definir qual marca será exibida.
        </p>
      )}
      <Choice
        label="Composição do login"
        value={config.login.layout}
        choices={[
          ["centered", "Cartão central"],
          ["split", "Marca ao lado do acesso"],
        ]}
        onChange={(v) => change("layout", v)}
      />
      <Range
        label="Largura da logo no login"
        value={config.login.logoWidth}
        min={120}
        max={320}
        onChange={(v) => change("logoWidth", v)}
      />
      <Range
        label="Altura máxima da logo no login"
        value={config.login.logoHeight}
        min={32}
        max={120}
        onChange={(v) => change("logoHeight", v)}
      />
      <label className="brand-field">
        Título do acesso
        <input
          value={config.login.title}
          maxLength={100}
          placeholder="Acessar painel"
          onChange={(e) => change("title", e.target.value)}
        />
      </label>
      <label className="brand-field">
        Mensagem do acesso
        <textarea
          rows={3}
          value={config.login.message}
          maxLength={200}
          placeholder="Entre com suas credenciais para continuar."
          onChange={(e) => change("message", e.target.value)}
        />
      </label>
      <label className="brand-check">
        <input
          type="checkbox"
          checked={config.login.showSubtitle}
          onChange={(e) => change("showSubtitle", e.target.checked)}
        />
        Exibir descrição curta ao lado da marca
      </label>
    </section>
  );
}
export function BrandEmailControls({
  config,
  onChange,
  assets,
  publicAssets,
  onAddImage,
}: Props & {
  assets: BrandAsset[];
  publicAssets: PublicBrandImage[];
  onAddImage: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const change = (key: keyof VisualConfig["email"], value: unknown) =>
    onChange({ ...config, email: { ...config.email, [key]: value } });
  const logoId = config.email.logoAssetId || config.assets.logoLight;
  const publicLogo = publicAssets.find(
    (a) =>
      a.sourceAssetId === logoId &&
      a.variant === `email-${config.light.surface.toLowerCase()}`,
  );
  return (
    <>
      <section className="brand-panel">
        <h2>Identidade nos emails</h2>
        <label className="brand-check">
          <input
            type="checkbox"
            checked={config.email.enabled}
            onChange={(e) => change("enabled", e.target.checked)}
          />
          Aplicar logo e cores aos emails
        </label>
        <p>
          Ao aplicar à empresa, a logo e as imagens selecionadas abaixo recebem
          links públicos. Os demais arquivos continuam privados.
        </p>
        <label className="brand-field">
          Logo do cabeçalho
          <select
            aria-label="Logo do cabeçalho do email"
            value={config.email.logoAssetId || ""}
            onChange={(e) => change("logoAssetId", e.target.value || null)}
          >
            <option value="">Usar assinatura para fundo claro</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <Range
          label="Largura da logo no email"
          value={config.email.logoWidth}
          min={120}
          max={280}
          onChange={(v) => change("logoWidth", v)}
        />
        <Choice
          label="Alinhamento da logo no email"
          value={config.email.alignment}
          choices={[
            ["left", "Esquerda"],
            ["center", "Centro"],
          ]}
          onChange={(v) => change("alignment", v)}
        />
        <Range
          label="Respiro do cabeçalho do email"
          value={config.email.padding}
          min={16}
          max={40}
          onChange={(v) => change("padding", v)}
        />
        <label className="brand-check">
          <input
            type="checkbox"
            checked={config.email.showSubtitle}
            onChange={(e) => change("showSubtitle", e.target.checked)}
          />
          Exibir descrição curta abaixo da logo
        </label>
        {publicLogo ? (
          <div className="space-y-sm">
            <label className="brand-field">
              URL pública da logo
              <input
                aria-label="URL pública da logo"
                readOnly
                value={publicLogo.url}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(publicLogo.url);
                setCopied(true);
              }}
            >
              {copied ? "Link copiado" : "Copiar link público"}
            </Button>
            <p>
              A prévia acompanha o rascunho. O link acima corresponde à imagem
              já publicada.
            </p>
          </div>
        ) : (
          <p>
            O link público ficará disponível depois de aplicar a marca. A prévia
            já permite conferir o enquadramento.
          </p>
        )}
      </section>
      <section className="brand-panel">
        <h2>Imagens para o corpo da mensagem</h2>
        <p>
          Libere até oito imagens da biblioteca para inserir no editor de
          emails.
        </p>
        {assets.map((a) => (
          <label key={a.id} className="brand-check">
            <input
              type="checkbox"
              checked={config.email.imageAssetIds.includes(a.id)}
              disabled={
                !config.email.imageAssetIds.includes(a.id) &&
                config.email.imageAssetIds.length >= 8
              }
              onChange={(e) =>
                change(
                  "imageAssetIds",
                  e.target.checked
                    ? [...config.email.imageAssetIds, a.id]
                    : config.email.imageAssetIds.filter((id) => id !== a.id),
                )
              }
            />
            {a.title}
          </label>
        ))}
        <Button type="button" variant="outline" onClick={onAddImage}>
          Adicionar imagem à biblioteca
        </Button>
      </section>
    </>
  );
}
