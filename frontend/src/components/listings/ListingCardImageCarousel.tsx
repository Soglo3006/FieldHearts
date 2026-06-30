"use client";

import { useState, useRef, useEffect, type MouseEvent, type TouchEvent, type TransitionEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Grid3x3 } from "lucide-react";
import AppImage from "@/components/ui/AppImage";
import { cn } from "@/lib/utils";

export function getListingGalleryUrls(
  image_urls?: string[] | null,
  image_url?: string | null
): string[] {
  const filtered = (image_urls ?? []).filter((u): u is string => Boolean(u));
  const ordered = filtered.length > 0 ? filtered : image_url?.trim() ? [image_url.trim()] : [];
  return [...new Set(ordered)];
}

type ListingCardImageCarouselProps = {
  urls: string[];
  alt: string;
  sizes: string;
  priority?: boolean;
};

type ListingCardImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

function ListingCardImage({ src, alt, sizes, priority = false, className }: ListingCardImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className="relative h-full w-full">
      {!loaded && !errored && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse motion-reduce:animate-none" aria-hidden />
      )}
      {!errored ? (
        <AppImage
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={cn(
            "object-cover transition-opacity duration-300 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Grid3x3 className="h-12 w-12 text-gray-300" aria-hidden />
        </div>
      )}
    </div>
  );
}

/**
 * Extended track: [clone of last, ...urls, clone of first] so "next" from last
 * always animates left (negative translate), and "prev" from first animates right.
 */
function buildExtendedUrls(urls: string[]): string[] {
  const n = urls.length;
  if (n < 2) return urls;
  return [urls[n - 1]!, ...urls, urls[0]!];
}

export function ListingCardImageCarousel({
  urls,
  alt,
  sizes,
  priority = false,
}: ListingCardImageCarouselProps) {
  const n = urls.length;
  /** Physical slide index on extended track (0..n+1), starts at first real slide */
  const { t } = useTranslation();
  const [physical, setPhysical] = useState(1);
  const [disableTransition, setDisableTransition] = useState(false);
  const [dragPx, setDragPx] = useState(0);
  const physicalRef = useRef(physical);
  const touchStartXRef = useRef<number | null>(null);
  const touchDraggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    physicalRef.current = physical;
  }, [physical]);

  const goDelta = (delta: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (n <= 1 || disableTransition) return;

    setDisableTransition(false);
    if (delta === 1) {
      setPhysical((p) => {
        if (p >= n + 1) return p;
        return p + 1;
      });
    } else {
      setPhysical((p) => {
        if (p <= 0) return p;
        return p - 1;
      });
    }
  };

  const goTo = (logical: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (n <= 1 || disableTransition) return;
    setDisableTransition(false);
    setPhysical(logical + 1);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (n <= 1) return;
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchDraggingRef.current = true;
    setDisableTransition(true);
    setDragPx(0);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchDraggingRef.current || touchStartXRef.current == null) return;
    const currentX = e.touches[0]?.clientX ?? touchStartXRef.current;
    setDragPx(currentX - touchStartXRef.current);
  };

  const handleTouchEnd = () => {
    if (!touchDraggingRef.current) return;
    touchDraggingRef.current = false;

    const threshold = 40;
    const delta = dragPx;
    setDragPx(0);
    setDisableTransition(false);

    if (delta <= -threshold) {
      setPhysical((p) => (p >= n + 1 ? p : p + 1));
      return;
    }
    if (delta >= threshold) {
      setPhysical((p) => (p <= 0 ? p : p - 1));
    }
  };

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform") return;
    const cur = physicalRef.current;
    if (cur === n + 1) {
      setDisableTransition(true);
      setPhysical(1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDisableTransition(false));
      });
    } else if (cur === 0) {
      setDisableTransition(true);
      setPhysical(n);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDisableTransition(false));
      });
    }
  };

  if (n === 0) return null;

  if (n === 1) {
    return (
      <ListingCardImage
        src={urls[0]!}
        alt={alt}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  const extended = buildExtendedUrls(urls);
  const total = extended.length;
  const trackWidth = trackRef.current?.clientWidth ?? 0;
  const dragPercent = trackWidth > 0 ? (dragPx / trackWidth) * (100 / total) : 0;

  const logicalActive =
    physical === 0 ? n - 1 : physical === n + 1 ? 0 : physical - 1;

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={trackRef}
          className={cn(
            "flex h-full ease-out motion-reduce:transition-none",
            !disableTransition && "transition-transform duration-300 motion-reduce:transition-none",
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            width: `${total * 100}%`,
            transform: `translateX(calc(-${(physical * 100) / total}% + ${dragPercent}%))`,
            touchAction: "pan-y",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extended.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative h-full shrink-0"
              style={{ width: `${100 / total}%` }}
            >
              <ListingCardImage
                src={url}
                alt={i === 1 ? alt : ""}
                sizes={sizes}
                priority={priority && i === 1}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1 sm:gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-[2px] pointer-events-auto">
          {urls.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} / ${n}`}
              aria-current={i === logicalActive ? "true" : undefined}
              onClick={goTo(i)}
              className="rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
            >
              <span
                className={cn(
                  "block h-1.5 w-1.5 rounded-full transition-[opacity,transform]",
                  i === logicalActive ? "bg-white opacity-100 scale-100" : "bg-white/50 opacity-80 scale-90"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label={t("common.previous")}
        onClick={goDelta(-1)}
        className={cn(
          "absolute left-3 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full",
          "border-0 bg-black/40 text-white shadow-none",
          "hover:bg-black/60 hover:text-white",
          "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          "pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        )}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={t("common.next")}
        onClick={goDelta(1)}
        className={cn(
          "absolute right-3 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full",
          "border-0 bg-black/40 text-white shadow-none",
          "hover:bg-black/60 hover:text-white",
          "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          "pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        )}
      >
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </button>
    </>
  );
}
