import { normalizePricingMode } from "./servicePricing.js";
import { calculateDepositAmount, resolveDepositBaseAmount } from "./depositSchema.js";

export function isHourlyBooking(booking) {
  return normalizePricingMode(booking.pricing_mode) === "hourly";
}

/**
 * Base amount (CAD) charged at acceptance for hourly Option C.
 * Uses configured deposit when present; otherwise one hour at the hourly rate.
 */
export function getHourlyInitialChargeBaseDollars(booking, service) {
  const estimateBase = resolveDepositBaseAmount(service, booking);
  if (estimateBase == null) return null;

  const deposit = calculateDepositAmount(estimateBase, service);
  if (deposit >= 0.01) return deposit;

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

export function computeHourlyBalanceDueCents(booking) {
  if (!isHourlyBooking(booking)) return 0;
  const owed =
    getApprovedHoursBaseCents(booking) - Number(booking.paid_service_base_cents || 0);
  return Math.max(0, owed);
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
export function resolveCheckoutKind(booking) {
  if (!isHourlyBooking(booking)) {
    if (!booking.payment_status || booking.payment_status === "unpaid") return "full";
    return null;
  }

  if (booking.status === "accepted" && (!booking.payment_status || booking.payment_status === "unpaid")) {
    return "deposit";
  }

  if (
    booking.status === "active" &&
    booking.payment_status === "deposit_paid" &&
    computeHourlyBalanceDueCents(booking) > 0
  ) {
    return "balance";
  }

  return null;
}
