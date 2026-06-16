"use client";

import { useTranslation } from "react-i18next";
import { calculateDepositAmount, type DepositConfig } from "@/lib/deposit";

type Props = {
  price: number;
  depositConfig?: DepositConfig | null;
  depositAmountCents?: number | null;
};

export function PaymentDepositRows({ price, depositConfig, depositAmountCents }: Props) {
  const { t } = useTranslation();
  const deposit =
    depositAmountCents != null && depositAmountCents > 0
      ? depositAmountCents / 100
      : calculateDepositAmount(price, depositConfig);

  if (deposit <= 0) return null;

  return (
    <>
      <div className="flex justify-between text-green-800 bg-green-50 -mx-1 px-1 py-1 rounded-lg">
        <div>
          <div className="font-medium">{t("deposit.paymentLine")}</div>
          <div className="text-xs text-green-700">{t("deposit.nonRefundableNotice")}</div>
        </div>
        <span className="font-medium">{deposit.toFixed(2)} $</span>
      </div>
      <p className="text-xs text-gray-500">{t("deposit.cancelPolicy")}</p>
    </>
  );
}
