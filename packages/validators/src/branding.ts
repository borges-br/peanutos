import { z } from "zod";
export { z } from "zod";

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal, como #0968C4.");
const uiFont = z.enum(["geist", "source-sans-3", "system"]);
const headingFont = z.enum([
  "inherit",
  "geist",
  "source-sans-3",
  "system",
  "serif",
]);
export const DEFAULT_CUSTOMIZATION = {
  typography: {
    headingFont: "inherit" as const,
    dataFont: "inherit" as const,
    baseSize: 16,
    headingWeight: 600 as const,
    headingTracking: -1,
  },
  navigation: {
    alignment: "left" as const,
    showSubtitle: true,
    showCompactName: true,
    showGroups: true,
    itemStyle: "soft" as const,
    iconStyle: "outline" as const,
    iconWeight: 300,
    logoBlockHeight: 104,
  },
  components: {
    buttonStyle: "filled" as const,
    buttonShape: "soft" as const,
    fieldStyle: "outline" as const,
    fieldHeight: 44,
    tableStyle: "plain" as const,
  },
  layout: { width: "contained" as const, maxWidth: 1400, topbarHeight: 72 },
};
const customization = z
  .object({
    typography: z
      .object({
        headingFont,
        dataFont: z.enum([
          "inherit",
          "geist",
          "source-sans-3",
          "system",
          "mono",
        ]),
        baseSize: z.number().int().min(14).max(18),
        headingWeight: z.union([z.literal(400), z.literal(600)]),
        headingTracking: z.number().int().min(-2).max(2),
      })
      .strict(),
    navigation: z
      .object({
        alignment: z.enum(["left", "center"]),
        showSubtitle: z.boolean(),
        showCompactName: z.boolean(),
        showGroups: z.boolean(),
        itemStyle: z.enum(["soft", "rail", "solid"]),
        iconStyle: z.enum(["outline", "filled"]),
        iconWeight: z.number().int().min(200).max(600),
        logoBlockHeight: z.number().int().min(72).max(160),
      })
      .strict(),
    components: z
      .object({
        buttonStyle: z.enum(["filled", "outline"]),
        buttonShape: z.enum(["soft", "square", "pill"]),
        fieldStyle: z.enum(["outline", "filled"]),
        fieldHeight: z.number().int().min(44).max(56),
        tableStyle: z.enum(["plain", "striped", "lined"]),
      })
      .strict(),
    layout: z
      .object({
        width: z.enum(["contained", "fluid"]),
        maxWidth: z.number().int().min(960).max(1920),
        topbarHeight: z.number().int().min(56).max(88),
      })
      .strict(),
  })
  .strict()
  .default(DEFAULT_CUSTOMIZATION);
const palette = z
  .object({
    canvas: hex,
    surface: hex,
    raised: hex,
    text: hex,
    muted: hex,
    border: hex,
    action: hex,
    onAction: hex,
    sidebar: hex,
    sidebarText: hex.nullable().default(null),
    sidebarMuted: hex.nullable().default(null),
    sidebarAction: hex.nullable().default(null),
    sidebarOnAction: hex.nullable().default(null),
  })
  .strict();
const asset = z.string().uuid().nullable();
export const visualConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1).max(100),
    subtitle: z.string().trim().max(150),
    theme: z.enum(["light", "dark", "system"]),
    font: uiFont,
    customization,
    assets: z
      .object({
        logoLight: asset,
        logoDark: asset,
        iconLight: asset,
        iconDark: asset,
      })
      .strict(),
    navigation: z
      .object({
        mode: z.enum(["compact", "expanded"]),
        sidebarWidth: z.number().int().min(200).max(360),
        logoWidth: z.number().int().min(96).max(280),
        logoHeight: z.number().int().min(24).max(88),
        iconSize: z.number().int().min(24).max(56),
        padding: z.number().int().min(12).max(32),
      })
      .strict(),
    light: palette,
    dark: palette,
    interface: z
      .object({
        radius: z.number().int().min(0).max(20),
        density: z.enum(["comfortable", "compact"]),
        spacing: z.number().int().min(16).max(32),
        shadow: z.enum(["none", "subtle"]),
      })
      .strict(),
    documents: z
      .object({
        logoWidth: z.number().int().min(120).max(320),
        logoHeight: z.number().int().min(32).max(100),
        alignment: z.enum(["left", "center", "right"]),
        margin: z.number().int().min(14).max(28),
        accent: hex,
        footer: z.string().trim().max(300),
        style: z.enum(["standard", "editorial"]),
        font: z
          .enum(["inherit", "geist", "source-sans-3", "system"])
          .default("inherit"),
        headingFont: z
          .enum(["inherit", "geist", "source-sans-3", "system"])
          .default("inherit"),
        bodySize: z.number().min(9).max(13).nullable().default(null),
        headingSize: z.number().int().min(22).max(34).nullable().default(null),
      })
      .strict(),
  })
  .strict();
export type VisualConfig = z.infer<typeof visualConfigSchema>;

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  schemaVersion: 1,
  name: "Peanut OS",
  subtitle: "Seu trabalho, conectado.",
  theme: "dark",
  font: "geist",
  customization: DEFAULT_CUSTOMIZATION,
  assets: { logoLight: null, logoDark: null, iconLight: null, iconDark: null },
  navigation: {
    mode: "compact",
    sidebarWidth: 260,
    logoWidth: 200,
    logoHeight: 56,
    iconSize: 40,
    padding: 24,
  },
  light: {
    canvas: "#F4F7FA",
    surface: "#FFFFFF",
    raised: "#EAF0F5",
    text: "#1E2A38",
    muted: "#526171",
    border: "#C6D0DC",
    action: "#0968C4",
    onAction: "#FFFFFF",
    sidebar: "#FFFFFF",
    sidebarText: null,
    sidebarMuted: null,
    sidebarAction: null,
    sidebarOnAction: null,
  },
  dark: {
    canvas: "#101D2B",
    surface: "#172838",
    raised: "#213547",
    text: "#EDF4F7",
    muted: "#B7C9D8",
    border: "#3C566C",
    action: "#93E2CF",
    onAction: "#0C312B",
    sidebar: "#162735",
    sidebarText: null,
    sidebarMuted: null,
    sidebarAction: null,
    sidebarOnAction: null,
  },
  interface: {
    radius: 12,
    density: "comfortable",
    spacing: 24,
    shadow: "subtle",
  },
  documents: {
    logoWidth: 240,
    logoHeight: 64,
    alignment: "left",
    margin: 20,
    accent: "#0968C4",
    footer: "",
    style: "standard",
    font: "inherit",
    headingFont: "inherit",
    bodySize: null,
    headingSize: null,
  },
};

/** Fill new controls when reading older v1 themes; never alter the stored history in place. */
export const normalizeVisualConfig = (value: unknown): VisualConfig =>
  visualConfigSchema.parse(value);
export function resolvedSidebar(
  config: VisualConfig,
  scheme: "light" | "dark",
) {
  const p = config[scheme];
  return {
    background: p.sidebar,
    text: p.sidebarText || p.text,
    muted: p.sidebarMuted || p.muted,
    action: p.sidebarAction || p.action,
    onAction: p.sidebarOnAction || p.onAction,
  };
}
export function surfaceScheme(color: string): "light" | "dark" {
  return contrastRatio("#FFFFFF", color) > contrastRatio("#000000", color)
    ? "dark"
    : "light";
}
export type VisualPreset = "essential" | "institutional" | "operational";
export function applyVisualPreset(
  value: VisualConfig,
  preset: VisualPreset,
): VisualConfig {
  const next = normalizeVisualConfig(value);
  if (preset === "essential") {
    next.interface = {
      ...next.interface,
      radius: 8,
      density: "comfortable",
      shadow: "none",
    };
    next.customization.components = {
      buttonStyle: "filled",
      buttonShape: "soft",
      fieldStyle: "outline",
      fieldHeight: 44,
      tableStyle: "plain",
    };
    next.customization.navigation.itemStyle = "rail";
    next.customization.typography = {
      ...next.customization.typography,
      headingFont: "inherit",
      dataFont: "inherit",
      headingWeight: 600,
      headingTracking: -1,
    };
  } else if (preset === "institutional") {
    next.interface = {
      ...next.interface,
      radius: 4,
      density: "comfortable",
      shadow: "none",
    };
    next.customization.components = {
      buttonStyle: "outline",
      buttonShape: "square",
      fieldStyle: "outline",
      fieldHeight: 48,
      tableStyle: "lined",
    };
    next.customization.navigation.itemStyle = "solid";
    next.customization.typography = {
      ...next.customization.typography,
      headingFont: "inherit",
      dataFont: "inherit",
      headingWeight: 600,
      headingTracking: 0,
    };
  } else {
    next.interface = {
      ...next.interface,
      radius: 6,
      density: "compact",
      shadow: "none",
    };
    next.customization.components = {
      buttonStyle: "filled",
      buttonShape: "soft",
      fieldStyle: "filled",
      fieldHeight: 44,
      tableStyle: "striped",
    };
    next.customization.navigation.itemStyle = "soft";
    next.customization.typography = {
      ...next.customization.typography,
      headingFont: "inherit",
      dataFont: "mono",
      headingWeight: 600,
      headingTracking: -1,
    };
  }
  return next;
}
export function documentVisualConfig(config: VisualConfig) {
  return {
    ...config.documents,
    font:
      config.documents.font === "inherit" ? config.font : config.documents.font,
  };
}

export const saveVisualSchema = z
  .object({ revision: z.number().int().min(0), config: visualConfigSchema })
  .strict();
export const revisionSchema = z
  .object({ revision: z.number().int().min(0) })
  .strict();
export const restoreVisualSchema = revisionSchema
  .extend({ version: z.number().int().min(1) })
  .strict();
export const brandAssetSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    filename: z.string().min(1).max(255),
    mimeType: z.enum([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]),
    data: z.string().min(1).max(2800000),
    parentAssetId: z.string().uuid().nullable().optional(),
  })
  .strict();

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const channels = color
      .slice(1)
      .match(/../g)!
      .map((c) => parseInt(c, 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return (
      channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
    );
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function visualIssues(config: VisualConfig): string[] {
  const issues: string[] = [];
  for (const key of ["light", "dark"] as const) {
    const p = config[key],
      label = key === "light" ? "Tema claro" : "Tema escuro",
      side = resolvedSidebar(config, key);
    const solid = config.customization.navigation.itemStyle === "solid";
    const softBackground =
      "#" +
      [0, 1, 2]
        .map((i) => {
          const start = 1 + 2 * i;
          return Math.round(
            parseInt(side.background.slice(start, start + 2), 16) * 0.9 +
              parseInt(side.action.slice(start, start + 2), 16) * 0.1,
          )
            .toString(16)
            .padStart(2, "0");
        })
        .join("");
    for (const [front, back, name] of [
      [p.text, p.canvas, "texto/fundo"],
      [p.text, p.surface, "texto/superfície"],
      [p.text, p.raised, "texto/blocos"],
      [side.text, side.background, "texto/sidebar"],
      [p.muted, p.surface, "texto secundário"],
      [p.muted, config.customization.components.fieldStyle === "filled" ? p.raised : p.surface, "placeholder dos campos"],
      [side.muted, side.background, "texto secundário/sidebar"],
      [p.onAction, p.action, "texto/botão"],
      [side.onAction, side.action, "texto/seleção da sidebar"],
      [side.action, side.background, "seleção/sidebar"],
      [
        solid ? side.onAction : side.action,
        solid ? side.action : softBackground,
        "item selecionado/sidebar",
      ],
    ] as const) {
      if (contrastRatio(front, back) < 4.5)
        issues.push(
          `${label}: contraste insuficiente em ${name} (mínimo 4,5:1).`,
        );
    }
    if (
      config.customization.components.buttonStyle === "outline" &&
      [p.canvas, p.surface].some(
        (background) => contrastRatio(p.action, background) < 4.5,
      )
    ) {
      issues.push(
        `${label}: contraste insuficiente no texto do botão de contorno (mínimo 4,5:1).`,
      );
    }
    for (const background of [p.canvas, p.surface]) {
      if (contrastRatio(p.action, background) < 3) {
        issues.push(
          `${label}: destaque e foco precisam de contraste mínimo 3:1.`,
        );
        break;
      }
    }
  }
  if (
    config.navigation.mode === "expanded" &&
    config.navigation.logoWidth + 2 * config.navigation.padding >
      config.navigation.sidebarWidth
  )
    issues.push(
      "Aumente a largura da sidebar ou reduza a largura da assinatura e suas margens.",
    );
  return issues;
}

export const authoredDocumentSchema = z
  .object({
    kind: z.enum(["REPORT", "PROPOSAL"]),
    title: z.string().trim().min(3).max(180),
    clientId: z.string().uuid(),
    quoteId: z.string().uuid().nullable().optional(),
    project: z.string().trim().max(180),
    sections: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(100),
            body: z.string().max(12000),
          })
          .strict(),
      )
      .min(1)
      .max(15),
  })
  .strict();
export type AuthoredDocumentInput = z.infer<typeof authoredDocumentSchema>;
