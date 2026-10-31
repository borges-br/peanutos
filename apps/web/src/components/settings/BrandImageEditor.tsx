"use client";
import React, { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { apiBlobRequest, apiRequest } from "../../lib/api";
import { BrandAsset } from "../../lib/visual-brand";
import Button from "../ui/Button";

export default function BrandImageEditor({
  asset,
  onClose,
  onSaved,
}: {
  asset: BrandAsset | null;
  onClose: () => void;
  onSaved: (asset: BrandAsset) => void;
}) {
  const [src, setSrc] = useState(""),
    [original, setOriginal] = useState(""),
    [mime, setMime] = useState("image/png"),
    [filename, setFilename] = useState("marca.png"),
    [title, setTitle] = useState(asset?.title || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 }),
    [zoom, setZoom] = useState(1),
    [area, setArea] = useState<any>(null),
    [cropping, setCropping] = useState(false),
    [ratio, setRatio] = useState(1),
    [naturalRatio, setNaturalRatio] = useState(1),
    [output, setOutput] = useState(1600);
  const [transformed, setTransformed] = useState(false),
    [sourceAssetId, setSourceAssetId] = useState<string | null>(
      asset?.id || null,
    );
  const dialog = useRef<HTMLDivElement>(null);
  function load(
    url: string,
    type: string,
    name: string,
    parent: string | null = null,
  ) {
    setSrc(url);
    setOriginal(url);
    setMime(type);
    setFilename(name);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropping(false);
    setTransformed(false);
    setArea(null);
    setSourceAssetId(parent);
    const image = new Image();
    image.onload = () => {
      setNaturalRatio(image.width / image.height);
      setRatio(image.width / image.height);
    };
    image.src = url;
  }
  useEffect(() => {
    if (!asset) return;
    let active = true;
    apiBlobRequest(asset.url)
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (active)
            load(
              String(reader.result),
              blob.type,
              `${asset.title}.${blob.type === "image/svg+xml" ? "svg" : blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"}`,
              asset.id,
            );
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => setError("Não foi possível abrir a imagem."));
    return () => {
      active = false;
    };
  }, [asset]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const nodes = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select",
          ) || [],
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [busy, onClose]);
  async function transform(action: "rotate" | "mirror") {
    if (busy || mime === "image/svg+xml") return;
    setBusy(true);
    setError("");
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
      });
      const factor = Math.min(1, 4096 / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * factor)),
        height = Math.max(1, Math.round(image.height * factor));
      const canvas = document.createElement("canvas");
      canvas.width = action === "rotate" ? height : width;
      canvas.height = action === "rotate" ? width : height;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      if (action === "rotate") ctx.rotate(Math.PI / 2);
      else ctx.scale(-1, 1);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      setSrc(canvas.toDataURL("image/png"));
      setTransformed(true);
      setCropping(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setArea(null);
      setNaturalRatio(canvas.width / canvas.height);
      setRatio(canvas.width / canvas.height);
    } catch {
      setError(
        "Não foi possível ajustar a imagem. Tente selecionar o arquivo novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      let data = original,
        type = mime,
        name = filename;
      const changed =
        mime !== "image/svg+xml" && ((cropping && area) || transformed);
      if (changed) {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = src;
        });
        const selection =
          cropping && area
            ? area
            : { x: 0, y: 0, width: image.width, height: image.height };
        const factor = Math.min(
          1,
          output / Math.max(selection.width, selection.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(selection.width * factor));
        canvas.height = Math.max(1, Math.round(selection.height * factor));
        canvas
          .getContext("2d")!
          .drawImage(
            image,
            selection.x,
            selection.y,
            selection.width,
            selection.height,
            0,
            0,
            canvas.width,
            canvas.height,
          );
        data = canvas.toDataURL("image/png");
        type = "image/png";
        name =
          filename.replace(/\.[^.]+$/, "") +
          (cropping ? "-recorte.png" : "-variacao.png");
      }
      let parentAssetId = sourceAssetId;
      if (changed && !parentAssetId) {
        const preserved = await apiRequest<BrandAsset>(
          "/settings/visual/assets",
          {
            method: "POST",
            body: JSON.stringify({
              title: `${title.trim().slice(0, 109)} · original`,
              filename,
              mimeType: mime,
              data: original,
              parentAssetId: null,
            }),
          },
        );
        parentAssetId = preserved.id;
        setSourceAssetId(preserved.id);
        onSaved(preserved);
      }
      const saved = await apiRequest<BrandAsset>("/settings/visual/assets", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          filename: name,
          mimeType: type,
          data,
          parentAssetId,
        }),
      });
      onSaved(saved);
      onClose();
    } catch (e: any) {
      setError(e.message || "Falha ao salvar imagem.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="brand-editor-backdrop">
      <div
        className="brand-image-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Editar imagem da marca"
        ref={dialog}
        tabIndex={-1}
      >
        <div className="brand-studio-header">
          <div>
            <h2 className="text-lg font-semibold">
              {asset
                ? "Criar variação da imagem"
                : "Adicionar imagem à biblioteca"}
            </h2>
            <p className="brand-hint">
              O original é preservado. Você escolhe onde usar cada imagem.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar editor"
          >
            Fechar
          </Button>
        </div>
        <fieldset className="brand-image-fields" disabled={busy}>
          <label className="brand-field">
            Arquivo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  setError("Use uma imagem de até 2 MB.");
                  return;
                }
                if (
                  ![
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                    "image/svg+xml",
                  ].includes(file.type)
                ) {
                  setError("Selecione SVG, PNG, JPEG ou WebP.");
                  return;
                }
                setError("");
                const reader = new FileReader();
                reader.onload = () =>
                  load(String(reader.result), file.type, file.name);
                reader.readAsDataURL(file);
                if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
              }}
            />
          </label>
          <label className="brand-field">
            Nome na biblioteca
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ex.: assinatura para fundo claro"
            />
          </label>
          {src && (
            <>
              <div className="brand-image-canvas">
                {cropping && mime !== "image/svg+xml" ? (
                  <Cropper
                    image={src}
                    crop={crop}
                    zoom={zoom}
                    aspect={ratio}
                    objectFit="contain"
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, pixels) => setArea(pixels)}
                  />
                ) : (
                  <img src={src} alt="Imagem selecionada" />
                )}
              </div>
              {mime === "image/svg+xml" ? (
                <p className="brand-hint">
                  Vetor preservado. Ajuste escala e respiro no layout, sem
                  converter o logo em fotografia.
                </p>
              ) : (
                <>
                  <div className="brand-studio-actions">
                    <Button
                      variant="outline"
                      onClick={() => transform("rotate")}
                    >
                      Girar 90°
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => transform("mirror")}
                    >
                      Espelhar horizontalmente
                    </Button>
                  </div>
                  <label className="flex gap-2 items-center text-sm">
                    <input
                      type="checkbox"
                      checked={cropping}
                      onChange={(e) => setCropping(e.target.checked)}
                    />
                    Recortar e redimensionar
                  </label>
                  {(cropping || transformed) && (
                    <div className="brand-two">
                      {cropping && (
                        <>
                          <label className="brand-field">
                            Proporção
                            <select
                              aria-label="Proporção"
                              value={ratio}
                              onChange={(e) => {
                                setRatio(Number(e.target.value));
                                setCrop({ x: 0, y: 0 });
                              }}
                            >
                              <option value={naturalRatio}>
                                Proporção original
                              </option>
                              {naturalRatio !== 1 && (
                                <option value={1}>Quadrada</option>
                              )}
                              <option value={3}>Horizontal 3:1</option>
                              <option value={16 / 9}>Horizontal 16:9</option>
                              <option value={0.75}>Vertical 3:4</option>
                            </select>
                          </label>
                        </>
                      )}
                      <label className="brand-field">
                        Maior lado da saída
                        <select
                          value={output}
                          onChange={(e) => setOutput(Number(e.target.value))}
                        >
                          <option value={512}>Até 512 px</option>
                          <option value={1024}>Até 1024 px</option>
                          <option value={1600}>Até 1600 px</option>
                          <option value={2048}>Até 2048 px</option>
                        </select>
                      </label>
                      {cropping && (
                        <label className="brand-field">
                          Zoom {zoom.toFixed(1)}×
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="brand-notice brand-error">
            {error}
          </p>
        )}
        <div className="brand-studio-actions">
          <Button
            onClick={save}
            loading={busy}
            disabled={!src || !title.trim() || (cropping && !area)}
          >
            Salvar na biblioteca
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              load(original, mime, filename, sourceAssetId);
            }}
            disabled={!src || busy}
          >
            Restaurar original
          </Button>
        </div>
      </div>
    </div>
  );
}
