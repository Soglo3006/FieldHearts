"use client";

import type { ReactNode, RefObject } from "react";
import { Card } from "@/components/ui/card";
import { useScrollLock } from "@/hooks/useScrollLock";

export interface OverlayModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** When set, attaches to the inner scroll container (e.g. Settings scroll restore). */
  scrollRef?: RefObject<HTMLDivElement | null>;
  /** Tailwind max-width class, e.g. max-w-3xl */
  maxWidthClassName?: string;
}

/**
 * Shell aligné sur SupportModal : overlay plein écran, fond séparé, panneau Card centré,
 * scroll interne (bordures stables), useScrollLock sur le document.
 */
export function OverlayModal({
  open,
  onClose,
  children,
  scrollRef,
  maxWidthClassName = "max-w-3xl",
}: OverlayModalProps) {
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <Card
        className={`relative z-10 flex w-full ${maxWidthClassName} min-h-[min(75dvh,calc(100dvh-3rem))] max-h-[min(90dvh,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-lg animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
        >
          {children}
        </div>
      </Card>
    </div>
  );
}
