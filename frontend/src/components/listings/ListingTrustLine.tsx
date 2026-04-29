"use client";

import { useTranslation } from "react-i18next";
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

type ListingTrustLineProps = {
  reviewCount?: unknown;
  averageRating?: unknown;
  completedBookingsCount?: unknown;
  className?: string;
};

/** ⭐ rating (N reviews) · M clients — omit segments when count is 0 */
export function ListingTrustLine({
  reviewCount,
  averageRating,
  completedBookingsCount,
  className,
}: ListingTrustLineProps) {
  const { t } = useTranslation();
  const rc = toInt(reviewCount);
  const ar = toRating(averageRating);
  const cb = toInt(completedBookingsCount);

  const parts: string[] = [];
  if (rc > 0 && ar != null) {
    parts.push(t("listings.cardTrustReviews", { count: rc, rating: ar.toFixed(1) }));
  }
  if (cb > 0) {
    parts.push(t("listings.cardTrustClients", { count: cb }));
  }
  if (parts.length === 0) return null;

  return <p className={cn("text-xs text-gray-600 leading-snug", className)}>{parts.join(" · ")}</p>;
}
