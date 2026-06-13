export type PricingMode = "fixed" | "range" | "quote" | "hourly";

/** Fields returned by `/services` and sent on POST/PUT. */
export interface ListingPricingFields {
  pricing_mode?: string | null;
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  estimated_hours?: number | string | null;
}

export function parseListingPriceNum(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizePricingMode(raw: unknown): PricingMode {
  const s =
    raw === null || raw === undefined
      ? "fixed"
      : String(raw).toLowerCase().trim();
  if (s === "range" || s === "quote" || s === "hourly") return s;
  return "fixed";
}

/** Distinct bounds (e.g. 21–32 $) — used for commission/tax/total ranges on service detail. */
export function hasDistinctPriceRange(s: ListingPricingFields): boolean {
  const lo = parseListingPriceNum(s.price_min ?? s.price);
  const hi = parseListingPriceNum(s.price_max);
  return lo != null && hi != null && hi > lo + 1e-9;
}

/** Lower bound used for sidebar/modal totals (buyer commission, tax). Null for quote. */
export function estimateBaseAmountForTotals(s: ListingPricingFields): number | null {
  const mode = normalizePricingMode(s.pricing_mode);
  if (mode === "quote") return null;
  if (mode === "hourly") {
    const rate = parseListingPriceNum(s.price);
    const hours = parseListingPriceNum(s.estimated_hours) ?? 1;
    if (rate == null) return null;
    return rate * hours;
  }
  if (mode === "range" || hasDistinctPriceRange(s)) {
    return parseListingPriceNum(s.price_min ?? s.price);
  }
  return parseListingPriceNum(s.price);
}

/** Upper bound for range pricing (max commission / tax / total). Null for fixed or quote. */
export function estimateMaxBaseAmountForTotals(s: ListingPricingFields): number | null {
  const mode = normalizePricingMode(s.pricing_mode);
  if (mode === "quote") return null;
  if (mode === "hourly") return estimateBaseAmountForTotals(s);
  if (mode !== "range" && !hasDistinctPriceRange(s)) return null;
  const hi = parseListingPriceNum(s.price_max);
  const lo = parseListingPriceNum(s.price_min ?? s.price);
  if (hi == null || lo == null || hi < lo) return null;
  return hi;
}

/** `compact` = short label on cards; `detail` = same wording as post form (service detail, booking). */
export type ListingPriceLineVariant = "compact" | "detail";

/**
 * Unified display line for grids, detail page, bookmarks, etc.
 * Accepts react-i18next `t` or any `(key, opts?) => string` wrapper.
 */
export function formatListingPriceLine(
  t: (key: string, opts?: Record<string, unknown>) => string,
  s: ListingPricingFields,
  variant: ListingPriceLineVariant = "compact",
): string {
  const mode = normalizePricingMode(s.pricing_mode);
  if (mode === "quote") {
    return variant === "detail" ? t("post.pricingModeQuote") : t("listingPrice.quote");
  }

  if (mode === "hourly") {
    const rate = parseListingPriceNum(s.price);
    if (rate == null) return t("listingPrice.quote");
    const hours = parseListingPriceNum(s.estimated_hours);
    if (hours != null && hours > 0) {
      return t("listingPrice.hourlyWithHours", { rate: rate.toFixed(2), hours });
    }
    return t("listingPrice.hourlyRate", { rate: rate.toFixed(2) });
  }

  const lo = parseListingPriceNum(s.price_min ?? s.price);
  const hi = parseListingPriceNum(s.price_max);
  if (mode === "range" && lo != null && hi != null) {
    return t("listingPrice.rangeCurrency", {
      min: lo.toFixed(2),
      max: hi.toFixed(2),
    });
  }

  const p = parseListingPriceNum(s.price);
  if (p == null) {
    return variant === "detail" ? t("post.pricingModeQuote") : t("listingPrice.quote");
  }
  return `${p.toFixed(2)} $`;
}

/** Server metadata (generateMetadata): short segment without i18next. */
export function listingMetaPriceSegment(service: ListingPricingFields, lang: "en" | "fr"): string {
  const mode = normalizePricingMode(service.pricing_mode);
  if (mode === "quote") {
    return lang === "en" ? "Price to discuss" : "Prix à discuter";
  }
  if (mode === "hourly") {
    const rate = parseListingPriceNum(service.price);
    if (rate == null) return lang === "en" ? "Hourly rate" : "Tarif horaire";
    return lang === "en" ? `${rate.toFixed(2)} $/h` : `${rate.toFixed(2)} $/h`;
  }
  const lo = parseListingPriceNum(service.price_min ?? service.price);
  const hi = parseListingPriceNum(service.price_max);
  if (mode === "range" && lo != null && hi != null) {
    return `${lo.toFixed(2)} – ${hi.toFixed(2)} $`;
  }
  const p = parseListingPriceNum(service.price);
  if (p != null) return `${p.toFixed(2)} $`;
  return lang === "en" ? "Price to discuss" : "Prix à discuter";
}

import { resolveDepositBaseAmount } from "./deposit";

export function resolveBookingCheckoutBase(booking: {
  pricing_mode?: string | null;
  price?: number | string | null;
  price_max?: number | string | null;
  custom_price?: number | string | null;
  estimated_hours?: number | string | null;
}): number {
  const base = resolveDepositBaseAmount(
    {
      pricing_mode: booking.pricing_mode,
      price: booking.price,
      price_max: booking.price_max,
      estimated_hours: booking.estimated_hours,
    },
    booking,
  );
  if (base != null && Number.isFinite(base) && base >= 0.01) return base;
  return getEffectiveBookingPrice(booking);
}

export function getEffectiveBookingPrice(booking: {
  pricing_mode?: string | null;
  price?: number | string | null;
  custom_price?: number | string | null;
  estimated_hours?: number | string | null;
  approved_hours_total?: number | string | null;
}): number {
  const mode = normalizePricingMode(booking.pricing_mode);
  if (mode === "hourly") {
    const rate = Number(booking.price);
    const approved = Number(booking.approved_hours_total);
    const hours =
      Number.isFinite(approved) && approved > 0
        ? approved
        : Number(booking.estimated_hours ?? 1);
    return Math.round(rate * hours * 100) / 100;
  }
  return Number(booking.custom_price ?? booking.price);
}
