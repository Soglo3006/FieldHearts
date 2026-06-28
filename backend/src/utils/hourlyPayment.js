import { normalizePricingMode } from "./servicePricing.js";
import { calculateDepositAmount, resolveDepositBaseAmount } from "./depositSchema.js";
import { isNegotiablePricingMode, isPriceAgreementComplete } from "./priceNegotiation.js";

export function isHourlyBooking(booking) {
  return normalizePricingMode(booking.pricing_mode) === "hourly";
}

export function isFixedBooking(booking) {
  return normalizePricingMode(booking.pricing_mode) === "fixed";
}

/** fixed, range, quote — balance after work marked done (not hourly hours). */
export function isWorkBasedPricingMode(raw) {
  const mode = normalizePricingMode(raw);
  return mode === "fixed" || mode === "range" || mode === "quote";
}

export function isWorkBasedBooking(booking) {
  return isWorkBasedPricingMode(booking?.pricing_mode);
}

/** Hourly or work-based listing with a configured deposit smaller than the full price. */
export function usesSplitDepositPayment(booking, service = null) {
  const meta = service ?? booking;
  if (!meta.deposit_enabled) return false;

  const mode = normalizePricingMode(booking.pricing_mode ?? meta.pricing_mode);
  if (mode !== "hourly" && !isWorkBasedPricingMode(mode)) return false;

  const base = resolveDepositBaseAmount(meta, booking);
  if (base == null || base < 0.02) return false;

  const deposit = calculateDepositAmount(base, meta);
  return deposit >= 0.01 && deposit < base - 0.005;
}

/**
 * Base amount (CAD) charged at acceptance for split-deposit bookings.
 */
export function getHourlyInitialChargeBaseDollars(booking, service) {
  const estimateBase = resolveDepositBaseAmount(service, booking);
  if (estimateBase == null) return null;

  const deposit = calculateDepositAmount(estimateBase, service);
  if (deposit >= 0.01) return deposit;

  if (!isHourlyBooking(booking)) return null;

  const rate = Number(booking?.price ?? service?.price);
  if (!Number.isFinite(rate) || rate < 0.01) return null;
  return Math.round(rate * 100) / 100;
}

export function resolveBookingHourlyRate(booking) {
  const custom = booking.custom_price != null ? Number(booking.custom_price) : null;
  if (custom != null && Number.isFinite(custom) && custom >= 0.01) return custom;
  const rate = Number(booking.price ?? booking.service_price);
  return Number.isFinite(rate) ? rate : 0;
}

export function getApprovedHoursBaseCents(booking) {
  const rate = resolveBookingHourlyRate(booking);
  const hours = Number(booking.approved_hours_total) || 0;
  if (rate < 0.01 || hours <= 0) return 0;
  return Math.round(rate * hours * 100);
}

/** Full service base in cents (fixed price or approved hourly hours). */
export function getFullServiceBaseCents(booking, service = null) {
  if (isHourlyBooking(booking)) {
    const approved = getApprovedHoursBaseCents(booking);
    if (approved > 0) return approved;
  }
  const meta = service ?? booking;
  const base = resolveDepositBaseAmount(meta, booking);
  return base != null ? Math.round(base * 100) : 0;
}

export function computeBalanceDueCents(booking, service = null) {
  if (!usesSplitDepositPayment(booking, service)) return 0;

  if (isHourlyBooking(booking)) {
    const owed =
      getApprovedHoursBaseCents(booking) - Number(booking.paid_service_base_cents || 0);
    return Math.max(0, owed);
  }

  const stored = Number(booking.balance_due_cents);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const full = getFullServiceBaseCents(booking, service);
  const paid = Number(booking.paid_service_base_cents || 0);
  return Math.max(0, full - paid);
}

/** @deprecated use computeBalanceDueCents */
export function computeHourlyBalanceDueCents(booking) {
  if (!isHourlyBooking(booking)) return computeBalanceDueCents(booking);
  const stored = Number(booking.balance_due_cents);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const owed =
    getApprovedHoursBaseCents(booking) - Number(booking.paid_service_base_cents || 0);
  return Math.max(0, owed);
}

/** Client may pay balance: hourly = hours approved; fixed = work marked done by at least one party. */
export function isBalanceCheckoutReady(booking) {
  if (isHourlyBooking(booking)) {
    return (Number(booking.approved_hours_total) || 0) > 0;
  }
  if (isWorkBasedPricingMode(booking.pricing_mode)) {
    return Boolean(booking.completed_by_worker || booking.completed_by_client);
  }
  return false;
}

/**
 * Balance checkout after deposit: commission + taxes on full service base,
 * service line item = remaining base after deposit credit.
 */
export function computeHourlyBalanceCheckoutAmounts(
  fullServiceBaseDollars,
  balanceServiceBaseDollars,
  taxRate,
) {
  const full = Math.round(Number(fullServiceBaseDollars) * 100) / 100;
  const balance = Math.max(0, Math.round(Number(balanceServiceBaseDollars) * 100) / 100);
  const rate = Number(taxRate) || 0;
  const commission = Math.round(full * 0.05 * 100) / 100;
  const taxes = Math.round(full * rate * 100) / 100;
  const total = Math.round((balance + commission + taxes) * 100) / 100;
  return {
    fullServiceBase: full,
    balanceBase: balance,
    commission,
    taxes,
    total,
    balanceBaseCents: Math.round(balance * 100),
    commissionCents: Math.round(commission * 100),
    taxesCents: Math.round(taxes * 100),
    totalCents: Math.round(total * 100),
  };
}

/**
 * @returns {'full' | 'deposit' | 'balance' | null}
 */
export function hasUnpaidBalanceDue(booking, service = null) {
  const meta = service ?? booking;
  if (!usesSplitDepositPayment(booking, meta)) return false;
  if (!isBalanceCheckoutReady(booking)) return false;
  const balanceDue = computeBalanceDueCents(booking, meta);
  if (balanceDue <= 0) return false;
  if (booking.payment_status === "deposit_paid") return true;
  // Hourly: more approved hours after the client already paid the balance in full.
  return booking.payment_status === "paid" && isHourlyBooking(booking);
}

export function resolveCheckoutKind(booking, service = null) {
  const meta = service ?? booking;
  const unpaid = !booking.payment_status || booking.payment_status === "unpaid";

  if (isNegotiablePricingMode(booking.pricing_mode ?? meta.pricing_mode)) {
    if (booking.status === "negotiating") return null;
    if (booking.status === "accepted" && !isPriceAgreementComplete(booking)) return null;
  }

  if (usesSplitDepositPayment(booking, meta)) {
    if (booking.status === "accepted" && unpaid) return "deposit";
    if (
      (booking.status === "active" || booking.status === "completed") &&
      hasUnpaidBalanceDue(booking, meta)
    ) {
      return "balance";
    }
    return null;
  }

  if (booking.status === "accepted" && unpaid) return "full";
  return null;
}
