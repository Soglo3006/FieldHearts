export type PricingMode = "fixed" | "range" | "quote";

/** Fields returned by `/services` and sent on POST/PUT. */
export interface ListingPricingFields {
  pricing_mode?: string | null;
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
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
  if (s === "range" || s === "quote") return s;
  return "fixed";
}

/** Lower bound used for sidebar/modal totals (buyer commission, tax). Null for quote. */
export function estimateBaseAmountForTotals(s: ListingPricingFields): number | null {
  const mode = normalizePricingMode(s.pricing_mode);
  if (mode === "quote") return null;
  if (mode === "range") {
    return parseListingPriceNum(s.price_min ?? s.price);
  }
  return parseListingPriceNum(s.price);
}

/**
 * Unified display line for grids, hero price, bookmarks, etc.
 * Accepts react-i18next `t` or any `(key, opts?) => string` wrapper.
 */
export function formatListingPriceLine(
  t: (key: string, opts?: Record<string, unknown>) => string,
  s: ListingPricingFields
): string {
  const mode = normalizePricingMode(s.pricing_mode);
  if (mode === "quote") return t("listingPrice.quote");

  const lo = parseListingPriceNum(s.price_min ?? s.price);
  const hi = parseListingPriceNum(s.price_max);
  if (mode === "range" && lo != null && hi != null) {
    return t("listingPrice.rangeCurrency", {
      min: lo.toFixed(2),
      max: hi.toFixed(2),
    });
  }

  const p = parseListingPriceNum(s.price);
  if (p == null) return t("listingPrice.quote");
  return `${p.toFixed(2)} $`;
}

/** Server metadata (generateMetadata): short segment without i18next. */
export function listingMetaPriceSegment(service: ListingPricingFields, lang: "en" | "fr"): string {
  const mode = normalizePricingMode(service.pricing_mode);
  if (mode === "quote") {
    return lang === "en" ? "Price to be agreed" : "Prix à convenir";
  }
  const lo = parseListingPriceNum(service.price_min ?? service.price);
  const hi = parseListingPriceNum(service.price_max);
  if (mode === "range" && lo != null && hi != null) {
    return `${lo.toFixed(2)} – ${hi.toFixed(2)} $`;
  }
  const p = parseListingPriceNum(service.price);
  if (p != null) return `${p.toFixed(2)} $`;
  return lang === "en" ? "Price to be agreed" : "Prix à convenir";
}
