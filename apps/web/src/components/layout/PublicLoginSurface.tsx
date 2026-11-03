"use client";
import React, { useEffect, useState } from "react";
import type { VisualConfig } from "@peanut/validators";
import { surfaceScheme } from "@peanut/validators";
import { brandFont } from "../../lib/visual-brand";
import AuthenticatedImage from "../ui/AuthenticatedImage";
import { useBrandFavicon } from "./BrandFavicon";

type Palette = Pick<
  VisualConfig["light"],
  | "canvas"
  | "surface"
  | "text"
  | "muted"
  | "border"
  | "action"
  | "onAction"
  | "sidebar"
> & { sidebarText?: string | null; fieldBorder?: string | null };
export type PublicLoginBrand = Pick<
  VisualConfig,
  "name" | "subtitle" | "font" | "theme" | "login"
> & {
  light: Palette;
  dark: Palette;
  radius: number;
  headingFont: string;
  logos: Record<
    "logoLight" | "logoDark" | "iconLight" | "iconDark",
    string | null
  >;
  artwork?: { light: string | null; dark: string | null };
  favicon?: string | null;
  heroTitle?: string;
  heroMessage?: string;
};
export default function PublicLoginSurface({
  brand,
  children,
  preview = false,
  authenticatedImages = false,
  title = "Acessar painel",
  message = "Entre com suas credenciais para continuar.",
}: {
  brand: PublicLoginBrand;
  children: React.ReactNode;
  preview?: boolean;
  authenticatedImages?: boolean;
  title?: string;
  message?: string;
}) {
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const change = () => setSystemDark(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const scheme =
    brand.theme === "system" ? (systemDark ? "dark" : "light") : brand.theme;
  const palette = brand[scheme];
  useBrandFavicon(brand.favicon, brand.name, authenticatedImages, !preview);
  const signature = (background: string) =>
    surfaceScheme(background) === "dark"
      ? brand.logos.logoDark || brand.logos.logoLight
      : brand.logos.logoLight || brand.logos.logoDark;
  const icon = (background: string) =>
    surfaceScheme(background) === "dark"
      ? brand.logos.iconDark || brand.logos.iconLight
      : brand.logos.iconLight || brand.logos.iconDark;
  const image = (src: string | null, className: string) =>
    src ? (
      authenticatedImages ? (
        <AuthenticatedImage src={src} alt={brand.name} className={className} />
      ) : (
        <img src={src} alt={brand.name} className={className} />
      )
    ) : (
      <span className="brand-login-name">{brand.name}</span>
    );
  const style = {
    "--login-canvas": palette.canvas,
    "--login-surface": palette.surface,
    "--login-text": palette.text,
    "--login-muted": palette.muted,
    "--login-border": palette.border,
    "--login-field-border": palette.fieldBorder || palette.border,
    "--login-action": palette.action,
    "--login-on-action": palette.onAction,
    "--login-hero": palette.sidebar,
    "--login-hero-ink":
      palette.sidebarText || (surfaceScheme(palette.sidebar) === "dark" ? "#F4F7FA" : "#1E2A38"),
    "--login-radius": `${brand.radius}px`,
    "--login-logo-width": `${brand.login.logoWidth}px`,
    "--login-logo-height": `${brand.login.logoHeight}px`,
    "--login-font": brandFont(brand.font),
    "--login-heading-font": brandFont(
      brand.headingFont === "inherit" ? brand.font : brand.headingFont,
    ),
  } as React.CSSProperties;
  return (
    <div
      className={`brand-login-surface ${preview ? "is-preview" : ""}`}
      style={style}
      data-layout={brand.login.layout}
    >
      <div className="brand-login-layout">
        {brand.login.layout === "split" && (
          <section
            className="brand-login-hero"
            aria-label={`Identidade ${brand.name}`}
          >
            <div className="brand-login-hero-content">
              {image(signature(palette.sidebar), "brand-login-signature")}
              {brand.heroTitle && <h2>{brand.heroTitle}</h2>}
              {brand.heroMessage && <p>{brand.heroMessage}</p>}
              {brand.login.showSubtitle && brand.subtitle && (
                <p>{brand.subtitle}</p>
              )}
            </div>
            {brand.artwork?.[scheme] && image(brand.artwork[scheme], "brand-login-artwork")}
          </section>
        )}
        <div className="brand-login-main">
          <section className="brand-login-card">
            <header>
              <div className="brand-login-card-logo">
                {image(signature(palette.surface), "brand-login-signature")}
              </div>
              <div className="brand-login-mobile-logo">
                {image(icon(palette.surface), "brand-login-icon")}
              </div>
              <h1>{brand.login.title || title}</h1>
              <p>{brand.login.message || message}</p>
            </header>
            {children}
          </section>
          <footer>
            © {new Date().getFullYear()} {brand.name}
          </footer>
        </div>
      </div>
    </div>
  );
}
