"use client";

import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { formatTaxRate } from "@/lib/taxes";
import { isWorkBasedPricingMode } from "@/lib/hourlyPayment";
import type { SplitDepositFullReceipt } from "@/lib/paymentSuccessSummary";

type Props = SplitDepositFullReceipt & {
  taxRate?: number;
  taxLabel?: string;
  pricingMode?: string | null;
  hourlyRate?: number | null;
  hoursLabel?: number | null;
  fmt?: (n: number) => string;
};

export function SplitDepositFullReceiptBreakdown({
  fullServiceBase,
  fullCommission,
  fullTaxes,
  fullTotalWithFees,
  depositPaid,
  balanceBase,
  balanceCommission,
  balanceTaxes,
  balanceTotal,
  grandTotalPaid,
  taxRate,
  taxLabel,
  pricingMode = null,
  hourlyRate = null,
  hoursLabel = null,
  fmt = (n) => n.toFixed(2),
}: Props) {
  const { t } = useTranslation();
  const isWorkBased = isWorkBasedPricingMode(pricingMode);
  const serviceTotalKey = isWorkBased ? "payment.servicePrice" : "payment.estimatedServiceTotal";
  const totalWithFeesKey = isWorkBased ? "payment.totalWithFees" : "payment.estimatedTotalWithFees";
  const balanceLabelKey = isWorkBased ? "payment.balanceAmountFixed" : "payment.balanceAmountHourly";

  const hourlySubtext =
    hourlyRate != null && hoursLabel != null
      ? `${fmt(hourlyRate)} $/h × ${hoursLabel} h`
      : null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between text-gray-700">
          <div>
            <div className="font-medium">{t(serviceTotalKey)}</div>
            {hourlySubtext && (
              <div className="text-xs text-gray-600 mt-0.5">{hourlySubtext}</div>
            )}
          </div>
          <span className="font-medium text-gray-900">{fmt(fullServiceBase)} $</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <div>
            <div>{t("payment.buyerCommission")}</div>
            <div className="text-xs text-red-400">{t("payment.nonRefundable")}</div>
          </div>
          <span>{fmt(fullCommission)} $</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <div>
            <div>
              {t("payment.taxes")}
              {taxRate != null ? ` (${formatTaxRate(taxRate)}%)` : ""}
            </div>
            {taxLabel && <div className="text-xs text-gray-400">{taxLabel}</div>}
          </div>
          <span>{fmt(fullTaxes)} $</span>
        </div>
        <div className="flex justify-between text-gray-800 font-medium pt-1 border-t border-gray-100">
          <span>{t(totalWithFeesKey)}</span>
          <span>{fmt(fullTotalWithFees)} $</span>
        </div>
      </div>

      <Separator className="my-3" />

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t("payment.paymentsBreakdown")}
      </p>

      <div className="space-y-2 mt-2">
        <div className="flex justify-between text-green-700 bg-green-50 -mx-1 px-2 py-1.5 rounded-lg">
          <span className="font-medium">{t("payment.depositPaidLine")}</span>
          <span className="font-semibold">{fmt(depositPaid)} $</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
          <div className="flex justify-between text-gray-900 font-semibold">
            <span>{t("payment.balancePaidTransaction")}</span>
            <span>{fmt(balanceTotal)} $</span>
          </div>
          <div className="flex justify-between text-sm text-gray-700">
            <span>{t(balanceLabelKey)}</span>
            <span className="font-medium">{fmt(balanceBase)} $</span>
          </div>
          <div className="flex justify-between text-sm text-gray-700">
            <div>
              <div>{t("payment.buyerCommission")}</div>
              <div className="text-xs text-red-500">{t("payment.nonRefundable")}</div>
            </div>
            <span>{fmt(balanceCommission)} $</span>
          </div>
          <div className="flex justify-between text-sm text-gray-700">
            <div>
              <div>
                {t("payment.taxes")}
                {taxRate != null ? ` (${formatTaxRate(taxRate)}%)` : ""}
              </div>
              {taxLabel && <div className="text-xs text-gray-600">{taxLabel}</div>}
            </div>
            <span>{fmt(balanceTaxes)} $</span>
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="flex justify-between font-bold text-base text-gray-900">
        <span>{t("payment.grandTotalPaid")}</span>
        <span className="text-green-700">{fmt(grandTotalPaid)} $</span>
      </div>
    </>
  );
}
