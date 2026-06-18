import { calculateDepositAmount, resolveDepositBaseAmount, type DepositConfig } from "./deposit";
import { normalizePricingMode, resolveBookingCheckoutBase } from "./listingPrice";

export type CheckoutKind = "full" | "deposit" | "balance";

type BookingPaymentFields = {
  status?: string | null;
  payment_status?: string | null;
  pricing_mode?: string | null;
  price?: number | string | null;
  price_max?: number | string | null;
  custom_price?: number | string | null;
  estimated_hours?: number | string | null;
  approved_hours_total?: number | string | null;
  paid_service_base_cents?: number | null;
  balance_due_cents?: number | null;
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  deposit_amount_cents?: number | null;
};

export function isHourlyBooking(booking: { pricing_mode?: string | null }) {
  return normalizePricingMode(booking.pricing_mode) === "hourly";
}

export function computeHourlyBalanceDueCents(booking: BookingPaymentFields): number {
  if (!isHourlyBooking(booking)) return 0;
  const stored = Number(booking.balance_due_cents);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const rate = Number(booking.price);
  const hours = Number(booking.approved_hours_total) || 0;
  if (!Number.isFinite(rate) || rate < 0.01 || hours <= 0) return 0;
  const owed = Math.round(rate * hours * 100) - Number(booking.paid_service_base_cents || 0);
  return Math.max(0, owed);
}

export function resolveCheckoutKind(booking: BookingPaymentFields): CheckoutKind | null {
  if (!isHourlyBooking(booking)) {
    if (booking.status === "accepted" && (!booking.payment_status || booking.payment_status === "unpaid")) {
      return "full";
    }
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

export function getHourlyInitialChargeDollars(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): number {
  const service = depositConfig ?? booking;
  const estimateBase = resolveDepositBaseAmount(
    {
      pricing_mode: booking.pricing_mode,
      price: booking.price,
      price_max: booking.price_max,
      estimated_hours: booking.estimated_hours,
    },
    booking,
  );
  if (estimateBase == null) return resolveBookingCheckoutBase(booking);

  const deposit = calculateDepositAmount(estimateBase, service);
  if (deposit >= 0.01) return deposit;

  const rate = Number(booking.price);
  if (!Number.isFinite(rate) || rate < 0.01) return resolveBookingCheckoutBase(booking);
  return Math.round(rate * 100) / 100;
}

export function resolveCheckoutPrice(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): number {
  const kind = resolveCheckoutKind(booking);
  if (kind === "balance") return computeHourlyBalanceDueCents(booking) / 100;
  if (kind === "deposit") {
    if (booking.deposit_amount_cents != null && booking.deposit_amount_cents > 0) {
      return booking.deposit_amount_cents / 100;
    }
    return getHourlyInitialChargeDollars(booking, depositConfig);
  }
  return resolveBookingCheckoutBase(booking);
}

export function needsBookingPayment(booking: BookingPaymentFields): {
  needed: boolean;
  kind: CheckoutKind | null;
} {
  const kind = resolveCheckoutKind(booking);
  return { needed: kind != null, kind };
}
