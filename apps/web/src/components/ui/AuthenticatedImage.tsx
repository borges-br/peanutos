'use client';

import React, { useState, useEffect } from 'react';
import { apiBlobRequest } from '../../lib/api';

interface AuthenticatedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
  onLoadError?: (err: Error) => void;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, fallback, onLoadError, ...props }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setBlobUrl(null);
      setLoading(false);
      setError(false);
      setErrorDetail(null);
      return;
    }

    let active = true;
    let currentUrl: string | null = null;

    setLoading(true);
    setError(false);
    setErrorDetail(null);

    apiBlobRequest(src)
      .then((blob) => {
        if (!active) return;

        // Validate that we got an actual image and not an error response
        if (blob.size === 0) {
          throw new Error('Empty response from server');
        }

        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err?.message || 'Unknown error';
        console.error(`[AuthenticatedImage] Failed to load "${src}":`, msg);
        if (active) {
          setError(true);
          setErrorDetail(msg);
          setLoading(false);
          onLoadError?.(err);
        }
      });

    return () => {
      active = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [src, onLoadError]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-container/20 rounded animate-pulse ${props.className || ''}`}
        style={props.style}
      >
        <div className="w-4 h-4 rounded-full border border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    // In dev, show a visual hint about the error for debugging
    if (error && errorDetail && process.env.NODE_ENV === 'development') {
      return (
        <>
          {fallback || (
            <div
              className={`flex items-center justify-center bg-error-container/10 border border-error/20 rounded ${props.className || ''}`}
              style={props.style}
              title={`Image load failed: ${errorDetail}`}
            >
              <span className="material-symbols-outlined text-error/40 text-sm">broken_image</span>
            </div>
          )}
        </>
      );
    }
    return <>{fallback || null}</>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={blobUrl} alt={props.alt || ''} {...props} />;
};

export default AuthenticatedImage;
