"use client";

import type { ReactNode, RefObject } from "react";
import { Card } from "@/components/ui/card";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

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
  maxWidthClassName = "max-w-full sm:max-w-3xl",
}: OverlayModalProps) {
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <Card
        className={cn(
          "relative z-10 flex w-full min-w-0 flex-col gap-0 overflow-hidden rounded-t-2xl sm:rounded-xl border p-0 shadow-lg",
          "animate-in fade-in zoom-in-95 duration-200",
          "max-h-[min(92dvh,calc(100dvh-1rem))] sm:max-h-[min(90dvh,calc(100dvh-2rem))]",
          "min-h-[min(75dvh,calc(100dvh-3rem))]",
          maxWidthClassName,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={scrollRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain"
        >
          {children}
        </div>
      </Card>
    </div>
  );
}
