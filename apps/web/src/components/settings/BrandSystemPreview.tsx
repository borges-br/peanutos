"use client";
import React, { useState } from "react";
import { VisualConfig, surfaceScheme } from "@peanut/validators";
import { BrandAsset, activeAsset, visualStyle } from "../../lib/visual-brand";
import AuthenticatedImage from "../ui/AuthenticatedImage";
import Button from "../ui/Button";
import NavigationIcon from "../layout/NavigationIcon";

export default function BrandSystemPreview({
  config,
  assets,
  mobile,
  scheme,
}: {
  config: VisualConfig;
  assets: BrandAsset[];
  mobile: boolean;
  scheme: "light" | "dark";
}) {
  const [sample, setSample] = useState<"clients" | "components">("clients");
  const surface = surfaceScheme(config[scheme][mobile ? "surface" : "sidebar"]);
  const logo = activeAsset(config, assets, "logo", surface),
    icon = activeAsset(config, assets, "icon", surface);
  const compact = (
    <>
      <AuthenticatedImage
        src={icon}
        alt={config.name}
        fallback={
          <span className="brand-initial">{config.name.slice(0, 1)}</span>
        }
        style={{
          width: config.navigation.iconSize,
          height: config.navigation.iconSize,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
      {!mobile && (
        <span className="brand-name">
          <strong>{config.name}</strong>
          {config.subtitle && <small>{config.subtitle}</small>}
        </span>
      )}
    </>
  );
  return (
    <div
      className={`brand-live-preview ${mobile ? "brand-mobile-preview" : ""}`}
      style={visualStyle(config, scheme)}
      aria-label={mobile ? "Prévia do celular" : "Prévia do sistema"}
    >
      <div
        className="brand-preview-app"
        style={
          mobile
            ? undefined
            : {
                gridTemplateColumns: `minmax(140px,${config.navigation.sidebarWidth}px) minmax(0,1fr)`,
              }
        }
      >
        {!mobile && (
          <aside className="brand-preview-side">
            <div
              className="brand-preview-mark"
              style={{ padding: config.navigation.padding }}
            >
              {config.navigation.mode === "expanded" && logo ? (
                <AuthenticatedImage
                  src={logo}
                  alt={config.name}
                  style={{
                    width: config.navigation.logoWidth,
                    height: config.navigation.logoHeight,
                    objectFit: "contain",
                    objectPosition: `${config.customization.navigation.alignment} center`,
                  }}
                />
              ) : (
                compact
              )}
            </div>
            <div className="brand-preview-nav">
              <small className="brand-preview-group">Dia a dia</small>
              {(
                [
                  ["space_dashboard", "Visão geral"],
                  ["groups", "Clientes"],
                  ["confirmation_number", "Chamados"],
                  ["account_balance_wallet", "Financeiro"],
                  ["description", "Documentos"],
                ] as const
              ).map(([i, label]) => (
                <div key={i} data-selected={label === "Clientes"}>
                  <NavigationIcon name={i} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </aside>
        )}
        <div className="brand-preview-main">
          <div className="brand-preview-top">
            {mobile && (
              <>
                <span className="material-symbols-outlined" aria-hidden="true">
                  menu
                </span>
                {compact}
              </>
            )}
            <span>Clientes</span>
            <div
              className="brand-preview-switch"
              role="group"
              aria-label="Conteúdo da prévia"
            >
              <button
                aria-pressed={sample === "clients"}
                onClick={() => setSample("clients")}
              >
                Lista
              </button>
              <button
                aria-pressed={sample === "components"}
                onClick={() => setSample("components")}
              >
                Componentes
              </button>
            </div>
          </div>
          <div className="brand-preview-content">
            <div>
              <h3>
                {sample === "clients"
                  ? "Relacionamentos que conectam sua operação."
                  : "Cada detalhe, do seu jeito."}
              </h3>
              <p>
                {sample === "clients"
                  ? "Clientes, contatos e próximos passos em um só lugar."
                  : "Experimente campos, botões e a leitura dos valores."}
              </p>
            </div>
            {sample === "clients" ? (
              <>
                <Button
                  onClick={() => setSample("components")}
                  className="w-fit"
                >
                  Novo cliente
                </Button>
                <div
                  className="brand-preview-list"
                  data-density={config.interface.density}
                >
                  <div>
                    <span>Cliente</span>
                    <span>Situação</span>
                  </div>
                  {["Rede Horizonte", "Indústria Aurora", "Grupo Nascente"].map(
                    (name) => (
                      <div key={name}>
                        <span>{name}</span>
                        <span>Ativo</span>
                      </div>
                    ),
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="brand-preview-stat">
                  <span>Receita do mês</span>
                  <strong data-brand-value>R$ 12.480,00</strong>
                </div>
                <div className="brand-preview-form">
                  <label className="brand-field">
                    Nome do cliente
                    <input
                      placeholder="Ex.: Rede Horizonte"
                      aria-label="Cliente de exemplo"
                    />
                  </label>
                  <label className="brand-field">
                    Situação
                    <select aria-label="Situação de exemplo">
                      <option>Ativo</option>
                      <option>Em negociação</option>
                    </select>
                  </label>
                  <div className="brand-studio-actions">
                    <Button onClick={() => setSample("clients")}>
                      Salvar exemplo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSample("clients")}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </>
            )}
            <p>Prévia com dados fictícios.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
