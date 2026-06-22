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

export function pricesMatch(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

export function getPartyProposals(booking: {
  client_proposed_price?: number | string | null;
  worker_proposed_price?: number | string | null;
}): { client: number | null; worker: number | null } {
  const clientRaw =
    booking.client_proposed_price != null ? Number(booking.client_proposed_price) : null;
  const workerRaw =
    booking.worker_proposed_price != null ? Number(booking.worker_proposed_price) : null;
  return {
    client: clientRaw != null && Number.isFinite(clientRaw) && clientRaw >= 0.01 ? clientRaw : null,
    worker: workerRaw != null && Number.isFinite(workerRaw) && workerRaw >= 0.01 ? workerRaw : null,
  };
}

export function hasAnyPartyProposal(booking: {
  client_proposed_price?: number | string | null;
  worker_proposed_price?: number | string | null;
  custom_price?: number | string | null;
}): boolean {
  const { client, worker } = getPartyProposals(booking);
  if (client != null || worker != null) return true;
  return booking.custom_price != null && Number(booking.custom_price) >= 0.01;
}

export function isBookingUnpaid(booking: { payment_status?: string | null }): boolean {
  const ps = booking.payment_status;
  return !ps || ps === "unpaid";
}

/** Quote/range: negotiation UI and API while unpaid — including re-negotiation after a prior agreement. */
export function canAccessPriceNegotiation(booking: {
  status?: string | null;
  pricing_mode?: string | null;
  payment_status?: string | null;
}): boolean {
  if (!isNegotiablePricingMode(booking.pricing_mode)) return false;
  if (!isBookingUnpaid(booking)) return false;
  return booking.status === "negotiating" || booking.status === "accepted";
}

export function isPriceAgreementComplete(booking: {
  custom_price?: number | string | null;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
  price_selected_by_client?: number | string | null;
  price_selected_by_worker?: number | string | null;
}): boolean {
  if (!booking.price_confirmed_by_client_at || !booking.price_confirmed_by_worker_at) return false;

  const clientSel =
    booking.price_selected_by_client != null ? Number(booking.price_selected_by_client) : null;
  const workerSel =
    booking.price_selected_by_worker != null ? Number(booking.price_selected_by_worker) : null;
  if (
    clientSel != null &&
    Number.isFinite(clientSel) &&
    workerSel != null &&
    Number.isFinite(workerSel) &&
    pricesMatch(clientSel, workerSel)
  ) {
    return clientSel >= 0.01;
  }

  const price = booking.custom_price != null ? Number(booking.custom_price) : null;
  return price != null && Number.isFinite(price) && price >= 0.01;
}

/** Quote/range booking still awaiting an agreed price — hide $0 totals and listing deposit defaults. */
export function isAwaitingAgreedPriceDisplay(booking: {
  status?: string | null;
  pricing_mode?: string | null;
  custom_price?: number | string | null;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
}): boolean {
  const mode = normalizePricingMode(booking.pricing_mode);
  if (!isNegotiablePricingMode(mode)) return false;
  if (isPriceAgreementComplete(booking)) return false;
  if (booking.status === "negotiating") return true;
  if (booking.status === "accepted") return true;
  if (booking.status === "pending" && mode === "quote") return true;
  if (booking.status === "pending" && mode === "range") {
    const price = booking.custom_price != null ? Number(booking.custom_price) : null;
    return price == null || !Number.isFinite(price) || price < 0.01;
  }
  return false;
}

export function needsPriceNegotiation(booking: {
  status?: string | null;
  pricing_mode?: string | null;
}): boolean {
  return booking.status === "negotiating" && isNegotiablePricingMode(booking.pricing_mode);
}

/** Negotiable booking still awaiting a confirmed price — hide $0 totals and fee breakdowns. */
export function isAwaitingPriceAgreement(booking: {
  status?: string | null;
  pricing_mode?: string | null;
  custom_price?: number | string | null;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
}): boolean {
  return isAwaitingAgreedPriceDisplay(booking);
}

export function hasProposedPrice(booking: {
  client_proposed_price?: number | string | null;
  worker_proposed_price?: number | string | null;
  custom_price?: number | string | null;
}): boolean {
  return hasAnyPartyProposal(booking);
}
