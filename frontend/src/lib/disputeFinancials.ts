import { getTaxRate } from "@/lib/taxes";

type BookingFinancialInput = {
  price: string | number;
  custom_price?: number | null;
  tax_rate?: number | null;
  client_province?: string | null;
  payment_status?: string | null;
  dispute_status?: "open" | "resolved" | "rejected" | null;
  dispute_refund_percentage?: number | null;
};

type DisputeFinancialOutcome = {
  totalPaidOriginal: number;
  refundableBase: number;
  workerReceivesOriginal: number;
  refundedBase: number | null;
  refundedTaxes: number | null;
  refundedAmount: number | null;
  finalClientPaid: number | null;
  finalWorkerReceives: number | null;
  hasFinancialAdjustment: boolean;
  refundType: "full" | "partial" | "none" | null;
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function getBookingDisputeFinancialOutcome(booking: BookingFinancialInput): DisputeFinancialOutcome {
  const basePrice = Number(booking.custom_price ?? booking.price ?? 0);
  const taxRate = booking.tax_rate ? Number(booking.tax_rate) : getTaxRate(booking.client_province ?? "QC");
  const buyerCommission = roundMoney(basePrice * 0.05);
  const taxes = roundMoney(basePrice * taxRate);
  const totalPaidOriginal = roundMoney(basePrice + buyerCommission + taxes);
  const refundableBase = basePrice; // only base is refundable (taxes proportional, buyer fee never)
  const workerReceivesOriginal = roundMoney(basePrice * 0.8);

  const noAdjustment = (): DisputeFinancialOutcome => ({
    totalPaidOriginal,
    refundableBase,
    workerReceivesOriginal,
    refundedBase: null,
    refundedTaxes: null,
    refundedAmount: null,
    finalClientPaid: null,
    finalWorkerReceives: null,
    hasFinancialAdjustment: false,
    refundType: booking.dispute_status === "resolved" || booking.dispute_status === "rejected" ? "none" : null,
  });

  const pct = booking.dispute_status === "resolved" && booking.dispute_refund_percentage
    ? Number(booking.dispute_refund_percentage) / 100
    : null;

  if (pct === null || pct <= 0 || basePrice <= 0) {
    return noAdjustment();
  }

  const refundedBase = roundMoney(basePrice * pct);
  const refundedTaxes = roundMoney(refundedBase * taxRate);
  const refundedAmount = roundMoney(refundedBase + refundedTaxes); // total back to client
  const finalClientPaid = roundMoney(totalPaidOriginal - refundedAmount);
  const finalWorkerReceives = roundMoney(workerReceivesOriginal - refundedBase * 0.8);

  return {
    totalPaidOriginal,
    refundableBase,
    workerReceivesOriginal,
    refundedBase,
    refundedTaxes,
    refundedAmount,
    finalClientPaid,
    finalWorkerReceives,
    hasFinancialAdjustment: booking.payment_status === "refunded" || refundedAmount > 0,
    refundType: pct >= 1 ? "full" : "partial",
  };
}
