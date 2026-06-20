import { normalizePricingMode } from "./servicePricing.js";

/** Range or quote — price must be agreed before payment. */
export function isNegotiablePricingMode(raw) {
  const mode = normalizePricingMode(raw);
  return mode === "range" || mode === "quote";
}

export function statusAfterAccept(servicePricingMode) {
  return isNegotiablePricingMode(servicePricingMode) ? "negotiating" : "accepted";
}

export function getListingRangeBounds(serviceOrBooking) {
  const lo = Number(serviceOrBooking.price_min ?? serviceOrBooking.price);
  const hi = Number(serviceOrBooking.price_max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return null;
  return { min: lo, max: hi };
}

/** Worker-personalized sub-range (customize only). */
export function getPersonalizedRangeBounds(booking) {
  const min = booking?.custom_price_min != null ? Number(booking.custom_price_min) : null;
  const max = booking?.custom_price_max != null ? Number(booking.custom_price_max) : null;
  if (min != null && Number.isFinite(min) && max != null && Number.isFinite(max) && max >= min) {
    return { min, max };
  }
  return null;
}

/** Bounds for proposing a single negotiated price (personalized range, else listing). */
export function getNegotiationBounds(booking, service) {
  return getPersonalizedRangeBounds(booking) ?? getListingRangeBounds(service ?? booking);
}

export function isPriceAgreementComplete(booking) {
  const confirmed = Boolean(booking.price_confirmed_by_client_at && booking.price_confirmed_by_worker_at);
  if (!confirmed) return false;

  const price = booking?.custom_price != null ? Number(booking.custom_price) : null;
  if (price == null || !Number.isFinite(price) || price < 0.01) return false;
  return true;
}

/**
 * @param {number} amount
 * @param {{ price?: unknown, price_min?: unknown, price_max?: unknown, custom_price_min?: unknown, custom_price_max?: unknown }} context
 */
export function validateNegotiatedPrice(amount, context, pricingMode) {
  const mode = normalizePricingMode(pricingMode);
  if (mode === "quote") {
    if (!Number.isFinite(amount) || amount < 0.01 || amount > 1_000_000) {
      return { error: "Invalid price" };
    }
    return { ok: true };
  }
  if (mode === "range") {
    const bounds = getNegotiationBounds(context, context);
    if (!bounds) return { error: "Invalid price range on listing" };
    if (amount < bounds.min || amount > bounds.max) {
      return { error: `Price must be between $${bounds.min} and $${bounds.max}` };
    }
    return { ok: true };
  }
  return { error: "Price negotiation is not available for this booking" };
}

/**
 * @param {number} min
 * @param {number} max
 * @param {{ price?: unknown, price_min?: unknown, price_max?: unknown }} service
 */
export function validateNegotiatedRange(min, max, service) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0.01 || max < min) {
    return { error: "Invalid price range" };
  }
  const listing = getListingRangeBounds(service);
  if (!listing) return { error: "Invalid price range on listing" };
  if (min < listing.min || max > listing.max) {
    return { error: `Range must be within $${listing.min} – $${listing.max}` };
  }
  return { ok: true };
}
