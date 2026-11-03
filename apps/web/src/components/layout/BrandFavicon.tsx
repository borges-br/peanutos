"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
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
    const previous = new Map<
      HTMLLinkElement,
      { href: string | null; type: string | null }
    >();
    let ownedLink: HTMLLinkElement | null = null;
    const initial = name.slice(0, 1).replace(/[<>&"']/g, "");
    // A company without a chosen icon receives its initial, never PeanutOS art.
    let href =
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#52617A"/><text x="32" y="44" text-anchor="middle" font-size="40" fill="white">${initial}</text></svg>`,
      );
    let type = "image/svg+xml";
    const apply = () => {
      if (!active) return;
      let links = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>(
          'link[rel="icon"],link[rel="shortcut icon"]',
        ),
      );
      if (!links.length) {
        ownedLink ||= document.createElement("link");
        ownedLink.rel = "icon";
        document.head.appendChild(ownedLink);
        links = [ownedLink];
      }
      for (const link of links) {
        // Next.js owns its metadata nodes. Change attributes, never detach them.
        if (link !== ownedLink && !previous.has(link))
          previous.set(link, {
            href: link.getAttribute("href"),
            type: link.getAttribute("type"),
          });
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
        if (type && link.getAttribute("type") !== type)
          link.setAttribute("type", type);
        if (!type && link.hasAttribute("type")) link.removeAttribute("type");
      }
    };
    apply();
    // Navigation can replace metadata nodes while this root component stays mounted.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "type", "rel"],
    });
    if (src) {
      if (authenticated && !src.startsWith("/brand/peanut-os/")) {
        apiBlobRequest(src)
          .then((blob) => {
            if (active) {
              blobUrl = URL.createObjectURL(blob);
              href = blobUrl;
              type = blob.type;
              apply();
            }
          })
          .catch(() => {});
      } else {
        href = src;
        type = src.endsWith(".svg")
          ? "image/svg+xml"
          : src.endsWith(".ico")
            ? "image/x-icon"
            : "";
        apply();
      }
    }
    return () => {
      active = false;
      observer.disconnect();
      ownedLink?.remove();
      previous.forEach((attributes, link) => {
        if (!link.isConnected) return;
        for (const [name, value] of Object.entries(attributes))
          if (value === null) link.removeAttribute(name);
          else link.setAttribute(name, value);
      });
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src, name, authenticated, enabled]);
}
export default function BrandFavicon() {
  const { config, assets, scheme } = useBrand();
  const { user } = useAuth();
  const pathname = usePathname();
  const src = config && user ? faviconAsset(config, assets, scheme) : undefined;
  useBrandFavicon(
    src,
    config?.name || "Peanut OS",
    !!user,
    !!user && !!config && pathname !== "/login",
  );
  return null;
}
