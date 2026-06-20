"use client";

import { useTranslation } from "react-i18next";

export type ListingRangeBounds = { min: number; max: number };

export function getListingRangeBounds(booking: {
  pricing_mode?: string | null;
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
}): ListingRangeBounds | null {
  const lo = Number(booking.price_min ?? booking.price);
  const hi = booking.price_max != null ? Number(booking.price_max) : NaN;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return null;
  return { min: lo, max: hi };
}

export function formatPriceInput(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function clampToRange(value: number, bounds: ListingRangeBounds | null): number {
  if (!bounds) return value;
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

export function parsePriceInput(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getInitialRangeMin(
  booking: {
    custom_price_min?: number | string | null;
    custom_price?: number | string | null;
    price?: number | string | null;
  },
  bounds: ListingRangeBounds | null,
): string {
  if (booking.custom_price_min != null && Number(booking.custom_price_min) >= 0.01) {
    return formatPriceInput(clampToRange(Number(booking.custom_price_min), bounds));
  }
  if (bounds) return formatPriceInput(bounds.min);
  return "";
}

export function getInitialRangeMax(
  booking: {
    custom_price_max?: number | string | null;
    custom_price?: number | string | null;
    price_max?: number | string | null;
    price?: number | string | null;
  },
  bounds: ListingRangeBounds | null,
): string {
  if (booking.custom_price_max != null && Number(booking.custom_price_max) >= 0.01) {
    return formatPriceInput(clampToRange(Number(booking.custom_price_max), bounds));
  }
  if (booking.custom_price != null && Number(booking.custom_price) >= 0.01) {
    return formatPriceInput(clampToRange(Number(booking.custom_price), bounds));
  }
  if (bounds) return formatPriceInput(bounds.max);
  return "";
}

export function formatAgreedRangeLabel(
  min: number | null | undefined,
  max: number | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (min != null && max != null && Number.isFinite(min) && Number.isFinite(max)) {
    if (min === max) return `${max.toFixed(2)} $`;
    return t("listingPrice.rangeCurrency", { min: min.toFixed(2), max: max.toFixed(2) });
  }
  return "";
}

interface RangePriceFieldsProps {
  valueMin: string;
  valueMax: string;
  onChangeMin: (value: string) => void;
  onChangeMax: (value: string) => void;
  onBlurMin?: () => void;
  onBlurMax?: () => void;
  listingBounds: ListingRangeBounds | null;
  compact?: boolean;
  idPrefix?: string;
}

export default function RangePriceFields({
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  onBlurMin,
  onBlurMax,
  listingBounds,
  compact = false,
  idPrefix = "rangePrice",
}: RangePriceFieldsProps) {
  const { t } = useTranslation();
  const parsedMin = parsePriceInput(valueMin);
  const parsedMax = parsePriceInput(valueMax);

  const minOutOfBounds =
    parsedMin != null &&
    listingBounds != null &&
    (parsedMin < listingBounds.min || parsedMin > listingBounds.max);
  const maxOutOfBounds =
    parsedMax != null &&
    listingBounds != null &&
    (parsedMax < listingBounds.min || parsedMax > listingBounds.max);
  const invalidOrder =
    parsedMin != null && parsedMax != null && parsedMax < parsedMin;

  const labelClass = compact ? "text-xs text-gray-500 mb-1 block" : "text-sm font-medium text-gray-800 mb-1.5 block";
  const inputClass = compact
    ? "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    : "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}Min`} className={labelClass}>
            {t("post.priceMinLabel")}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
            <input
              id={`${idPrefix}Min`}
              type="number"
              min={listingBounds?.min ?? 0.01}
              max={listingBounds?.max}
              step="0.01"
              value={valueMin}
              onChange={(e) => onChangeMin(e.target.value)}
              onBlur={onBlurMin}
              className={`${inputClass} pl-7`}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${idPrefix}Max`} className={labelClass}>
            {t("post.priceMaxLabel")}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
            <input
              id={`${idPrefix}Max`}
              type="number"
              min={listingBounds?.min ?? 0.01}
              max={listingBounds?.max}
              step="0.01"
              value={valueMax}
              onChange={(e) => onChangeMax(e.target.value)}
              onBlur={onBlurMax}
              className={`${inputClass} pl-7`}
            />
          </div>
        </div>
      </div>
      {(minOutOfBounds || maxOutOfBounds) && listingBounds && (
        <p className="text-xs text-red-500">
          {t("priceNegotiation.outOfRange", {
            min: listingBounds.min.toFixed(2),
            max: listingBounds.max.toFixed(2),
          })}
        </p>
      )}
      {invalidOrder && !minOutOfBounds && !maxOutOfBounds && (
        <p className="text-xs text-red-500">{t("post.invalidPriceRange")}</p>
      )}
    </div>
  );
}

export function isRangeInputValid(
  valueMin: string,
  valueMax: string,
  listingBounds: ListingRangeBounds | null,
): boolean {
  const min = parsePriceInput(valueMin);
  const max = parsePriceInput(valueMax);
  if (min == null || max == null || min < 0.01 || max < min) return false;
  if (listingBounds && (min < listingBounds.min || max > listingBounds.max)) return false;
  return true;
}
