"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PaymentModal from "@/components/payment/PaymentModal";
import type { CheckoutKind } from "@/lib/hourlyPayment";

interface Props {
  bookingId: string;
  accessToken: string;
  fullWidth?: boolean;
  bookingTitle?: string;
  price?: number;
  clientProvince?: string | null;
  taxRateStored?: number | null;
  checkoutKind?: CheckoutKind | null;
  onPayNow?: () => void;
}

export default function PayNowButton({
  bookingId, accessToken, fullWidth,
  bookingTitle = "", price = 0, clientProvince = null,
  checkoutKind = "full",
  onPayNow,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const buttonLabel =
    checkoutKind === "deposit"
      ? t("payment.payDepositLabel")
      : checkoutKind === "balance"
        ? t("payment.payBalanceLabel")
        : t("payment.confirmNow");

  const handleClick = () => {
    if (onPayNow) {
      onPayNow();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        size={fullWidth ? "default" : "sm"}
        className={`bg-green-700 hover:bg-green-800 text-white gap-1.5 ${fullWidth ? "w-full h-11" : "flex-1"}`}
        onClick={handleClick}
      >
        {buttonLabel}
      </Button>
      <p className="text-center text-xs text-gray-400">
        {t("payNowButton.agreement")}{" "}
        <Link href="/payment-terms" className="text-green-700 hover:underline">{t("footer.paymentTerms")}</Link>
      </p>

      {/* Standalone cards open the same centered modal used by booking details. */}
      {!onPayNow && (
        <PaymentModal
          open={open}
          onClose={() => setOpen(false)}
          bookingId={bookingId}
          bookingTitle={bookingTitle}
          price={price}
          accessToken={accessToken}
          clientProvince={clientProvince}
        />
      )}
    </>
  );
}
