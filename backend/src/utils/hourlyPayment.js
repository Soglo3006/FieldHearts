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

export function getApprovedHoursBaseCents(booking) {
  const rate = Number(booking.price);
  const hours = Number(booking.approved_hours_total) || 0;
  if (!Number.isFinite(rate) || rate < 0.01 || hours <= 0) return 0;
  return Math.round(rate * hours * 100);
}

export function computeHourlyBalanceDueCents(booking) {
  if (!isHourlyBooking(booking)) return 0;
  const owed =
    getApprovedHoursBaseCents(booking) - Number(booking.paid_service_base_cents || 0);
  return Math.max(0, owed);
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
