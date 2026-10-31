"use client";
import React from "react";
import {
  VisualConfig,
  applyVisualPreset,
  resolvedSidebar,
} from "@peanut/validators";
import Button from "../ui/Button";
import { Choice, Color, Range, Toggle } from "./BrandFields";

type Props = { config: VisualConfig; onChange: (next: VisualConfig) => void };
const fonts = [
  ["geist", "Geist"],
  ["source-sans-3", "Source Sans 3"],
  ["system", "Fonte do dispositivo"],
] as const;
function editor({ config, onChange }: Props) {
  return (
    group: keyof VisualConfig["customization"],
    key: string,
    value: unknown,
  ) =>
    onChange({
      ...config,
      customization: {
        ...config.customization,
        [group]: { ...config.customization[group], [key]: value },
      },
    });
}
export function BrandPresets({ config, onChange }: Props) {
  return (
    <details className="brand-panel brand-presets">
      <summary>Começar por um estilo</summary>
      <p>
        Altere os componentes e o ritmo da interface. Nome, logos e cores da
        empresa são preservados. Você pode desfazer e ajustar cada escolha.
      </p>
      <div className="brand-preset-grid">
        {(
          [
            [
              "essential",
              "Essencial",
              "Linhas discretas, botões preenchidos e navegação com marcador lateral.",
            ],
            [
              "institutional",
              "Institucional",
              "Cantos retos, botões de contorno e seleção sólida no menu.",
            ],
            [
              "operational",
              "Operação",
              "Densidade compacta, tabelas alternadas e números monoespaçados.",
            ],
          ] as const
        ).map(([id, name, description]) => (
          <button
            key={id}
            type="button"
            className="brand-preset"
            onClick={() => onChange(applyVisualPreset(config, id))}
          >
            <strong>{name}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
export function BrandTypographyControls(props: Props) {
  const t = props.config.customization.typography,
    edit = editor(props);
  return (
    <section className="brand-panel">
      <h2>Tipografia e leitura</h2>
      <Choice
        label="Fonte dos títulos"
        value={t.headingFont}
        choices={[
          ["inherit", "Mesma da interface"],
          ...fonts,
          ["serif", "Serifada · Georgia"],
        ]}
        onChange={(v) => edit("typography", "headingFont", v)}
      />
      <Choice
        label="Fonte dos dados e valores"
        value={t.dataFont}
        choices={[
          ["inherit", "Mesma da interface"],
          ...fonts,
          ["mono", "Monoespaçada"],
        ]}
        onChange={(v) => edit("typography", "dataFont", v)}
      />
      <Range
        label="Tamanho base do texto"
        value={t.baseSize}
        min={14}
        max={18}
        onChange={(v) => edit("typography", "baseSize", v)}
      />
      <Choice
        label="Peso dos títulos"
        value={t.headingWeight}
        choices={[
          ["400", "Regular"],
          ["600", "Semibold"],
        ]}
        onChange={(v) => edit("typography", "headingWeight", Number(v))}
      />
      <Range
        label="Espaçamento das letras nos títulos"
        value={t.headingTracking}
        min={-2}
        max={2}
        unit="%"
        onChange={(v) => edit("typography", "headingTracking", v)}
      />
      <p>
        As preferências de leitura ampliada continuam disponíveis para cada
        pessoa.
      </p>
    </section>
  );
}
export function BrandComponentControls(props: Props) {
  const c = props.config.customization.components,
    edit = editor(props);
  return (
    <section className="brand-panel">
      <h2>Botões, campos e tabelas</h2>
      <Choice
        label="Estilo da ação principal"
        value={c.buttonStyle}
        choices={[
          ["filled", "Preenchido"],
          ["outline", "Contorno"],
        ]}
        onChange={(v) => edit("components", "buttonStyle", v)}
      />
      <Choice
        label="Formato dos botões"
        value={c.buttonShape}
        choices={[
          ["soft", "Cantos da interface"],
          ["square", "Retos"],
          ["pill", "Arredondados"],
        ]}
        onChange={(v) => edit("components", "buttonShape", v)}
      />
      <Choice
        label="Estilo dos campos"
        value={c.fieldStyle}
        choices={[
          ["outline", "Contorno"],
          ["filled", "Preenchido suave"],
        ]}
        onChange={(v) => edit("components", "fieldStyle", v)}
      />
      <Range
        label="Altura mínima dos campos"
        value={c.fieldHeight}
        min={44}
        max={56}
        onChange={(v) => edit("components", "fieldHeight", v)}
      />
      <Choice
        label="Apresentação das tabelas"
        value={c.tableStyle}
        choices={[
          ["plain", "Discreta"],
          ["striped", "Linhas alternadas"],
          ["lined", "Divisórias marcadas"],
        ]}
        onChange={(v) => edit("components", "tableStyle", v)}
      />
      <p>Cores de erro e estados de operação preservam seu significado.</p>
    </section>
  );
}
export function BrandLayoutControls(props: Props) {
  const l = props.config.customization.layout,
    edit = editor(props);
  return (
    <section className="brand-panel">
      <h2>Área de trabalho</h2>
      <Choice
        label="Largura do conteúdo"
        value={l.width}
        choices={[
          ["contained", "Centralizada, com limite"],
          ["fluid", "Ocupar espaço disponível"],
        ]}
        onChange={(v) => edit("layout", "width", v)}
      />
      {l.width === "contained" && (
        <Range
          label="Limite do conteúdo"
          value={l.maxWidth}
          min={960}
          max={1920}
          step={40}
          onChange={(v) => edit("layout", "maxWidth", v)}
        />
      )}
      <Range
        label="Altura do cabeçalho no computador"
        value={l.topbarHeight}
        min={56}
        max={88}
        step={4}
        onChange={(v) => edit("layout", "topbarHeight", v)}
      />
      <p>
        No celular, a área de trabalho se adapta à tela e mantém os controles
        acessíveis.
      </p>
    </section>
  );
}
export function BrandNavigationControls(props: Props) {
  const n = props.config.customization.navigation,
    edit = editor(props);
  return (
    <section className="brand-panel">
      <h2>Composição da lateral</h2>
      <Choice
        label="Alinhamento da marca na sidebar"
        value={n.alignment}
        choices={[
          ["left", "Esquerda"],
          ["center", "Centro"],
        ]}
        onChange={(v) => edit("navigation", "alignment", v)}
      />
      <Range
        label="Altura mínima da área da marca"
        value={n.logoBlockHeight}
        min={72}
        max={160}
        step={4}
        onChange={(v) => edit("navigation", "logoBlockHeight", v)}
      />
      <Toggle
        label="Exibir nome ao lado do símbolo"
        checked={n.showCompactName}
        onChange={(v) => edit("navigation", "showCompactName", v)}
      />
      <Toggle
        label="Exibir descrição curta no modo compacto"
        checked={n.showSubtitle}
        onChange={(v) => edit("navigation", "showSubtitle", v)}
      />
      <Toggle
        label="Exibir títulos dos grupos do menu"
        checked={n.showGroups}
        onChange={(v) => edit("navigation", "showGroups", v)}
      />
      <Choice
        label="Item selecionado no menu"
        value={n.itemStyle}
        choices={[
          ["soft", "Fundo suave"],
          ["rail", "Marcador lateral"],
          ["solid", "Fundo sólido"],
        ]}
        onChange={(v) => edit("navigation", "itemStyle", v)}
      />
      <Choice
        label="Ícones da navegação"
        value={n.iconStyle}
        choices={[
          ["outline", "Contorno"],
          ["filled", "Preenchidos"],
        ]}
        onChange={(v) => edit("navigation", "iconStyle", v)}
      />
      <Range
        label="Peso dos ícones da navegação"
        value={n.iconWeight}
        min={200}
        max={600}
        step={100}
        unit=""
        onChange={(v) => edit("navigation", "iconWeight", v)}
      />
    </section>
  );
}
export function BrandSidebarControls({
  config,
  onChange,
  scheme,
  onSchemeChange,
}: Props & {
  scheme: "light" | "dark";
  onSchemeChange: (v: "light" | "dark") => void;
}) {
  const p = config[scheme],
    side = resolvedSidebar(config, scheme);
  function patch(next: Partial<typeof p>) {
    onChange({ ...config, [scheme]: { ...p, ...next } });
  }
  function copy(source: "light" | "dark") {
    const from = config[source];
    patch({
      sidebar: from.canvas,
      sidebarText: from.text,
      sidebarMuted: from.muted,
      sidebarAction: from.action,
      sidebarOnAction: from.onAction,
    });
  }
  return (
    <section className="brand-panel">
      <h2>Cores próprias da sidebar</h2>
      <p>
        Combine uma lateral escura com conteúdo claro, ou ajuste cada tema. A
        versão do logo acompanha o fundo da sua área.
      </p>
      <Choice
        label="Editar sidebar do tema"
        value={scheme}
        choices={[
          ["light", "Claro"],
          ["dark", "Escuro"],
        ]}
        onChange={(v) => onSchemeChange(v as "light" | "dark")}
      />
      <div className="brand-studio-actions">
        <Button variant="outline" onClick={() => copy("light")}>
          Usar paleta clara
        </Button>
        <Button variant="outline" onClick={() => copy("dark")}>
          Usar paleta escura
        </Button>
      </div>
      <Color
        label="Fundo da sidebar"
        value={side.background}
        onChange={(v) => patch({ sidebar: v })}
      />
      <Color
        label="Texto da sidebar"
        value={side.text}
        onChange={(v) => patch({ sidebarText: v })}
      />
      <Color
        label="Texto secundário da sidebar"
        value={side.muted}
        onChange={(v) => patch({ sidebarMuted: v })}
      />
      <Color
        label="Destaque da sidebar"
        value={side.action}
        onChange={(v) => patch({ sidebarAction: v })}
      />
      <Color
        label="Texto sobre destaque da sidebar"
        value={side.onAction}
        onChange={(v) => patch({ sidebarOnAction: v })}
      />
      <Button
        variant="ghost"
        onClick={() =>
          patch({
            sidebar: p.canvas,
            sidebarText: null,
            sidebarMuted: null,
            sidebarAction: null,
            sidebarOnAction: null,
          })
        }
      >
        Acompanhar cores do conteúdo
      </Button>
    </section>
  );
}
export function BrandDocumentTypography({ config, onChange }: Props) {
  const d = config.documents;
  const edit = (key: string, value: unknown) =>
    onChange({ ...config, documents: { ...d, [key]: value } });
  return (
    <section className="brand-panel">
      <h2>Tipografia dos documentos</h2>
      <Choice
        label="Fonte do corpo do documento"
        value={d.font}
        choices={[["inherit", "Mesma da interface"], ...fonts]}
        onChange={(v) => edit("font", v)}
      />
      <Choice
        label="Fonte dos títulos do documento"
        value={d.headingFont}
        choices={[["inherit", "Mesma do corpo do documento"], ...fonts]}
        onChange={(v) => edit("headingFont", v)}
      />
      <Choice
        label="Texto do documento"
        value={d.bodySize ?? ""}
        choices={[
          ["", "Padrão do modelo"],
          ...[9, 9.5, 10, 10.5, 11, 12, 13].map(
            (n) => [String(n), `${n} pt`] as const,
          ),
        ]}
        onChange={(v) => edit("bodySize", v ? Number(v) : null)}
      />
      <Choice
        label="Título principal do documento"
        value={d.headingSize ?? ""}
        choices={[
          ["", "Padrão do modelo"],
          ...[22, 24, 26, 27, 28, 30, 32, 34].map(
            (n) => [String(n), `${n} pt`] as const,
          ),
        ]}
        onChange={(v) => edit("headingSize", v ? Number(v) : null)}
      />
      <p>
        Geist e Source Sans 3 ficam incorporadas nos documentos para preservar a
        apresentação ao imprimir ou salvar PDF.
      </p>
    </section>
  );
}
