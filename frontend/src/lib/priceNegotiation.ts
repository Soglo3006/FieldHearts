import { normalizePricingMode } from "./listingPrice";

export function isNegotiablePricingMode(raw?: string | null): boolean {
  const mode = normalizePricingMode(raw);
  return mode === "range" || mode === "quote";
}

export function getListingRangeBounds(booking: {
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
}): { min: number; max: number } | null {
  const lo = Number(booking.price_min ?? booking.price);
  const hi = booking.price_max != null ? Number(booking.price_max) : NaN;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return null;
  return { min: lo, max: hi };
}

export function getPersonalizedRangeBounds(booking: {
  custom_price_min?: number | string | null;
  custom_price_max?: number | string | null;
}): { min: number; max: number } | null {
  const min = booking.custom_price_min != null ? Number(booking.custom_price_min) : null;
  const max = booking.custom_price_max != null ? Number(booking.custom_price_max) : null;
  if (min != null && Number.isFinite(min) && max != null && Number.isFinite(max) && max >= min) {
    return { min, max };
  }
  return null;
}

export function getNegotiationBounds(booking: {
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  custom_price_min?: number | string | null;
  custom_price_max?: number | string | null;
}): { min: number; max: number } | null {
  return getPersonalizedRangeBounds(booking) ?? getListingRangeBounds(booking);
}

export function isPriceAgreementComplete(booking: {
  custom_price?: number | string | null;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
}): boolean {
  if (!booking.price_confirmed_by_client_at || !booking.price_confirmed_by_worker_at) return false;
  const price = booking.custom_price != null ? Number(booking.custom_price) : null;
  return price != null && Number.isFinite(price) && price >= 0.01;
}

export function needsPriceNegotiation(booking: {
  status?: string | null;
  pricing_mode?: string | null;
}): boolean {
  return booking.status === "negotiating" && isNegotiablePricingMode(booking.pricing_mode);
}

export function hasProposedPrice(booking: {
  custom_price?: number | string | null;
}): boolean {
  return booking.custom_price != null && Number(booking.custom_price) >= 0.01;
}
