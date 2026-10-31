"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_VISUAL_CONFIG,
  VisualConfig,
  visualConfigSchema,
  visualIssues,
  normalizeVisualConfig,
} from "@peanut/validators";
import { apiRequest, apiBlobRequest } from "../../../../lib/api";
import { BrandAsset } from "../../../../lib/visual-brand";
import { useAuth } from "../../../../context/AuthContext";
import { useBrand } from "../../../../context/BrandContext";
import Button from "../../../../components/ui/Button";
import AuthenticatedImage from "../../../../components/ui/AuthenticatedImage";
import HtmlDocumentPreview from "../../../../components/ui/HtmlDocumentPreview";
import BrandImageEditor from "../../../../components/settings/BrandImageEditor";
import BrandSystemPreview from "../../../../components/settings/BrandSystemPreview";
import { Range, Color } from "../../../../components/settings/BrandFields";
import {
  BrandPresets,
  BrandTypographyControls,
  BrandComponentControls,
  BrandLayoutControls,
  BrandNavigationControls,
  BrandSidebarControls,
  BrandDocumentTypography,
} from "../../../../components/settings/BrandCustomizationControls";

const tabs = [
  ["identity", "Identidade"],
  ["interface", "Cores e interface"],
  ["navigation", "Navegação"],
  ["documents", "Documentos"],
] as const;
const paletteLabels: Record<string, string> = {
  canvas: "Fundo",
  surface: "Superfície",
  raised: "Blocos e campos",
  text: "Texto principal",
  muted: "Texto secundário",
  border: "Divisórias",
  action: "Ação e foco",
  onAction: "Texto sobre ação",
};
export default function BrandStudio() {
  const { user } = useAuth(),
    { refresh } = useBrand();
  const [config, setConfig] = useState<VisualConfig>(DEFAULT_VISUAL_CONFIG),
    [assets, setAssets] = useState<BrandAsset[]>([]),
    [revision, setRevision] = useState(0),
    [version, setVersion] = useState(0),
    [versions, setVersions] = useState<
      Array<{ version: number; createdAt: string }>
    >([]);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("identity"),
    [view, setView] = useState("desktop"),
    [scheme, setScheme] = useState<"light" | "dark">("light"),
    [paletteMode, setPaletteMode] = useState<"light" | "dark">("light");
  const [documentType, setDocumentType] = useState("PROPOSAL"),
    [html, setHtml] = useState(""),
    [previewBusy, setPreviewBusy] = useState(false),
    [previewError, setPreviewError] = useState("");
  const [editor, setEditor] = useState<{ asset: BrandAsset | null } | null>(
    null,
  );
  const [past, setPast] = useState<VisualConfig[]>([]),
    [future, setFuture] = useState<VisualConfig[]>([]);
  const [assetQuery, setAssetQuery] = useState("");
  const baseline = useRef(JSON.stringify(DEFAULT_VISUAL_CONFIG));
  const editable = ["OWNER", "ADMIN"].includes(user?.role);
  function receive(data: any) {
    const normalized = normalizeVisualConfig(data.draft);
    setConfig(normalized);
    baseline.current = JSON.stringify(normalized);
    setPast([]);
    setFuture([]);
    setAssets(data.assets);
    setRevision(data.revision);
    setVersion(data.publishedVersion);
    setVersions(data.versions);
    setDirty(false);
  }
  useEffect(() => {
    if (!editable) return;
    let active = true;
    apiRequest("/settings/visual")
      .then((data) => {
        if (active) {
          receive(data);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [editable]);
  useEffect(() => {
    if (view !== "document" || !loaded) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      setPreviewBusy(true);
      setPreviewError("");
      try {
        const blob = await apiBlobRequest("/settings/visual/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, documentType }),
          signal: controller.signal,
        });
        const text = await blob.text();
        if (active) setHtml(text);
      } catch (e: any) {
        if (active) setPreviewError(e.message);
      } finally {
        if (active) setPreviewBusy(false);
      }
    }, 500);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [view, config, documentType, loaded]);
  function change(next: VisualConfig) {
    if (busy || JSON.stringify(next) === JSON.stringify(config)) return;
    setPast((previous) => [...previous, config].slice(-40));
    setFuture([]);
    setConfig(next);
    setDirty(JSON.stringify(next) !== baseline.current);
    setMessage("");
  }
  function undo() {
    if (!past.length || busy) return;
    const next = past[past.length - 1];
    if (!next) return;
    setPast(past.slice(0, -1));
    setFuture([config, ...future]);
    setConfig(next);
    setDirty(JSON.stringify(next) !== baseline.current);
    setMessage("");
  }
  function redo() {
    if (!future.length || busy) return;
    const next = future[0];
    if (!next) return;
    setPast([...past, config]);
    setFuture(future.slice(1));
    setConfig(next);
    setDirty(JSON.stringify(next) !== baseline.current);
    setMessage("");
  }
  const update = (key: keyof VisualConfig, value: any) =>
    change({ ...config, [key]: value });
  const nav = (key: keyof VisualConfig["navigation"], value: any) =>
    update("navigation", { ...config.navigation, [key]: value });
  const ui = (key: keyof VisualConfig["interface"], value: any) =>
    update("interface", { ...config.interface, [key]: value });
  const doc = (key: keyof VisualConfig["documents"], value: any) =>
    update("documents", { ...config.documents, [key]: value });
  const issues = visualIssues(config);
  if (
    (config.assets.logoLight || config.assets.logoDark) &&
    !config.assets.iconLight
  )
    issues.push("Selecione o símbolo compacto para o celular.");
  async function save(apply = false) {
    const result = visualConfigSchema.safeParse(config);
    if (!result.success) {
      setError(result.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let data = await apiRequest("/settings/visual/draft", {
        method: "PUT",
        body: JSON.stringify({ revision, config: result.data }),
      });
      receive(data);
      if (apply) {
        data = await apiRequest("/settings/visual/publish", {
          method: "POST",
          body: JSON.stringify({ revision: data.revision }),
        });
        receive(data);
        await refresh();
      }
      setMessage(
        apply
          ? "Marca aplicada à empresa. A versão anterior continua no histórico."
          : "Rascunho salvo. O visual em uso continua igual.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function restore(oldVersion: number) {
    setBusy(true);
    setError("");
    try {
      receive(
        await apiRequest("/settings/visual/restore", {
          method: "POST",
          body: JSON.stringify({ revision, version: oldVersion }),
        }),
      );
      setMessage(
        `Versão ${oldVersion} carregada como rascunho. Revise antes de aplicar.`,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (user && !editable)
    return (
      <div className="brand-panel">
        <h1>Marca e aparência</h1>
        <p>Somente administradores podem configurar a identidade da empresa.</p>
      </div>
    );
  return (
    <div className="brand-studio">
      <header className="brand-studio-header">
        <div>
          <span className="eyebrow">Configurações da empresa</span>
          <h1>Marca e aparência</h1>
          <p>Uma identidade própria, em cada ponto de contato.</p>
        </div>
        <div className="brand-studio-actions">
          <Button
            variant="ghost"
            onClick={undo}
            disabled={!past.length || busy}
          >
            Desfazer
          </Button>
          <Button
            variant="ghost"
            onClick={redo}
            disabled={!future.length || busy}
          >
            Refazer
          </Button>
          <span className="brand-hint">
            {dirty
              ? "Alterações não salvas"
              : version
                ? `Versão em uso: ${version}`
                : "Personalização ainda não aplicada"}
          </span>
          <Button
            variant="outline"
            onClick={() => save()}
            disabled={!loaded || busy}
            loading={busy}
          >
            Salvar rascunho
          </Button>
          <Button
            onClick={() => save(true)}
            disabled={!loaded || busy || issues.length > 0}
          >
            Aplicar à empresa
          </Button>
        </div>
      </header>
      {error && (
        <div role="alert" className="brand-notice brand-error">
          {error}{" "}
          {!loaded && (
            <Button variant="outline" onClick={() => location.reload()}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="brand-notice">
          {message}
        </p>
      )}
      {!loaded && !error && (
        <p role="status">Carregando identidade da empresa…</p>
      )}
      {loaded && (
        <>
          <fieldset className="brand-control-fieldset" disabled={busy}>
            <BrandPresets config={config} onChange={change} />
          </fieldset>
          <div
            className="brand-studio-tabs"
            role="tablist"
            aria-label="Configuração da marca"
          >
            {tabs.map(([id, label]) => (
              <Button
                key={id}
                role="tab"
                id={`brand-tab-${id}`}
                aria-controls="brand-controls"
                aria-selected={tab === id}
                variant={tab === id ? "primary" : "ghost"}
                onClick={() => setTab(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="brand-studio-layout">
            <fieldset
              className="brand-studio-controls"
              disabled={busy}
              id="brand-controls"
              role="tabpanel"
              aria-labelledby={`brand-tab-${tab}`}
            >
              {tab === "identity" && (
                <>
                  <section className="brand-panel">
                    <h2>Identidade da empresa</h2>
                    <label className="brand-field">
                      Nome exibido no sistema
                      <input
                        value={config.name}
                        onChange={(e) => update("name", e.target.value)}
                        maxLength={100}
                      />
                    </label>
                    <label className="brand-field">
                      Descrição curta
                      <input
                        value={config.subtitle}
                        onChange={(e) => update("subtitle", e.target.value)}
                        maxLength={150}
                      />
                    </label>
                    <label className="brand-field">
                      Fonte da interface
                      <select
                        value={config.font}
                        onChange={(e) => update("font", e.target.value)}
                      >
                        <option value="geist">Geist</option>
                        <option value="source-sans-3">Source Sans 3</option>
                        <option value="system">Fonte do dispositivo</option>
                      </select>
                    </label>
                    <p>A escolha da fonte não altera o desenho dos logos.</p>
                  </section>
                  <BrandTypographyControls config={config} onChange={change} />
                  <section className="brand-panel">
                    <h2>Imagens por aplicação</h2>
                    {(
                      [
                        ["logoLight", "Assinatura para fundo claro"],
                        ["logoDark", "Assinatura para fundo escuro"],
                        ["iconLight", "Símbolo compacto para fundo claro"],
                        ["iconDark", "Símbolo compacto para fundo escuro"],
                      ] as const
                    ).map(([key, label]) => (
                      <label className="brand-field" key={key}>
                        {label}
                        <select
                          value={config.assets[key] || ""}
                          onChange={(e) =>
                            update("assets", {
                              ...config.assets,
                              [key]: e.target.value || null,
                            })
                          }
                        >
                          <option value="">
                            {key.endsWith("Dark")
                              ? "Usar a versão clara"
                              : "Selecionar imagem"}
                          </option>
                          {assets.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <p>
                      No celular, a marca sempre usa o símbolo compacto. Não há
                      recorte automático da assinatura.
                    </p>
                  </section>
                  <section className="brand-panel brand-library-panel">
                    <div className="brand-studio-header">
                      <h2>Biblioteca da empresa</h2>
                      <Button
                        variant="outline"
                        onClick={() => setEditor({ asset: null })}
                      >
                        Adicionar imagem
                      </Button>
                    </div>
                    <p>
                      Envie SVG, PNG, JPEG ou WebP. Preserve o original e crie
                      variações quando precisar.
                    </p>
                    {assets.length > 0 && (
                      <label className="brand-field">
                        Buscar na biblioteca
                        <input
                          type="search"
                          value={assetQuery}
                          onChange={(e) => setAssetQuery(e.target.value)}
                          placeholder="Nome da imagem"
                        />
                      </label>
                    )}
                    {assets.length ? (
                      <div className="brand-assets">
                        {assets
                          .filter((a) =>
                            a.title
                              .toLocaleLowerCase("pt-BR")
                              .includes(assetQuery.toLocaleLowerCase("pt-BR")),
                          )
                          .map((a) => (
                            <div className="brand-asset" key={a.id}>
                              <div className="brand-asset-preview">
                                <AuthenticatedImage src={a.url} alt={a.title} />
                              </div>
                              <span>{a.title}</span>
                              <Button
                                variant="ghost"
                                onClick={() => setEditor({ asset: a })}
                              >
                                Ajustar imagem
                              </Button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p>
                        Nenhuma imagem adicionada. Comece pelo símbolo e pela
                        assinatura.
                      </p>
                    )}
                  </section>
                </>
              )}
              {tab === "interface" && (
                <>
                  <section className="brand-panel">
                    <h2>Apresentação</h2>
                    <label className="brand-field">
                      Tema inicial
                      <select
                        value={config.theme}
                        onChange={(e) => update("theme", e.target.value)}
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="system">Acompanhar dispositivo</option>
                      </select>
                    </label>
                    <label className="brand-field">
                      Densidade padrão
                      <select
                        value={config.interface.density}
                        onChange={(e) => ui("density", e.target.value)}
                      >
                        <option value="comfortable">Confortável</option>
                        <option value="compact">Compacta</option>
                      </select>
                    </label>
                    <Range
                      label="Cantos dos componentes"
                      value={config.interface.radius}
                      min={0}
                      max={20}
                      onChange={(v) => ui("radius", v)}
                    />
                    <Range
                      label="Respiro do conteúdo"
                      value={config.interface.spacing}
                      min={16}
                      max={32}
                      onChange={(v) => ui("spacing", v)}
                    />
                    <label className="brand-field">
                      Sombras
                      <select
                        value={config.interface.shadow}
                        onChange={(e) => ui("shadow", e.target.value)}
                      >
                        <option value="none">Sem sombra</option>
                        <option value="subtle">Discretas</option>
                      </select>
                    </label>
                  </section>
                  <section className="brand-panel">
                    <h2>Paleta por tema</h2>
                    <label className="brand-field">
                      Editar paleta
                      <select
                        value={paletteMode}
                        onChange={(e) => {
                          setPaletteMode(e.target.value as "light" | "dark");
                          setScheme(e.target.value as "light" | "dark");
                        }}
                      >
                        <option value="light">Tema claro</option>
                        <option value="dark">Tema escuro</option>
                      </select>
                    </label>
                    {Object.entries(paletteLabels).map(([key, label]) => (
                      <Color
                        key={`${paletteMode}-${key}`}
                        label={label}
                        value={
                          config[paletteMode][
                            key as keyof VisualConfig["light"]
                          ] as string
                        }
                        onChange={(value) =>
                          update(paletteMode, {
                            ...config[paletteMode],
                            [key]: value,
                          })
                        }
                      />
                    ))}
                  </section>
                  <BrandComponentControls config={config} onChange={change} />
                  <BrandLayoutControls config={config} onChange={change} />
                </>
              )}
              {tab === "navigation" && (
                <>
                  <section className="brand-panel">
                    <h2>Marca na navegação</h2>
                    <label className="brand-field">
                      Modo no computador
                      <select
                        value={config.navigation.mode}
                        onChange={(e) => {
                          const mode = e.target.value as "compact" | "expanded";
                          update("navigation", {
                            ...config.navigation,
                            mode,
                            ...(mode === "expanded"
                              ? {
                                  sidebarWidth: Math.max(
                                    config.navigation.sidebarWidth,
                                    config.navigation.logoWidth +
                                      2 * config.navigation.padding,
                                  ),
                                }
                              : {}),
                          });
                        }}
                      >
                        <option value="compact">
                          Compacto · símbolo e nome
                        </option>
                        <option value="expanded">
                          Expandido · assinatura completa
                        </option>
                      </select>
                    </label>
                    <Range
                      label="Largura da sidebar"
                      value={config.navigation.sidebarWidth}
                      min={200}
                      max={360}
                      onChange={(v) => nav("sidebarWidth", v)}
                    />
                    <Range
                      label="Largura máxima da assinatura"
                      value={config.navigation.logoWidth}
                      min={96}
                      max={280}
                      onChange={(v) => nav("logoWidth", v)}
                    />
                    <Range
                      label="Altura máxima da assinatura"
                      value={config.navigation.logoHeight}
                      min={24}
                      max={88}
                      onChange={(v) => nav("logoHeight", v)}
                    />
                    <Range
                      label="Tamanho do símbolo"
                      value={config.navigation.iconSize}
                      min={24}
                      max={56}
                      onChange={(v) => nav("iconSize", v)}
                    />
                    <Range
                      label="Respiro da marca"
                      value={config.navigation.padding}
                      min={12}
                      max={32}
                      onChange={(v) => nav("padding", v)}
                    />
                  </section>
                  <section className="brand-panel">
                    <h2>No celular</h2>
                    <p>
                      O símbolo compacto é usado no cabeçalho e no menu aberto.
                      O modo expandido fica restrito ao computador.
                    </p>
                    <Button variant="outline" onClick={() => setView("mobile")}>
                      Ver no celular
                    </Button>
                  </section>
                  <BrandNavigationControls config={config} onChange={change} />
                  <BrandSidebarControls
                    config={config}
                    onChange={change}
                    scheme={paletteMode}
                    onSchemeChange={(v) => {
                      setPaletteMode(v);
                      setScheme(v);
                    }}
                  />
                </>
              )}
              {tab === "documents" && (
                <>
                  <section className="brand-panel">
                    <h2>Identidade nos documentos</h2>
                    <label className="brand-field">
                      Composição
                      <select
                        value={config.documents.style}
                        onChange={(e) => doc("style", e.target.value)}
                      >
                        <option value="standard">Clássica</option>
                        <option value="editorial">Editorial</option>
                      </select>
                    </label>
                    <Range
                      label="Largura da marca no documento"
                      value={config.documents.logoWidth}
                      min={120}
                      max={320}
                      onChange={(v) => doc("logoWidth", v)}
                    />
                    <Range
                      label="Altura máxima no documento"
                      value={config.documents.logoHeight}
                      min={32}
                      max={100}
                      onChange={(v) => doc("logoHeight", v)}
                    />
                    <label className="brand-field">
                      Alinhamento
                      <select
                        value={config.documents.alignment}
                        onChange={(e) => doc("alignment", e.target.value)}
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centro</option>
                        <option value="right">Direita</option>
                      </select>
                    </label>
                    <label className="brand-field">
                      Margens: {config.documents.margin} mm
                      <input
                        type="range"
                        min={14}
                        max={28}
                        value={config.documents.margin}
                        onChange={(e) => doc("margin", Number(e.target.value))}
                      />
                    </label>
                    <Color
                      label="Destaque do documento"
                      value={config.documents.accent}
                      onChange={(v) => doc("accent", v)}
                    />
                    <label className="brand-field">
                      Rodapé
                      <textarea
                        rows={3}
                        value={config.documents.footer}
                        maxLength={300}
                        onChange={(e) => doc("footer", e.target.value)}
                        placeholder="Nome da empresa · site · contato"
                      />
                    </label>
                    <Button
                      variant="outline"
                      onClick={() => setView("document")}
                    >
                      Ver documento
                    </Button>
                  </section>
                  <section className="brand-panel">
                    <h2>Do modelo ao documento</h2>
                    <p>
                      Propostas e relatórios utilizam a identidade aplicada à
                      empresa. Os documentos finalizados preservam sua
                      apresentação.
                    </p>
                    <Link
                      className="text-primary text-sm"
                      href="/dashboard/documentos/elaborar"
                    >
                      Elaborar proposta ou relatório →
                    </Link>
                    <Link
                      className="text-primary text-sm"
                      href="/dashboard/templates-a4"
                    >
                      Configurar blocos dos PDFs →
                    </Link>
                  </section>
                  <BrandDocumentTypography config={config} onChange={change} />
                </>
              )}
              {issues.length > 0 && (
                <section className="brand-panel">
                  <h2>Antes de aplicar</h2>
                  <ul className="list-disc pl-4 space-y-2 text-sm">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  <p>Você pode salvar o rascunho e continuar ajustando.</p>
                </section>
              )}
            </fieldset>
            <div className="brand-studio-preview">
              <div className="brand-preview-chrome">
                <h2>Prévia do rascunho</h2>
                <div className="brand-studio-actions">
                  <label className="brand-field">
                    <span className="sr-only">Tipo de prévia</span>
                    <select
                      aria-label="Tipo de prévia"
                      value={view}
                      onChange={(e) => setView(e.target.value)}
                    >
                      <option value="desktop">Computador</option>
                      <option value="mobile">Celular</option>
                      <option value="document">Documento A4</option>
                    </select>
                  </label>
                  {view !== "document" && (
                    <label className="brand-field">
                      <span className="sr-only">Tema da prévia</span>
                      <select
                        aria-label="Tema da prévia"
                        value={scheme}
                        onChange={(e) => setScheme(e.target.value as any)}
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>
              {view === "document" ? (
                <>
                  <label className="brand-field">
                    Documento de exemplo
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                    >
                      <option value="PROPOSAL">
                        Proposta técnica e comercial
                      </option>
                      <option value="REPORT">Relatório técnico</option>
                      <option value="INVOICE">Fatura</option>
                      <option value="QUOTE">Orçamento</option>
                      <option value="SERVICE_ORDER">Ordem de serviço</option>
                    </select>
                  </label>
                  {previewBusy && (
                    <p role="status" className="brand-hint">
                      Atualizando documento…
                    </p>
                  )}
                  {previewError && (
                    <p role="alert" className="brand-notice brand-error">
                      {previewError}
                    </p>
                  )}
                  {html && (
                    <HtmlDocumentPreview
                      html={html}
                      title="Prévia da identidade no documento"
                    />
                  )}
                </>
              ) : (
                <BrandSystemPreview
                  config={config}
                  assets={assets}
                  mobile={view === "mobile"}
                  scheme={scheme}
                />
              )}
              <p className="brand-hint">
                A prévia usa dados fictícios. As mudanças só passam para o
                sistema ao aplicar à empresa.
              </p>
              {versions.length > 0 && (
                <details className="brand-panel">
                  <summary>
                    Histórico da marca · {versions.length} versões
                  </summary>
                  {versions.map((v) => (
                    <div className="brand-studio-header" key={v.version}>
                      <span className="text-sm">
                        Versão {v.version} ·{" "}
                        {new Date(v.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => restore(v.version)}
                      >
                        Usar como rascunho
                      </Button>
                    </div>
                  ))}
                </details>
              )}
            </div>
          </div>
        </>
      )}
      {editor && (
        <BrandImageEditor
          asset={editor.asset}
          onClose={() => setEditor(null)}
          onSaved={(asset) => {
            setAssets((old) => [asset, ...old]);
            setMessage(
              "Imagem adicionada. Selecione em qual aplicação deseja usá-la.",
            );
          }}
        />
      )}
    </div>
  );
}
