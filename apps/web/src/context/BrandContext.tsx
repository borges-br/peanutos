"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { VisualConfig, normalizeVisualConfig } from "@peanut/validators";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../lib/api";
import { BrandAsset, visualStyle } from "../lib/visual-brand";
import { applyAppearance } from "../lib/appearance";

const BrandContext = createContext<{
  config: VisualConfig | null;
  assets: BrandAsset[];
  scheme: "light" | "dark";
  refresh: () => Promise<void>;
}>({ config: null, assets: [], scheme: "dark", refresh: async () => {} });
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(),
    [config, setConfig] = useState<VisualConfig | null>(null),
    [assets, setAssets] = useState<BrandAsset[]>([]),
    [scheme, setScheme] = useState<"light" | "dark">("dark");
  const workspaceId = user?.workspaceId;
  const currentWorkspace = useRef(workspaceId);
  currentWorkspace.current = workspaceId;
  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    const data = await apiRequest("/settings/visual/active");
    if (currentWorkspace.current !== workspaceId) return;
    setConfig(data.config ? normalizeVisualConfig(data.config) : null);
    setAssets(data.assets || []);
  }, [workspaceId]);
  useEffect(() => {
    let active = true;
    setConfig(null);
    setAssets([]);
    if (workspaceId)
      apiRequest("/settings/visual/active")
        .then((data) => {
          if (active) {
            setConfig(data.config ? normalizeVisualConfig(data.config) : null);
            setAssets(data.assets || []);
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
    if (!config) return;
    const root = document.documentElement,
      styles = visualStyle(config, scheme) as Record<string, string>;
    for (const [key, value] of Object.entries(styles))
      if (key !== "colorScheme") root.style.setProperty(key, value);
    root.style.colorScheme = scheme;
    root.dataset.visualBrand = "true";
    root.dataset.visualScheme = scheme;
    root.dataset.brandDensity = config.interface.density;
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
      document.title = previousTitle;
    };
  }, [config, scheme, user]);
  return (
    <BrandContext.Provider value={{ config, assets, scheme, refresh }}>
      {children}
    </BrandContext.Provider>
  );
}
export const useBrand = () => useContext(BrandContext);
