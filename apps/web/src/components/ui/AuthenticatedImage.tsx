'use client';

import React, { useState, useEffect } from 'react';
import { apiBlobRequest } from '../../lib/api';

interface AuthenticatedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, fallback, ...props }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setBlobUrl(null);
      setLoading(false);
      setError(true);
      return;
    }

    let active = true;
    let currentUrl: string | null = null;

    setLoading(true);
    setError(false);

    apiBlobRequest(src)
      .then((blob) => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load authenticated image:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [src]);

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
    return <>{fallback || null}</>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={blobUrl} alt={props.alt || ''} {...props} />;
};

export default AuthenticatedImage;
