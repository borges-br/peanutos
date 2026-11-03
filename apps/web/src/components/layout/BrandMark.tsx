"use client";
import React from "react";
import { useBrand } from "../../context/BrandContext";
import { activeAsset } from "../../lib/visual-brand";
import AuthenticatedImage from "../ui/AuthenticatedImage";
import { surfaceScheme } from "@peanut/validators";

export default function BrandMark({
  mobile = false,
  surface = "sidebar",
}: {
  mobile?: boolean;
  surface?: "sidebar" | "header";
}) {
  const { config, assets, scheme } = useBrand();
  if (!config)
    return <span aria-label="Carregando identidade" className="brand-initial" aria-busy="true">…</span>;
  const brandScheme = surfaceScheme(
    config[scheme][surface === "sidebar" ? "sidebar" : "surface"],
  );
  const icon = activeAsset(config, assets, "icon", brandScheme),
    logo = activeAsset(config, assets, "logo", brandScheme);
  const fallback = (
    <span className="brand-initial" aria-hidden="true">
      {config.name.slice(0, 1)}
    </span>
  );
  const compact = (
    <>
      <AuthenticatedImage
        src={icon}
        alt={mobile ? config.name : ""}
        fallback={fallback}
        style={{
          width: config.navigation.iconSize,
          height: config.navigation.iconSize,
          objectFit: "contain",
          flexShrink: 0,
          maxWidth: "none",
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
  if (mobile)
    return (
      <span
        className="workspace-brand-mobile"
        role="img"
        aria-label={config.name}
        style={{
          width: config.navigation.iconSize,
          minWidth: config.navigation.iconSize,
          height: config.navigation.iconSize,
        }}
      >
        {compact}
      </span>
    );
  return (
    <span
      className="workspace-brand"
      role="img"
      data-mode={config.navigation.mode}
      aria-label={config.name}
    >
      {logo && config.navigation.mode === "expanded" && (
        <span className="brand-expanded">
          <AuthenticatedImage
            src={logo}
            alt={config.name}
            style={{
              width: config.navigation.logoWidth,
              maxWidth: "100%",
              height: config.navigation.logoHeight,
              objectFit: "contain",
              objectPosition: `${config.customization.navigation.alignment} center`,
            }}
            fallback={<span>{config.name}</span>}
          />
        </span>
      )}
      <span
        className={`brand-compact ${logo && config.navigation.mode === "expanded" ? "brand-compact-responsive" : ""}`}
      >
        {compact}
      </span>
    </span>
  );
}
