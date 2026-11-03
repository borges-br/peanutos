"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { VisualConfig, normalizeVisualConfig, DEFAULT_VISUAL_CONFIG } from "@peanut/validators";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../lib/api";
import { BrandAsset, visualStyle } from "../lib/visual-brand";
import { applyAppearance } from "../lib/appearance";

const BrandContext = createContext<{
  config: VisualConfig | null;
  assets: BrandAsset[];
  scheme: "light" | "dark";
  source: "company" | "product";
  refresh: () => Promise<void>;
}>({ config: null, assets: [], scheme: "dark", source: "product", refresh: async () => {} });
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(),
    [config, setConfig] = useState<VisualConfig | null>(DEFAULT_VISUAL_CONFIG),
    [source, setSource] = useState<"company" | "product">("product"),
    [resolvedWorkspace, setResolvedWorkspace] = useState<string | undefined>(),
    [assets, setAssets] = useState<BrandAsset[]>([]),
    [scheme, setScheme] = useState<"light" | "dark">("dark");
  const workspaceId = user?.workspaceId;
  const currentWorkspace = useRef(workspaceId);
  currentWorkspace.current = workspaceId;
  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    const data = await apiRequest("/settings/visual/active");
    if (currentWorkspace.current !== workspaceId) return;
    setConfig(data.config ? normalizeVisualConfig(data.config) : DEFAULT_VISUAL_CONFIG);
    setSource(data.source || (data.version ? "company" : "product"));
    setAssets(data.assets || []);
    setResolvedWorkspace(workspaceId);
  }, [workspaceId]);
  useEffect(() => {
    let active = true;
    setConfig(workspaceId ? null : DEFAULT_VISUAL_CONFIG);
    setSource("product");
    setAssets([]);
    if (workspaceId)
      apiRequest("/settings/visual/active")
        .then((data) => {
          if (active) {
            setConfig(data.config ? normalizeVisualConfig(data.config) : DEFAULT_VISUAL_CONFIG);
            setSource(data.source || (data.version ? "company" : "product"));
            setAssets(data.assets || []);
            setResolvedWorkspace(workspaceId);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [workspaceId]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () =>
      setScheme(
        config?.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : config?.theme || "dark",
      );
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [config]);
  useEffect(() => {
    if (!config || (workspaceId && resolvedWorkspace !== workspaceId)) return;
    const root = document.documentElement,
      styles = visualStyle(config, scheme) as Record<string, string>;
    for (const [key, value] of Object.entries(styles))
      if (key !== "colorScheme") root.style.setProperty(key, value);
    root.style.colorScheme = scheme;
    root.dataset.visualBrand = "true";
    root.dataset.brandSource = source;
    root.dataset.visualScheme = scheme;
    root.dataset.brandDensity = config.interface.density;
    root.dataset.brandStatusColors = String(!!config[scheme].statusColors);
    if (user) applyAppearance(user);
    const previousTitle = document.title;
    document.title = config.name;
    return () => {
      for (const key of Object.keys(styles))
        if (key !== "colorScheme") root.style.removeProperty(key);
      root.style.removeProperty("color-scheme");
      delete root.dataset.visualBrand;
      delete root.dataset.visualScheme;
      delete root.dataset.brandDensity;
      delete root.dataset.brandSource;
      delete root.dataset.brandStatusColors;
      document.title = previousTitle;
    };
  }, [config, scheme, user, source, workspaceId, resolvedWorkspace]);
  return (
    <BrandContext.Provider value={{ config: workspaceId && resolvedWorkspace !== workspaceId ? null : config, assets, scheme, source, refresh }}>
      {children}
    </BrandContext.Provider>
  );
}
export const useBrand = () => useContext(BrandContext);
