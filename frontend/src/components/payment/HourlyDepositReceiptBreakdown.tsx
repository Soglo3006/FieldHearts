"use client";

import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { formatTaxRate } from "@/lib/taxes";
import { isWorkBasedPricingMode } from "@/lib/hourlyPayment";

export type HourlyDepositReceiptProps = {
  depositPaid: number;
  serviceBase: number;
  hourlyRate: number | null;
  hoursLabel: number | null;
  hoursIsApproved?: boolean;
  estimatedTotalWithFees: number;
  remainingBase: number;
  remainingCommission: number;
  remainingTaxes: number;
  remainingTotal: number;
  taxRate?: number;
  taxLabel?: string;
  pricingMode?: string | null;
  fmt?: (n: number) => string;
};

export function HourlyDepositReceiptBreakdown({
  depositPaid,
  serviceBase,
  hourlyRate,
  hoursLabel,
  estimatedTotalWithFees,
  remainingBase,
  remainingCommission,
  remainingTaxes,
  remainingTotal,
  taxRate,
  taxLabel,
  pricingMode = null,
  fmt = (n) => n.toFixed(2),
}: HourlyDepositReceiptProps) {
  const { t } = useTranslation();
  const isWorkBased = isWorkBasedPricingMode(pricingMode);

  const serviceTotalKey = isWorkBased ? "payment.servicePrice" : "payment.estimatedServiceTotal";
  const totalWithFeesKey = isWorkBased ? "payment.totalWithFees" : "payment.estimatedTotalWithFees";
  const remainingHeaderKey = isWorkBased ? "payment.remainingTotalDue" : "payment.estimatedRemaining";
  const remainingFooterKey = isWorkBased ? "payment.remainingAfterWork" : "payment.remainingAfterHours";
  const balanceLabelKey = isWorkBased ? "payment.balanceAmountFixed" : "payment.balanceAmount";

  const hourlySubtext =
    hourlyRate != null && hoursLabel != null
      ? `${fmt(hourlyRate)} $/h × ${hoursLabel} h`
      : null;

  return (
    <>
      <p className="text-xs text-gray-600 pt-1">{t("payment.depositFeesDeferredNotice")}</p>

      <Separator className="my-3" />

      <div className="space-y-2">
        <div className="flex justify-between text-gray-700">
          <div>
            <div className="font-medium">{t(serviceTotalKey)}</div>
            {hourlySubtext && (
              <div className="text-xs text-gray-600 mt-0.5">{hourlySubtext}</div>
            )}
          </div>
          <span className="font-medium text-gray-900">{fmt(serviceBase)} $</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>{t(totalWithFeesKey)}</span>
          <span className="font-medium text-gray-900">{fmt(estimatedTotalWithFees)} $</span>
        </div>
        <div className="flex justify-between text-gray-600 text-sm">
          <span>{t("bookings.minusDepositPaid")}</span>
          <span>−{fmt(depositPaid)} $</span>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
        <div className="flex justify-between text-gray-900 font-semibold">
          <span>{t(remainingHeaderKey)}</span>
          <span>{fmt(remainingTotal)} $</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700">
          <span>{t(balanceLabelKey)}</span>
          <span className="font-medium">{fmt(remainingBase)} $</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700">
          <div>
            <div>{t("payment.buyerCommission")}</div>
            <div className="text-xs text-red-500">{t("payment.nonRefundable")}</div>
          </div>
          <span>{fmt(remainingCommission)} $</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700">
          <div>
            <div>
              {t("payment.taxes")}
              {taxRate != null ? ` (${formatTaxRate(taxRate)}%)` : ""}
            </div>
            {taxLabel && <div className="text-xs text-gray-600">{taxLabel}</div>}
          </div>
          <span>{fmt(remainingTaxes)} $</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-2">{t(remainingFooterKey)}</p>
    </>
  );
}
