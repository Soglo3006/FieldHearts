import { getTaxRate } from "@/lib/taxes";
import {
  computeHourlyBalanceDueCents,
  computeBalanceDueCents,
  isHourlyBooking,
  usesSplitDepositPayment,
  type CheckoutKind,
} from "@/lib/hourlyPayment";
import { resolveBookingCheckoutBase, getEffectiveBookingPrice } from "@/lib/listingPrice";
import { calculateDepositAmount, resolveDepositBaseAmount } from "@/lib/deposit";

export type PaidCheckoutKind = CheckoutKind;

export interface LatestPaymentInfo {
  amount: number;
  platform_fee: number;
  payment_kind?: string | null;
}

export interface SplitDepositFullReceipt {
  fullServiceBase: number;
  fullCommission: number;
  fullTaxes: number;
  fullTotalWithFees: number;
  depositPaid: number;
  balanceBase: number;
  balanceCommission: number;
  balanceTaxes: number;
  balanceTotal: number;
  grandTotalPaid: number;
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
  splitDepositFullReceipt: SplitDepositFullReceipt | null;
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
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
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

function resolveFullServiceBaseForReceipt(booking: BookingFields): number {
  if (isHourlyBooking(booking) && Number(booking.approved_hours_total) > 0) {
    return roundMoney(Number(booking.price) * Number(booking.approved_hours_total));
  }
  return resolveBookingCheckoutBase(booking);
}

function resolveDepositPaidBase(booking: BookingFields, fullServiceBase: number, balanceBase: number): number {
  const fromResolve = resolveDepositPaidCents(booking) / 100;
  if (fromResolve > 0) return fromResolve;
  return Math.max(0, roundMoney(fullServiceBase - balanceBase));
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

  const estimatedTotalBase =
    kind === "deposit" ? resolveBookingCheckoutBase(booking) : null;
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
    const descKey = isHourlyBooking(booking)
      ? "payment.confirmedDepositDesc"
      : "payment.confirmedDepositDescFixed";
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
      splitDepositFullReceipt: null,
      titleKey: "payment.confirmedDeposit",
      descKey,
    };
  }

  if (kind === "balance") {
    const fullServiceBase = resolveFullServiceBaseForReceipt(booking);
    const inferredBalanceBase = Math.max(0, roundMoney(totalPaid - commission - taxes));
    const depositPaidBase = resolveDepositPaidBase(booking, fullServiceBase, inferredBalanceBase);
    const splitFees = computeHourlyBalanceCheckoutTotal(fullServiceBase, depositPaidBase, taxRate);
    const balanceBase = splitFees.balanceBase;
    const balanceCommission = splitFees.commission;
    const balanceTaxes = splitFees.taxes;
    const balanceTotal = totalPaid > 0 ? totalPaid : splitFees.total;

    let splitDepositFullReceipt: SplitDepositFullReceipt | null = null;
    const hadSplitDeposit =
      usesSplitDepositPayment(booking) ||
      (Number(booking.deposit_amount_cents || 0) > 0 && depositPaidBase > 0);
    if (hadSplitDeposit && isFullyPaid) {
      const fullFees = computeServiceCheckoutTotal(fullServiceBase, taxRate);
      splitDepositFullReceipt = {
        fullServiceBase,
        fullCommission: fullFees.commission,
        fullTaxes: fullFees.taxes,
        fullTotalWithFees: fullFees.total,
        depositPaid: depositPaidBase,
        balanceBase,
        balanceCommission,
        balanceTaxes,
        balanceTotal,
        grandTotalPaid: roundMoney(depositPaidBase + balanceTotal),
      };
    }

    return {
      kind: "balance",
      serviceBase: balanceBase,
      commission: balanceCommission,
      taxes: balanceTaxes,
      totalPaid: balanceTotal,
      estimatedTotalBase: fullServiceBase,
      estimatedRemainingBase: balanceDueNow > 0 ? balanceDueNow : null,
      estimatedTotalWithFees: computeServiceCheckoutTotal(fullServiceBase, taxRate).total,
      estimatedRemainingCommission: balanceDueFees?.commission ?? null,
      estimatedRemainingTaxes: balanceDueFees?.taxes ?? null,
      estimatedRemainingTotal: balanceDueFees?.total ?? null,
      balanceDueNow,
      balanceDueTotal: balanceDueFees?.total ?? null,
      isFullyPaid,
      splitDepositFullReceipt,
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
    splitDepositFullReceipt: null,
    titleKey: "payment.confirmed",
    descKey: "payment.confirmedDesc",
  };
}

export interface ClientPaymentSummary {
  variant: "full" | "split_deposit_paid";
  serviceBase: number;
  hourlyRate: number | null;
  hoursLabel: number | null;
  hoursIsApproved: boolean;
  /** True when approved hours differ from the original estimate. */
  hoursChanged: boolean;
  estimatedHours: number | null;
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

/** After deposit + balance are both paid — full receipt for modals / success page. */
export function buildSplitDepositFullReceipt(booking: BookingFields): SplitDepositFullReceipt | null {
  if (!usesSplitDepositPayment(booking)) return null;
  if (booking.payment_status !== "paid" && booking.payment_status !== "transferred") return null;

  const depositPaid = resolveDepositPaidCents(booking) / 100;
  if (depositPaid < 0.01) return null;

  const taxRate = resolveTaxRate(booking);
  const fullServiceBase = resolveFullServiceBaseForReceipt(booking);
  const fullFees = computeServiceCheckoutTotal(fullServiceBase, taxRate);
  const splitFees = computeHourlyBalanceCheckoutTotal(fullServiceBase, depositPaid, taxRate);

  return {
    fullServiceBase,
    fullCommission: fullFees.commission,
    fullTaxes: fullFees.taxes,
    fullTotalWithFees: fullFees.total,
    depositPaid,
    balanceBase: splitFees.balanceBase,
    balanceCommission: splitFees.commission,
    balanceTaxes: splitFees.taxes,
    balanceTotal: splitFees.total,
    grandTotalPaid: roundMoney(depositPaid + splitFees.total),
  };
}

/** Deposit actually paid (cents). Never confuse with full paid_service_base after balance. */
export function resolveDepositPaidCents(booking: BookingFields): number {
  const paidBase = Number(booking.paid_service_base_cents || 0);
  const storedDeposit = Number(booking.deposit_amount_cents || 0);
  const status = booking.payment_status ?? null;
  const fullyPaid = status === "paid" || status === "transferred";
  /** Balance checkout used to overwrite deposit_amount_cents with the full service base. */
  const storedLooksLikeFullBase = fullyPaid && paidBase > 0 && storedDeposit === paidBase;

  // Prefer the stored deposit when it still looks like the real deposit charge.
  if (storedDeposit > 0 && !storedLooksLikeFullBase) {
    if (paidBase === storedDeposit * 2 && status === "deposit_paid") {
      return storedDeposit;
    }
    if (fullyPaid || paidBase > storedDeposit) {
      return storedDeposit;
    }
  }

  if (usesSplitDepositPayment(booking)) {
    const base = resolveDepositBaseAmount(booking, booking);
    if (base != null) {
      const expected = Math.round(
        calculateDepositAmount(base, {
          deposit_enabled: true,
          deposit_type: booking.deposit_type,
          deposit_value: booking.deposit_value,
        }) * 100,
      );
      if (expected > 0) {
        if (paidBase === expected * 2) return expected;
        if (storedDeposit === expected * 2 && paidBase === storedDeposit) return expected;
        // After hours increase / balance pay, paid base grows past the original deposit.
        if (paidBase > expected && (fullyPaid || status === "deposit_paid")) {
          if (storedDeposit <= 0 || storedLooksLikeFullBase || storedDeposit === paidBase) {
            return expected;
          }
        }
      }
    }
  }

  // While only the deposit is paid, paid_service_base_cents is the deposit.
  if (status === "deposit_paid" && paidBase > 0 && !storedLooksLikeFullBase) {
    return paidBase;
  }

  if (storedDeposit > 0 && !storedLooksLikeFullBase) {
    return storedDeposit;
  }

  return paidBase;
}

/** Payment summary card in booking detail (client view). */
export function buildClientPaymentSummary(booking: BookingFields): ClientPaymentSummary {
  const taxRate = resolveTaxRate(booking);
  const isHourly = isHourlyBooking(booking);
  const hourlyRate = isHourly && Number.isFinite(Number(booking.price)) ? Number(booking.price) : null;
  const approvedH = Number(booking.approved_hours_total) || 0;
  const estimatedH = booking.estimated_hours != null ? Number(booking.estimated_hours) : null;
  const estimatedBase = resolveBookingCheckoutBase(booking);
  const depositPaid = resolveDepositPaidCents(booking) / 100;

  if (
    usesSplitDepositPayment(booking) &&
    booking.payment_status === "deposit_paid"
  ) {
    const hasApprovedHours = isHourly && approvedH > 0 && hourlyRate != null;
    const fullServiceBase = hasApprovedHours
      ? roundMoney(hourlyRate! * approvedH)
      : estimatedBase;
    const remainingFees = computeHourlyBalanceCheckoutTotal(
      fullServiceBase,
      depositPaid,
      taxRate,
    );
    const currentFees = computeServiceCheckoutTotal(fullServiceBase, taxRate);
    const hoursChanged =
      hasApprovedHours &&
      estimatedH != null &&
      Number.isFinite(estimatedH) &&
      estimatedH > 0 &&
      Math.abs(approvedH - estimatedH) >= 0.01;

    return {
      variant: "split_deposit_paid",
      serviceBase: fullServiceBase,
      hourlyRate,
      hoursLabel: hasApprovedHours ? approvedH : estimatedH,
      hoursIsApproved: hasApprovedHours,
      hoursChanged,
      estimatedHours: estimatedH != null && Number.isFinite(estimatedH) ? estimatedH : null,
      depositPaid,
      remainingBase: remainingFees.balanceBase,
      remainingCommission: remainingFees.commission,
      remainingTaxes: remainingFees.taxes,
      remainingTotal: remainingFees.total,
      estimatedTotalWithFees: currentFees.total,
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
    hoursChanged: false,
    estimatedHours: estimatedH != null && Number.isFinite(estimatedH) ? estimatedH : null,
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
