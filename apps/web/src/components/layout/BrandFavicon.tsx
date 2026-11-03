"use client";
import { useEffect } from "react";
import { apiBlobRequest } from "../../lib/api";
import { useBrand } from "../../context/BrandContext";
import { useAuth } from "../../context/AuthContext";
import { faviconAsset } from "../../lib/visual-brand";

export function useBrandFavicon(
  src: string | null | undefined,
  name: string,
  authenticated = false,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    let active = true,
      blobUrl: string | null = null;
    const previous = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>(
        'link[rel="icon"],link[rel="shortcut icon"]',
      ),
    );
    previous.forEach((link) => link.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    const initial = name.slice(0, 1).replace(/[<>&"']/g, "");
    // A company without a chosen icon receives its initial, never PeanutOS art.
    link.href =
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#52617A"/><text x="32" y="44" text-anchor="middle" font-size="40" fill="white">${initial}</text></svg>`,
      );
    document.head.appendChild(link);
    if (src) {
      if (authenticated && !src.startsWith("/brand/peanut-os/")) {
        apiBlobRequest(src)
          .then((blob) => {
            if (active) {
              blobUrl = URL.createObjectURL(blob);
              link.href = blobUrl;
            }
          })
          .catch(() => {});
      } else link.href = src;
    }
    return () => {
      active = false;
      link.remove();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      previous.forEach((old) => document.head.appendChild(old));
    };
  }, [src, name, authenticated, enabled]);
}
export default function BrandFavicon() {
  const { config, assets, scheme } = useBrand();
  const { user } = useAuth();
  const src = config && user ? faviconAsset(config, assets, scheme) : undefined;
  useBrandFavicon(src, config?.name || "Peanut OS", !!user, !!user && !!config);
  return null;
}
