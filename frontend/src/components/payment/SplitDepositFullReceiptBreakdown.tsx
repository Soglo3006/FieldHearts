"use client";

import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { formatTaxRate } from "@/lib/taxes";
import { isWorkBasedPricingMode } from "@/lib/hourlyPayment";
import { formatHourlyRateSubtext } from "@/lib/workHours";
import type { SplitDepositFullReceipt } from "@/lib/paymentSuccessSummary";

type Props = SplitDepositFullReceipt & {
  taxRate?: number;
  taxLabel?: string;
  pricingMode?: string | null;
  hourlyRate?: number | null;
  hoursLabel?: number | null;
  fmt?: (n: number) => string;
};

const EPSILON = 0.005;

export function SplitDepositFullReceiptBreakdown({
  fullServiceBase,
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
  const balanceLabelKey = isWorkBased ? "payment.balanceAmountFixed" : "payment.balanceAmountHourly";

  const hourlySubtext =
    hourlyRate != null && hoursLabel != null
      ? formatHourlyRateSubtext(hourlyRate, hoursLabel, fmt, t)
      : null;

  const showBalanceBase = balanceBase > EPSILON;
  const showBalanceCommission = balanceCommission > EPSILON;
  const showBalanceTaxes = balanceTaxes > EPSILON;
  const showBalanceDetails = showBalanceBase || showBalanceCommission || showBalanceTaxes;
  /** Deposit already equals service base — don't repeat the same amount above. */
  const showServiceLine = Math.abs(fullServiceBase - depositPaid) > EPSILON;

  return (
    <>
      {(showServiceLine || hourlySubtext) && (
        <div className="mb-2 space-y-1">
          {showServiceLine && (
            <div className="flex justify-between text-sm text-gray-700">
              <span>{t(isWorkBased ? "payment.servicePrice" : "payment.estimatedServiceTotal")}</span>
              <span className="font-medium text-gray-900">{fmt(fullServiceBase)} $</span>
            </div>
          )}
          {hourlySubtext && (
            <p className="text-xs text-gray-500">{hourlySubtext}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between rounded-lg bg-green-50 px-2 py-1.5 text-green-700 -mx-1">
          <span className="font-medium">{t("payment.depositPaidLine")}</span>
          <span className="font-semibold">{fmt(depositPaid)} $</span>
        </div>

        {balanceTotal > EPSILON && (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>{t("payment.balancePaidTransaction")}</span>
              <span>{fmt(balanceTotal)} $</span>
            </div>
            {showBalanceDetails && (
              <>
                {showBalanceBase && (
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>{t(balanceLabelKey)}</span>
                    <span className="font-medium">{fmt(balanceBase)} $</span>
                  </div>
                )}
                {showBalanceCommission && (
                  <div className="flex justify-between text-sm text-gray-700">
                    <div>
                      <div>{t("payment.buyerCommission")}</div>
                      <div className="text-xs text-red-500">{t("payment.nonRefundable")}</div>
                    </div>
                    <span>{fmt(balanceCommission)} $</span>
                  </div>
                )}
                {showBalanceTaxes && (
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
                )}
              </>
            )}
          </div>
        )}
      </div>

      <Separator className="my-3" />

      <div className="flex justify-between text-base font-bold text-gray-900">
        <span>{t("payment.grandTotalPaid")}</span>
        <span className="text-green-700">{fmt(grandTotalPaid)} $</span>
      </div>
    </>
  );
}
