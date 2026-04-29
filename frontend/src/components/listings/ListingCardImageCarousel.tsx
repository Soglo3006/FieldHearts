"use client";

import { useState, useRef, useEffect, type MouseEvent, type TransitionEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [physical, setPhysical] = useState(1);
  const [disableTransition, setDisableTransition] = useState(false);
  const physicalRef = useRef(physical);

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
      <AppImage
        src={urls[0]!}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    );
  }

  const extended = buildExtendedUrls(urls);
  const total = extended.length;

  const logicalActive =
    physical === 0 ? n - 1 : physical === n + 1 ? 0 : physical - 1;

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "flex h-full ease-out motion-reduce:transition-none",
            !disableTransition && "transition-transform duration-300 motion-reduce:transition-none",
          )}
          style={{
            width: `${total * 100}%`,
            transform: `translateX(-${(physical * 100) / total}%)`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extended.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative h-full shrink-0"
              style={{ width: `${100 / total}%` }}
            >
              <AppImage
                src={url}
                alt={i === 1 ? alt : ""}
                fill
                sizes={sizes}
                className="object-cover"
                priority={priority && i === 1}
                loading={priority && i === 1 ? undefined : "lazy"}
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
        aria-label="Previous photo"
        onClick={goDelta(-1)}
        className={cn(
          "absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-gray-200/80 bg-white/90 text-gray-700 shadow-md backdrop-blur-sm",
          "transition-opacity hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90",
          "pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        )}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={goDelta(1)}
        className={cn(
          "absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-gray-200/80 bg-white/90 text-gray-700 shadow-md backdrop-blur-sm",
          "transition-opacity hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90",
          "pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        )}
      >
        <ChevronRight className="h-4 w-4 shrink-0" />
      </button>
    </>
  );
}
