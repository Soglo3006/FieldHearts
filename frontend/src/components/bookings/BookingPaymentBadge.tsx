"use client";

import { useTranslation } from "react-i18next";
import type { DepositConfig } from "@/lib/deposit";
import {
  resolvePaymentBadgeDisplay,
  type BookingPaymentFields,
} from "@/lib/hourlyPayment";

type Props = {
  booking: BookingPaymentFields;
  depositConfig?: DepositConfig | null;
  /** False for provider waiting on client's balance payment. */
  viewerPaysBalance?: boolean;
};

export default function BookingPaymentBadge({
  booking,
  depositConfig,
  viewerPaysBalance = true,
}: Props) {
  const { t } = useTranslation();
  const display = resolvePaymentBadgeDisplay(booking, depositConfig, { viewerPaysBalance });
  if (!display) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${display.className}`}
    >
      {t(display.labelKey)}
    </span>
  );
}
