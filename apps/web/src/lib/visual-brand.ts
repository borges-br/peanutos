import type { CSSProperties } from "react";
import {
  VisualConfig,
  resolvedSidebar,
  DEFAULT_CUSTOMIZATION,
  surfaceScheme,
} from "@peanut/validators";

export type BrandAsset = {
  id: string;
  title: string;
  url: string;
  mimeType: string;
  parentAssetId?: string | null;
  createdAt?: string;
};
export const brandFont = (font: string) =>
  font === "source-sans-3"
    ? '"Source Sans 3",Arial,sans-serif'
    : font === "geist"
      ? "Geist,Arial,sans-serif"
      : font === "serif"
        ? 'Georgia,"Times New Roman",serif'
        : font === "mono"
          ? "ui-monospace,Consolas,monospace"
          : "system-ui,sans-serif";
export function visualStyle(
  config: VisualConfig,
  scheme: "light" | "dark",
): CSSProperties {
  const p = config[scheme],
    rgb = (hex: string) =>
      hex
        .slice(1)
        .match(/../g)!
        .map((v) => parseInt(v, 16))
        .join(" ");
  const c = config.customization || DEFAULT_CUSTOMIZATION,
    side = resolvedSidebar(config, scheme);
  const vars: Record<string, string> = {
    "--brand-font": brandFont(config.font),
    "--brand-heading-font": brandFont(
      c.typography.headingFont === "inherit"
        ? config.font
        : c.typography.headingFont,
    ),
    "--brand-data-font": brandFont(
      c.typography.dataFont === "inherit" ? config.font : c.typography.dataFont,
    ),
    "--brand-base-size": `${c.typography.baseSize}px`,
    "--brand-heading-weight": String(c.typography.headingWeight),
    "--brand-heading-tracking": `${c.typography.headingTracking / 100}em`,
    "--brand-logo-alignment": c.navigation.alignment,
    "--brand-logo-block-height": `${c.navigation.logoBlockHeight}px`,
    "--brand-icon-fill": c.navigation.iconStyle === "filled" ? "1" : "0",
    "--brand-icon-weight": String(c.navigation.iconWeight),
    "--brand-field-height": `${c.components.fieldHeight}px`,
    "--brand-button-radius":
      c.components.buttonShape === "pill"
        ? "999px"
        : c.components.buttonShape === "square"
          ? "2px"
          : `${config.interface.radius}px`,
    "--brand-content-max":
      c.layout.width === "fluid" ? "none" : `${c.layout.maxWidth}px`,
    "--brand-topbar-height": `${c.layout.topbarHeight}px`,
    "--brand-button-bg":
      c.components.buttonStyle === "outline"
        ? "transparent"
        : `rgb(${rgb(p.action)})`,
    "--brand-button-text": `rgb(${rgb(c.components.buttonStyle === "outline" ? p.action : p.onAction)})`,
    "--brand-field-bg": `rgb(${rgb(c.components.fieldStyle === "filled" ? p.raised : p.surface)})`,
    "--brand-table-row-alt":
      c.components.tableStyle === "striped"
        ? `rgb(${rgb(p.raised)})`
        : `rgb(${rgb(p.surface)})`,
    "--brand-table-line":
      c.components.tableStyle === "lined"
        ? `rgb(${rgb(p.muted)})`
        : `rgb(${rgb(p.border)})`,
    "--brand-nav-radius":
      c.navigation.itemStyle === "rail"
        ? "0px"
        : `${config.interface.radius}px`,
    "--brand-nav-bg":
      c.navigation.itemStyle === "solid"
        ? side.action
        : `rgb(${rgb(side.action)} / .1)`,
    "--brand-nav-text":
      c.navigation.itemStyle === "solid" ? side.onAction : side.action,
    "--brand-nav-indicator":
      c.navigation.itemStyle === "rail"
        ? `3px solid ${side.action}`
        : "3px solid transparent",
    "--brand-sidebar-text": rgb(side.text),
    "--brand-sidebar-muted": rgb(side.muted),
    "--brand-sidebar-action": rgb(side.action),
    "--brand-sidebar-on-action": rgb(side.onAction),
    "--brand-sidebar-high-text":
      surfaceScheme(side.background) === "dark" ? "255 255 255" : "0 0 0",
    "--brand-logo-justify":
      c.navigation.alignment === "center" ? "center" : "flex-start",
    "--brand-group-labels": c.navigation.showGroups ? "block" : "none",
    "--brand-tagline-display": c.navigation.showSubtitle ? "block" : "none",
    "--brand-compact-name-display": c.navigation.showCompactName
      ? "block"
      : "none",
    "--brand-sidebar": p.sidebar,
    "--brand-sidebar-width": `${config.navigation.sidebarWidth}px`,
    "--brand-radius": `${config.interface.radius}px`,
    "--brand-spacing": `${config.interface.spacing}px`,
    "--brand-shadow":
      config.interface.shadow === "none"
        ? "none"
        : `0 4px 16px ${scheme === "light" ? "#1e2a380a" : "#0000001c"}`,
    "--brand-padding": `${config.navigation.padding}px`,
    colorScheme: scheme,
  };
  const groups: Record<string, string[]> = {
    canvas: ["background", "surface-dim"],
    surface: ["surface", "surface-container-lowest", "inverse-on-surface"],
    raised: [
      "surface-container",
      "surface-container-low",
      "surface-container-high",
      "surface-container-highest",
      "surface-bright",
      "surface-variant",
      "secondary-container",
    ],
    text: [
      "on-background",
      "on-surface",
      "on-secondary-container",
      "on-secondary",
      "on-tertiary-container",
    ],
    muted: ["on-surface-variant", "secondary", "outline"],
    border: ["outline-variant"],
    action: [
      "primary",
      "primary-fixed-dim",
      "primary-container",
      "primary-fixed",
      "surface-tint",
      "inverse-primary",
    ],
    onAction: [
      "on-primary",
      "on-primary-fixed",
      "on-primary-container",
      "on-primary-fixed-variant",
    ],
  };
  for (const [key, aliases] of Object.entries(groups))
    for (const alias of aliases)
      vars[`--color-${alias}`] = rgb(p[key as keyof typeof p] as string);
  const error = scheme === "light" ? "#B42318" : "#FFB4AB";
  vars["--color-error"] = rgb(error);
  vars["--color-on-error"] = rgb(scheme === "light" ? "#FFFFFF" : "#492A2B");
  vars["--color-error-container"] = rgb(
    scheme === "light" ? "#FFF0EE" : "#492A2B",
  );
  vars["--color-on-error-container"] = rgb(error);
  return vars as CSSProperties;
}
export function activeAsset(
  config: VisualConfig,
  assets: BrandAsset[],
  kind: "logo" | "icon",
  scheme: "light" | "dark",
) {
  const key =
    `${kind}${scheme === "dark" ? "Dark" : "Light"}` as keyof VisualConfig["assets"];
  const id =
    config.assets[key] ||
    config.assets[`${kind}Light` as keyof VisualConfig["assets"]];
  return assets.find((a) => a.id === id)?.url || null;
}
