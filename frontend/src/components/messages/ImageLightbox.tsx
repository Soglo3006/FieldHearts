"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollLock } from "@/hooks/useScrollLock";
import AppImage from '@/components/ui/AppImage';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.25;

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
  // next/image declares a fixed 1600x1200, so a portrait photo would be letterboxed
  // inside a 4:3 box and those dark bands would swallow backdrop clicks. Sizing the
  // element to the real ratio makes it hug the photo, leaving the rest clickable.
  const [ratio, setRatio] = useState<number | null>(null);

  // Zoom: wheel or toolbar buttons on desktop, two-finger pinch on touch.
  // One finger pans once zoomed in, on either.
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  const zoomTo = (value: number) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))));
    setScale(next);
    // Recentre when back to natural size, otherwise the photo stays off to a side.
    if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
  };

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const startPointer = (e: React.PointerEvent<HTMLImageElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // A second finger turns the gesture into a pinch, so stop panning.
      pinchStart.current = { distance: pinchDistance(), scale };
      dragOrigin.current = null;
      setDragging(false);
    } else if (pointers.current.size === 1 && scale > MIN_SCALE) {
      dragOrigin.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      setDragging(true);
    }
  };

  const movePointer = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const { distance, scale: startScale } = pinchStart.current;
      if (distance > 0) zoomTo(startScale * (pinchDistance() / distance));
      return;
    }

    if (dragOrigin.current) {
      setOffset({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLImageElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      dragOrigin.current = null;
      setDragging(false);
    }
  };

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
      onWheel={(e) => zoomTo(scale + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP))}
    >
      <div
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => zoomTo(scale - ZOOM_STEP)}
          disabled={scale === MIN_SCALE}
          aria-label={t('common.zoomOut')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => zoomTo(scale + ZOOM_STEP)}
          disabled={scale === MAX_SCALE}
          aria-label={t('common.zoomIn')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
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

      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        <AppImage
          src={src}
          alt={t('messages.imagePreview')}
          width={1600}
          height={1200}
          unoptimized={src.includes("/chat-attachments/")}
          onError={() => setFailedUrl(imageUrl)}
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
          }}
          style={{
            ...(ratio ? { aspectRatio: String(ratio), width: "auto", height: "auto" } : {}),
            transform:
              scale === MIN_SCALE
                ? undefined
                : `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: scale === MIN_SCALE ? "zoom-in" : dragging ? "grabbing" : "grab",
            // Without this the browser claims the gesture and pans/zooms the page.
            touchAction: "none",
          }}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => zoomTo(scale > MIN_SCALE ? MIN_SCALE : 2)}
          onPointerDown={startPointer}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        />
      </div>
    </div>
  );
}
