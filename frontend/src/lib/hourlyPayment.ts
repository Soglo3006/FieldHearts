import { calculateDepositAmount, resolveDepositBaseAmount, type DepositConfig } from "./deposit";
import { normalizePricingMode, resolveBookingCheckoutBase } from "./listingPrice";
import { isPriceAgreementComplete, isNegotiablePricingMode } from "./priceNegotiation";

export type CheckoutKind = "full" | "deposit" | "balance";

type BookingPaymentFields = {
  status?: string | null;
  payment_status?: string | null;
  pricing_mode?: string | null;
  price?: number | string | null;
  price_max?: number | string | null;
  custom_price?: number | string | null;
  custom_price_min?: number | string | null;
  custom_price_max?: number | string | null;
  estimated_hours?: number | string | null;
  approved_hours_total?: number | string | null;
  paid_service_base_cents?: number | null;
  balance_due_cents?: number | null;
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  deposit_amount_cents?: number | null;
  completed_by_worker?: boolean;
  completed_by_client?: boolean;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
};

export function isHourlyBooking(booking: { pricing_mode?: string | null }) {
  return normalizePricingMode(booking.pricing_mode) === "hourly";
}

export function isFixedBooking(booking: { pricing_mode?: string | null }) {
  return normalizePricingMode(booking.pricing_mode) === "fixed";
}

/** fixed, range, quote — balance after work marked done (not hourly hours). */
export function isWorkBasedPricingMode(raw?: string | null): boolean {
  const mode = normalizePricingMode(raw);
  return mode === "fixed" || mode === "range" || mode === "quote";
}

export function isWorkBasedBooking(booking: { pricing_mode?: string | null }) {
  return isWorkBasedPricingMode(booking.pricing_mode);
}

export function usesSplitDepositPayment(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): boolean {
  const meta = depositConfig ?? booking;
  if (!meta.deposit_enabled) return false;

  const mode = normalizePricingMode(booking.pricing_mode);
  if (mode !== "hourly" && !isWorkBasedPricingMode(mode)) return false;

  const base = resolveDepositBaseAmount(
    {
      pricing_mode: booking.pricing_mode,
      price: booking.price,
      price_max: booking.price_max,
      estimated_hours: booking.estimated_hours,
    },
    booking,
  );
  if (base == null || base < 0.02) return false;

  const deposit = calculateDepositAmount(base, meta);
  return deposit >= 0.01 && deposit < base - 0.005;
}

function getApprovedHoursBaseCents(booking: BookingPaymentFields): number {
  const rate = Number(booking.custom_price ?? booking.price);
  const hours = Number(booking.approved_hours_total) || 0;
  if (!Number.isFinite(rate) || rate < 0.01 || hours <= 0) return 0;
  return Math.round(rate * hours * 100);
}

export function getFullServiceBaseCents(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): number {
  if (isHourlyBooking(booking)) {
    const approved = getApprovedHoursBaseCents(booking);
    if (approved > 0) return approved;
  }
  const base = resolveDepositBaseAmount(
    {
      pricing_mode: booking.pricing_mode,
      price: booking.price,
      price_max: booking.price_max,
      estimated_hours: booking.estimated_hours,
    },
    booking,
  );
  return base != null ? Math.round(base * 100) : 0;
}

export function computeBalanceDueCents(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): number {
  if (!usesSplitDepositPayment(booking, depositConfig)) return 0;

  if (isHourlyBooking(booking)) {
    const rate = Number(booking.custom_price ?? booking.price);
    const hours = Number(booking.approved_hours_total) || 0;
    if (!Number.isFinite(rate) || rate < 0.01 || hours <= 0) return 0;
    const owed = Math.round(rate * hours * 100) - Number(booking.paid_service_base_cents || 0);
    return Math.max(0, owed);
  }

  const stored = Number(booking.balance_due_cents);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const full = getFullServiceBaseCents(booking, depositConfig);
  const paid = Number(booking.paid_service_base_cents || 0);
  return Math.max(0, full - paid);
}

/** @deprecated prefer computeBalanceDueCents */
export function computeHourlyBalanceDueCents(booking: BookingPaymentFields): number {
  if (!isHourlyBooking(booking)) return computeBalanceDueCents(booking);
  const stored = Number(booking.balance_due_cents);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const rate = Number(booking.price);
  const hours = Number(booking.approved_hours_total) || 0;
  if (!Number.isFinite(rate) || rate < 0.01 || hours <= 0) return 0;
  const owed = Math.round(rate * hours * 100) - Number(booking.paid_service_base_cents || 0);
  return Math.max(0, owed);
}

export function isBalanceCheckoutReady(booking: BookingPaymentFields): boolean {
  if (isHourlyBooking(booking)) {
    return (Number(booking.approved_hours_total) || 0) > 0;
  }
  if (isWorkBasedBooking(booking)) {
    return Boolean(booking.completed_by_worker || booking.completed_by_client);
  }
  return false;
}

export function resolveBalanceFullServiceBase(booking: BookingPaymentFields): number | null {
  if (isHourlyBooking(booking)) {
    const approved = Number(booking.approved_hours_total) || 0;
    const rate = Number(booking.price);
    if (approved > 0 && Number.isFinite(rate)) {
      return Math.round(rate * approved * 100) / 100;
    }
    return null;
  }
  const cents = getFullServiceBaseCents(booking);
  return cents > 0 ? cents / 100 : null;
}

export function hourlyAwaitingApprovedHours(booking: BookingPaymentFields): boolean {
  return (
    isHourlyBooking(booking) &&
    booking.status === "active" &&
    booking.payment_status === "deposit_paid" &&
    !isBalanceCheckoutReady(booking) &&
    computeBalanceDueCents(booking) <= 0
  );
}

export function fixedAwaitingWorkForBalance(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): boolean {
  return (
    isWorkBasedBooking(booking) &&
    usesSplitDepositPayment(booking, depositConfig) &&
    booking.status === "active" &&
    booking.payment_status === "deposit_paid" &&
    !isBalanceCheckoutReady(booking)
  );
}

export function hasUnpaidBalanceDue(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): boolean {
  const meta = depositConfig ?? booking;
  if (!usesSplitDepositPayment(booking, meta)) return false;
  if (!isBalanceCheckoutReady(booking)) return false;
  const balanceDue = computeBalanceDueCents(booking, meta);
  if (balanceDue <= 0) return false;
  if (booking.payment_status === "deposit_paid") return true;
  return booking.payment_status === "paid" && isHourlyBooking(booking);
}

export function resolveCheckoutKind(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): CheckoutKind | null {
  const meta = depositConfig ?? booking;
  const unpaid = !booking.payment_status || booking.payment_status === "unpaid";

  if (isNegotiablePricingMode(booking.pricing_mode)) {
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
  const kind = resolveCheckoutKind(booking, depositConfig);
  if (kind === "balance") return computeBalanceDueCents(booking, depositConfig) / 100;
  if (kind === "deposit") {
    if (booking.deposit_amount_cents != null && booking.deposit_amount_cents > 0) {
      return booking.deposit_amount_cents / 100;
    }
    return getHourlyInitialChargeDollars(booking, depositConfig);
  }
  return resolveBookingCheckoutBase(booking);
}

export function needsBookingPayment(
  booking: BookingPaymentFields,
  depositConfig?: DepositConfig | null,
): {
  needed: boolean;
  kind: CheckoutKind | null;
} {
  const kind = resolveCheckoutKind(booking, depositConfig);
  return { needed: kind != null, kind };
}
