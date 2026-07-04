"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
function toInt(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

function toRating(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function formatSubtitlePreview(text: string, maxChars = 46): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;

  const shortened = normalized.slice(0, Math.max(1, maxChars - 4)).trimEnd();
  const boundary = shortened.lastIndexOf(" ");
  const preview = boundary > 0 ? shortened.slice(0, boundary).trimEnd() : shortened;
  return `${preview} ...`;
}

type TrustFields = {
  reviewCount?: unknown;
  averageRating?: unknown;
  completedBookingsCount?: unknown;
};

export function buildListingCardSubtitleSegments(
  t: TFunction,
  { categoryLine, reviewCount, averageRating }: TrustFields & { categoryLine?: string | null },
): string[] {
  const segments: string[] = [];
  if (categoryLine?.trim()) segments.push(categoryLine.trim());

  const rc = toInt(reviewCount);
  const ar = toRating(averageRating);

  if (rc > 0 && ar != null) {
    segments.push(t("listings.cardTrustReviews", { count: rc, rating: ar.toFixed(1) }));
  }
  return segments;
}

type ListingType = "offer" | "looking" | null | undefined;

export function getListingCompletedBookingsLabelKey(listingType?: ListingType): string {
  return listingType === "looking" ? "listings.cardProvidersFound" : "listings.cardClientsServed";
}

export function getListingCompletedBookingsTitleKey(listingType?: ListingType): string {
  return listingType === "looking" ? "listings.cardProvidersFoundTitle" : "listings.cardClientsServedTitle";
}

function buildTrustOnlySegments(
  t: TFunction,
  fields: TrustFields & { listingType?: ListingType },
): string[] {
  const segments = buildListingCardSubtitleSegments(t, fields);
  const cb = toInt(fields.completedBookingsCount);
  if (cb > 0) {
    segments.push(t(getListingCompletedBookingsLabelKey(fields.listingType), { count: cb }));
  }
  return segments;
}
type ListingCardSubtitleProps = TrustFields & {
  categoryLine?: string | null;
  className?: string;
};

/** Category · reviews on one muted line — fixed height so grid cards stay aligned */
export function ListingCardSubtitle({
  categoryLine,
  reviewCount,
  averageRating,
  className,
}: Omit<ListingCardSubtitleProps, "completedBookingsCount">) {
  const { t } = useTranslation();
  const segments = buildListingCardSubtitleSegments(t, {
    categoryLine,
    reviewCount,
    averageRating,
  });
  const fullText = segments.join(" · ");
  const subtitleText = fullText ? formatSubtitlePreview(fullText) : "\u00A0";

  return (
    <p
      className={cn("text-xs text-gray-400 truncate min-h-4 leading-4 mb-1", className)}
      title={fullText || undefined}
    >
      {subtitleText}
    </p>
  );
}

/** Price with optional completed-bookings badge on the same row */
export function ListingCardPriceRow({
  price,
  completedBookingsCount,
  listingType,
  priceClassName,
  className,
}: {
  price: ReactNode;
  completedBookingsCount?: unknown;
  listingType?: ListingType;
  priceClassName?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const cb = toInt(completedBookingsCount);
  const labelKey = getListingCompletedBookingsLabelKey(listingType);
  const titleKey = getListingCompletedBookingsTitleKey(listingType);

  return (
    <div className={cn("mb-2 flex items-end justify-between gap-2", className)}>
      <p className={cn("text-green-700 font-bold text-base shrink-0", priceClassName)}>{price}</p>
      {cb > 0 && (
        <span
          className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-tight text-gray-500"
          title={t(titleKey)}
        >
          <Users className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{t(labelKey, { count: cb })}</span>
        </span>
      )}
    </div>
  );
}
type ListingTrustLineProps = TrustFields & {
  listingType?: ListingType;
  className?: string;
};

/** Standalone trust line (detail views, etc.) */
export function ListingTrustLine({
  reviewCount,
  averageRating,
  completedBookingsCount,
  listingType,
  className,
}: ListingTrustLineProps) {
  const { t } = useTranslation();
  const segments = buildTrustOnlySegments(t, {
    reviewCount,
    averageRating,
    completedBookingsCount,
    listingType,
  });
  if (segments.length === 0) return null;

  return <p className={cn("text-xs text-gray-600 leading-snug", className)}>{segments.join(" · ")}</p>;
}
