'use client';

import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import Button from './Button';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response?: any) => void;
  uploadUrl?: string;
  title?: string;
  aspect?: number;
  cropShape?: 'rect' | 'round';
  buttonLabel?: string;
  icon?: string;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.95);
  });
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  uploadUrl = '/users/me/avatar',
  title = 'Alterar Foto de Perfil',
  aspect = 1,
  cropShape = 'round',
  buttonLabel = 'Salvar foto',
  icon = 'account_circle',
}) => {
  const { refreshUser } = useAuth();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('image/jpeg');

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Formato não suportado. Use PNG, JPEG ou WebP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Arquivo muito grande. Limite de 2 MB.');
      return;
    }

    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setLoading(true);
    setError(null);

    try {
      // Crop the image to obtain base64
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      const pureBase64 = croppedBase64.replace(/^data:[^;]+;base64,/, '');

      const response = await apiRequest(uploadUrl, {
        method: 'POST',
        body: JSON.stringify({
          data: pureBase64,
          mimeType: fileType,
          filename: fileName || 'image.jpg',
        }),
      });

      // Refresh global user state to update sidebar and avatar images instantly if it's the user's avatar
      if (uploadUrl === '/users/me/avatar') {
        await refreshUser();
      }

      if (onSuccess) onSuccess(response);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-md select-none">
      <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
        {/* Modal Header */}
        <div className="p-lg border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-title-md text-on-surface font-bold flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">{icon}</span>
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-lg space-y-md flex flex-col items-center">
          {error && (
            <div className="w-full bg-error-container/10 border border-error/20 text-error p-sm rounded text-[12px] flex items-center gap-sm">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <p>{error}</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {!imageSrc ? (
            <div className="w-full py-xl flex flex-col items-center justify-center gap-md border-2 border-dashed border-outline-variant rounded-xl bg-surface-container/20 hover:bg-surface-container/30 transition-all cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              <span className="material-symbols-outlined text-5xl text-outline-variant">cloud_upload</span>
              <div className="text-center space-y-xs">
                <p className="font-body-md text-on-surface font-semibold text-[13px]">
                  Clique para selecionar uma imagem
                </p>
                <p className="text-[11px] text-on-surface-variant/70">
                  Formatos suportados: PNG, JPEG ou WebP (Máx. 2 MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-md flex flex-col items-center">
              {/* Cropper Container */}
              <div className="relative w-full h-[260px] bg-black/40 rounded-xl overflow-hidden border border-outline-variant">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  cropShape={cropShape}
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Slider for Zoom */}
              <div className="w-full flex items-center gap-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-primary h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
                />
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </div>

              {/* Replace image link */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[12px] text-primary hover:underline flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[14px]">cached</span>
                Escolher outro arquivo
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-lg bg-surface-container/20 border-t border-outline-variant flex justify-end gap-sm">
          <Button variant="ghost" onClick={handleClose} disabled={loading} className="text-xs">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={loading || !imageSrc}
            loading={loading}
            className="text-xs px-lg"
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
