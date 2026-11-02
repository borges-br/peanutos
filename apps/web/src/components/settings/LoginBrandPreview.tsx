"use client";
import React, { useEffect, useRef, useState } from "react";
import type { VisualConfig } from "@peanut/validators";
import type { BrandAsset } from "../../lib/visual-brand";
import PublicLoginSurface from "../layout/PublicLoginSurface";

export default function LoginBrandPreview({
  config,
  assets,
}: {
  config: VisualConfig;
  assets: BrandAsset[];
}) {
  const [mobile, setMobile] = useState(false),
    [available, setAvailable] = useState(640);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailable(entry!.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const width = mobile ? 390 : 1100,
    height = mobile ? 720 : 620;
  const scale = Math.min(1, available / width);
  const logos = Object.fromEntries(
    Object.entries(config.assets).map(([slot, id]) => [
      slot,
      assets.find((a) => a.id === id)?.url || null,
    ]),
  ) as Record<keyof VisualConfig["assets"], string | null>;
  return (
    <div className="space-y-sm">
      <div
        className="segmented-control"
        aria-label="Formato da prévia do login"
      >
        <button
          type="button"
          aria-pressed={!mobile}
          onClick={() => setMobile(false)}
        >
          Computador
        </button>
        <button
          type="button"
          aria-pressed={mobile}
          onClick={() => setMobile(true)}
        >
          Celular
        </button>
      </div>
      <div
        ref={viewport}
        className={`brand-login-preview-viewport ${mobile ? "is-phone" : ""}`}
        style={{ height: height * scale }}
      >
        <div
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <PublicLoginSurface
            preview
            authenticatedImages
            brand={{
              ...config,
              logos,
              radius: config.interface.radius,
              headingFont: config.customization.typography.headingFont,
            }}
          >
            <div
              className="brand-login-preview-form"
              aria-label="Exemplo do formulário de acesso"
            >
              <label>
                E-mail
                <input disabled placeholder="usuario@empresa.com" />
              </label>
              <label>
                Senha
                <input disabled placeholder="••••••••" />
              </label>
              <button type="button" disabled>
                Entrar
              </button>
              <small>Prévia visual. Este formulário não realiza login.</small>
            </div>
          </PublicLoginSurface>
        </div>
      </div>
    </div>
  );
}
