"use client";

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollLock } from "@/hooks/useScrollLock";
import AppImage from '@/components/ui/AppImage';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string;
  /** Used when imageUrl fails to load, e.g. a full-size version that was never stored. */
  fallbackImageUrl?: string;
  onClose: () => void;
}

export function ImageLightbox({ imageUrl, fallbackImageUrl, onClose }: ImageLightboxProps) {
  const { t } = useTranslation();
  // Remembers which URL failed rather than mirroring the prop into state, so a
  // new imageUrl is retried on its own instead of inheriting a stale fallback.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = failedUrl === imageUrl && fallbackImageUrl ? fallbackImageUrl : imageUrl;
  useScrollLock(true);

  // Fermer avec Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'image';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('messages.imagePreview')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDownload}
          aria-label={t('messages.downloadImage')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AppImage
          src={src}
          alt={t('messages.imagePreview')}
          width={1600}
          height={1200}
          unoptimized={src.includes("/chat-attachments/")}
          onError={() => setFailedUrl(imageUrl)}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
