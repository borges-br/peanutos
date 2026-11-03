import { DEFAULT_VISUAL_CONFIG, VisualConfig } from "@peanut/validators";
import type { PublicLoginBrand } from "../components/layout/PublicLoginSurface";
import {
  activeAsset,
  artworkAsset,
  faviconAsset,
  BrandAsset,
} from "./visual-brand";

export function publicLoginBrand(
  config: VisualConfig,
  assets: BrandAsset[] = [],
): PublicLoginBrand {
  return {
    ...config,
    radius: config.interface.radius,
    headingFont: config.customization.typography.headingFont,
    logos: {
      logoLight: activeAsset(config, assets, "logo", "light"),
      logoDark: activeAsset(config, assets, "logo", "dark"),
      iconLight: activeAsset(config, assets, "icon", "light"),
      iconDark: activeAsset(config, assets, "icon", "dark"),
    },
    artwork: {
      light: artworkAsset(config, assets, "light"),
      dark: artworkAsset(config, assets, "dark"),
    },
    heroTitle: config.media.heroTitle,
    heroMessage: config.media.heroMessage,
    favicon: faviconAsset(config, assets, "light"),
  };
}
export const DEFAULT_PUBLIC_LOGIN_BRAND = publicLoginBrand(
  DEFAULT_VISUAL_CONFIG,
);
