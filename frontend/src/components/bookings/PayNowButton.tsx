"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PaymentModal from "@/components/payment/PaymentModal";
import LinkLabelWithLoadingSpinner from "@/components/ui/LinkLabelWithLoadingSpinner";
import {
  type CheckoutKind,
  usesFullUpfrontDepositPayment,
} from "@/lib/hourlyPayment";
import type { DepositConfig } from "@/lib/deposit";

interface Props {
  bookingId: string;
  accessToken: string;
  fullWidth?: boolean;
  showAgreementText?: boolean;
  bookingTitle?: string;
  price?: number;
  clientProvince?: string | null;
  taxRateStored?: number | null;
  checkoutKind?: CheckoutKind | null;
  depositConfig?: DepositConfig | null;
  depositAmountCents?: number | null;
  fullServiceBase?: number | null;
  pricingMode?: string | null;
  onPayNow?: () => void;
}

export default function PayNowButton({
  bookingId, accessToken, fullWidth,
  showAgreementText = true,
  bookingTitle = "", price = 0, clientProvince = null,
  checkoutKind = "full",
  depositConfig = null,
  depositAmountCents = null,
  fullServiceBase = null,
  pricingMode = null,
  onPayNow,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
  }, []);
  const showsFullDepositCopy =
    checkoutKind === "full" &&
    usesFullUpfrontDepositPayment(
      {
        status: "accepted",
        pricing_mode: pricingMode,
        price,
        deposit_enabled: depositConfig?.deposit_enabled,
        deposit_type: depositConfig?.deposit_type,
        deposit_value: depositConfig?.deposit_value,
      },
      depositConfig,
    );

  const buttonLabel =
    checkoutKind === "deposit" || showsFullDepositCopy
      ? t("payment.payDepositLabel")
      : checkoutKind === "balance"
        ? t("payment.payBalanceLabel")
        : t("payment.confirmNow");

  const handleClick = () => {
    if (onPayNow) {
      setIsNavigating(true);
      onPayNow();
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => setIsNavigating(false), 320);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        size={fullWidth ? "default" : "sm"}
        className={`bg-green-700 hover:bg-green-800 text-white gap-1.5 ${fullWidth ? "w-full h-11" : "w-full justify-center"} ${isNavigating ? "pointer-events-none opacity-90" : ""}`}
        onClick={handleClick}
        disabled={isNavigating}
        aria-busy={isNavigating}
      >
        <LinkLabelWithLoadingSpinner label={buttonLabel} loading={isNavigating} />
      </Button>
      {showAgreementText && (
        <p className="text-center text-xs text-gray-400">
          {t("payNowButton.agreement")}{" "}
          <Link href="/payment-terms" className="text-green-700 hover:underline">{t("footer.paymentTerms")}</Link>
        </p>
      )}

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
          checkoutKind={checkoutKind}
          depositConfig={depositConfig}
          depositAmountCents={depositAmountCents}
          fullServiceBase={fullServiceBase}
          pricingMode={pricingMode}
        />
      )}
    </>
  );
}
