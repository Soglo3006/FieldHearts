import { getTaxRate } from "@/lib/taxes";
import {
  computeHourlyBalanceDueCents,
  isHourlyBooking,
  type CheckoutKind,
} from "@/lib/hourlyPayment";
import { resolveBookingCheckoutBase, getEffectiveBookingPrice } from "@/lib/listingPrice";

export type PaidCheckoutKind = CheckoutKind;

export interface LatestPaymentInfo {
  amount: number;
  platform_fee: number;
  payment_kind?: string | null;
}

export interface PaymentSuccessBreakdown {
  kind: PaidCheckoutKind;
  serviceBase: number;
  commission: number;
  taxes: number;
  totalPaid: number;
  estimatedTotalBase: number | null;
  estimatedRemainingBase: number | null;
  estimatedTotalWithFees: number | null;
  estimatedRemainingCommission: number | null;
  estimatedRemainingTaxes: number | null;
  estimatedRemainingTotal: number | null;
  balanceDueNow: number;
  balanceDueTotal: number | null;
  isFullyPaid: boolean;
  titleKey: string;
  descKey: string;
}

type BookingFields = {
  payment_status?: string | null;
  pricing_mode?: string | null;
  price?: number | string | null;
  price_max?: number | string | null;
  custom_price?: number | string | null;
  estimated_hours?: number | string | null;
  approved_hours_total?: number | string | null;
  paid_service_base_cents?: number | null;
  balance_due_cents?: number | null;
  deposit_amount_cents?: number | null;
  tax_rate?: number | null;
  client_province?: string | null;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function resolveTaxRate(booking: BookingFields) {
  const stored = booking.tax_rate != null ? Number(booking.tax_rate) : NaN;
  if (Number.isFinite(stored) && stored > 0) return stored;
  return getTaxRate(booking.client_province ?? "QC");
}

/** Service base → total charged at checkout (full upfront payment). */
export function computeServiceCheckoutTotal(serviceBase: number, taxRate: number) {
  const base = roundMoney(serviceBase);
  const commission = roundMoney(base * 0.05);
  const taxes = roundMoney(base * taxRate);
  return {
    base,
    commission,
    taxes,
    total: roundMoney(base + commission + taxes),
  };
}

/**
 * After deposit: commission + taxes on full service; balance line = full − deposit.
 * e.g. 125.97 total − 50 deposit = 75.97 remaining.
 */
export function computeHourlyBalanceCheckoutTotal(
  fullServiceBase: number,
  depositPaidBase: number,
  taxRate: number,
) {
  const full = roundMoney(fullServiceBase);
  const deposit = roundMoney(depositPaidBase);
  const balanceBase = Math.max(0, roundMoney(full - deposit));
  const commission = roundMoney(full * 0.05);
  const taxes = roundMoney(full * taxRate);
  return {
    fullServiceBase: full,
    depositPaid: deposit,
    balanceBase,
    commission,
    taxes,
    total: roundMoney(balanceBase + commission + taxes),
  };
}

function breakdownFromTotals(
  totalCents: number,
  platformFeeCents: number,
  taxRate: number,
): { serviceBase: number; commission: number; taxes: number; totalPaid: number } {
  const totalPaid = totalCents / 100;
  const commission = platformFeeCents / 100;
  if (commission <= 0) {
    return { serviceBase: totalPaid, commission: 0, taxes: 0, totalPaid };
  }
  const serviceBase = roundMoney(commission / 0.05);
  const taxes = roundMoney(serviceBase * taxRate);
  return { serviceBase, commission, taxes, totalPaid };
}

export function buildPaymentSuccessBreakdown(
  booking: BookingFields,
  latestPayment: LatestPaymentInfo | null,
  paymentKindOverride?: string | null,
): PaymentSuccessBreakdown {
  const kind = (paymentKindOverride ||
    latestPayment?.payment_kind ||
    (isHourlyBooking(booking) && booking.payment_status === "deposit_paid"
      ? "deposit"
      : "full")) as PaidCheckoutKind;

  const taxRate = resolveTaxRate(booking);
  const totalCents = latestPayment?.amount ?? 0;
  const platformFeeCents = latestPayment?.platform_fee ?? 0;
  const { serviceBase, commission, taxes, totalPaid } = breakdownFromTotals(
    totalCents,
    platformFeeCents,
    taxRate,
  );

  const estimatedTotalBase = isHourlyBooking(booking)
    ? resolveBookingCheckoutBase(booking)
    : null;
  const paidBaseFromBooking = Number(booking.paid_service_base_cents || 0) / 100;
  const depositPaidNow = kind === "deposit" && totalCents > 0 ? totalCents / 100 : 0;
  const effectivePaidBase = Math.max(paidBaseFromBooking, depositPaidNow);
  const balanceDueNow = computeHourlyBalanceDueCents(booking) / 100;
  const estimatedRemainingBase =
    estimatedTotalBase != null
      ? Math.max(0, roundMoney(estimatedTotalBase - effectivePaidBase))
      : null;

  const estimateFees =
    estimatedTotalBase != null ? computeServiceCheckoutTotal(estimatedTotalBase, taxRate) : null;
  const remainingFees =
    estimatedTotalBase != null
      ? computeHourlyBalanceCheckoutTotal(estimatedTotalBase, effectivePaidBase, taxRate)
      : null;
  const approvedFullBase =
    isHourlyBooking(booking) && Number(booking.approved_hours_total) > 0
      ? roundMoney(Number(booking.price) * Number(booking.approved_hours_total))
      : null;
  const balanceDueFees =
    balanceDueNow > 0 && approvedFullBase != null
      ? computeHourlyBalanceCheckoutTotal(approvedFullBase, effectivePaidBase, taxRate)
      : remainingFees;

  const isFullyPaid = booking.payment_status === "paid";

  if (kind === "deposit") {
    const depositPaid = totalCents > 0 ? totalCents / 100 : paidBaseFromBooking;
    return {
      kind: "deposit",
      serviceBase: depositPaid,
      commission: 0,
      taxes: 0,
      totalPaid: depositPaid,
      estimatedTotalBase,
      estimatedRemainingBase: remainingFees?.balanceBase ?? null,
      estimatedTotalWithFees: estimateFees?.total ?? null,
      estimatedRemainingCommission: remainingFees?.commission ?? null,
      estimatedRemainingTaxes: remainingFees?.taxes ?? null,
      estimatedRemainingTotal: remainingFees?.total ?? null,
      balanceDueNow,
      balanceDueTotal: balanceDueFees?.total ?? null,
      isFullyPaid: false,
      titleKey: "payment.confirmedDeposit",
      descKey: "payment.confirmedDepositDesc",
    };
  }

  if (kind === "balance") {
    return {
      kind: "balance",
      serviceBase,
      commission,
      taxes,
      totalPaid,
      estimatedTotalBase: null,
      estimatedRemainingBase: balanceDueNow > 0 ? balanceDueNow : null,
      estimatedTotalWithFees: null,
      estimatedRemainingCommission: balanceDueFees?.commission ?? null,
      estimatedRemainingTaxes: balanceDueFees?.taxes ?? null,
      estimatedRemainingTotal: balanceDueFees?.total ?? null,
      balanceDueNow,
      balanceDueTotal: balanceDueFees?.total ?? null,
      isFullyPaid,
      titleKey: isFullyPaid ? "payment.confirmed" : "payment.confirmedBalance",
      descKey: isFullyPaid ? "payment.confirmedFullAfterBalanceDesc" : "payment.confirmedBalanceDesc",
    };
  }

  return {
    kind: "full",
    serviceBase: serviceBase || resolveBookingCheckoutBase(booking),
    commission,
    taxes,
    totalPaid: totalPaid || roundMoney(serviceBase + commission + taxes),
    estimatedTotalBase: null,
    estimatedRemainingBase: null,
    estimatedTotalWithFees: null,
    estimatedRemainingCommission: null,
    estimatedRemainingTaxes: null,
    estimatedRemainingTotal: null,
    balanceDueNow: 0,
    balanceDueTotal: null,
    isFullyPaid: true,
    titleKey: "payment.confirmed",
    descKey: "payment.confirmedDesc",
  };
}

export interface ClientPaymentSummary {
  variant: "full" | "hourly_deposit_paid";
  serviceBase: number;
  hourlyRate: number | null;
  hoursLabel: number | null;
  hoursIsApproved: boolean;
  depositPaid: number;
  remainingBase: number;
  remainingCommission: number;
  remainingTaxes: number;
  remainingTotal: number;
  estimatedTotalWithFees: number;
  buyerCommission: number;
  taxes: number;
  total: number;
}

/** Payment summary card in booking detail (client view). */
export function buildClientPaymentSummary(booking: BookingFields): ClientPaymentSummary {
  const taxRate = resolveTaxRate(booking);
  const isHourly = isHourlyBooking(booking);
  const hourlyRate = isHourly && Number.isFinite(Number(booking.price)) ? Number(booking.price) : null;
  const approvedH = Number(booking.approved_hours_total) || 0;
  const estimatedH = booking.estimated_hours != null ? Number(booking.estimated_hours) : null;
  const estimatedBase = resolveBookingCheckoutBase(booking);
  const depositPaid =
    Number(booking.paid_service_base_cents || 0) / 100 ||
    (booking.deposit_amount_cents ? booking.deposit_amount_cents / 100 : 0);

  if (isHourly && booking.payment_status === "deposit_paid") {
    const balanceDueNow = computeHourlyBalanceDueCents(booking) / 100;
    const fullServiceBase =
      approvedH > 0 && hourlyRate != null
        ? roundMoney(hourlyRate * approvedH)
        : estimatedBase;
    const remainingFees = computeHourlyBalanceCheckoutTotal(
      fullServiceBase,
      depositPaid,
      taxRate,
    );
    const estimateFees = computeServiceCheckoutTotal(estimatedBase, taxRate);

    return {
      variant: "hourly_deposit_paid",
      serviceBase: estimatedBase,
      hourlyRate,
      hoursLabel: approvedH > 0 ? approvedH : estimatedH,
      hoursIsApproved: approvedH > 0,
      depositPaid,
      remainingBase: remainingFees.balanceBase,
      remainingCommission: remainingFees.commission,
      remainingTaxes: remainingFees.taxes,
      remainingTotal: remainingFees.total,
      estimatedTotalWithFees: estimateFees.total,
      buyerCommission: 0,
      taxes: 0,
      total: depositPaid,
    };
  }

  const serviceBase =
    isHourly && booking.payment_status === "paid"
      ? getEffectiveBookingPrice(booking)
      : estimatedBase;
  const fees = computeServiceCheckoutTotal(serviceBase, taxRate);

  return {
    variant: "full",
    serviceBase,
    hourlyRate,
    hoursLabel: isHourly && approvedH > 0 ? approvedH : isHourly ? estimatedH : null,
    hoursIsApproved: isHourly && approvedH > 0,
    depositPaid: 0,
    remainingBase: 0,
    remainingCommission: 0,
    remainingTaxes: 0,
    remainingTotal: 0,
    estimatedTotalWithFees: fees.total,
    buyerCommission: fees.commission,
    taxes: fees.taxes,
    total: fees.total,
  };
}
