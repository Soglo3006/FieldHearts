"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import PaymentInlinePanel, {
  type PaymentInlinePanelHandle,
  type PaymentInlinePhase,
} from "@/components/payment/PaymentInlinePanel";
import type { DepositConfig } from "@/lib/deposit";
import { bookingBtnGreen, bookingBtnNeutral } from "@/components/bookings/bookingButtonStyles";
import { cn } from "@/lib/utils";
import {
  type CheckoutKind,
  usesFullUpfrontDepositPayment,
} from "@/lib/hourlyPayment";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingTitle: string;
  price: number;
  accessToken: string;
  clientProvince: string | null;
  depositConfig?: DepositConfig | null;
  depositAmountCents?: number | null;
  checkoutKind?: CheckoutKind | null;
  fullServiceBase?: number | null;
  pricingMode?: string | null;
  onPaymentSuccess?: () => void | Promise<void>;
  /** Parent should freeze list/card data while true (payment confirmation in flight) — otherwise a
   * realtime refresh can flip the booking's needsPayment/balanceDue flag and unmount this modal mid-payment. */
  onPaymentLockChange?: (locked: boolean) => void;
  /** Called (with bookingId) when the user backs out of the success receipt — opens the full,
   * now-updated booking detail instead of just dropping back to the plain list. */
  onViewDetail?: (bookingId: string) => void;
}

function PaymentModalInner({
  onClose,
  bookingId,
  bookingTitle,
  price,
  accessToken,
  clientProvince,
  depositConfig,
  depositAmountCents,
  checkoutKind = "full",
  fullServiceBase = null,
  pricingMode = null,
  onPaymentSuccess,
  onPaymentLockChange,
  onViewDetail,
}: Omit<Props, "open">) {
  const { t } = useTranslation();
  useScrollLock(true);
  const paymentPanelRef = useRef<PaymentInlinePanelHandle>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentInlinePhase>("billing");
  /** Blocks backdrop/X ghost-clicks around the Stripe iframe teardown while confirming. */
  const suppressCloseUntilRef = useRef(0);
  const prevPhaseRef = useRef<PaymentInlinePhase>("billing");

  const handlePhaseChange = useCallback((phase: PaymentInlinePhase) => {
    setPaymentPhase(phase);
    if (phase === "confirming") {
      suppressCloseUntilRef.current = Date.now() + 5000;
      onPaymentLockChange?.(true);
    } else if (prevPhaseRef.current === "confirming") {
      suppressCloseUntilRef.current = Date.now() + 800;
    }
    prevPhaseRef.current = phase;
  }, [onPaymentLockChange]);

  const requestClose = useCallback((opts?: { viewDetail?: boolean }) => {
    if (paymentPhase === "confirming") return;
    if (Date.now() < suppressCloseUntilRef.current) return;
    onPaymentLockChange?.(false);
    if (opts?.viewDetail) onViewDetail?.(bookingId);
    onClose();
  }, [paymentPhase, onClose, onPaymentLockChange, onViewDetail, bookingId]);

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

  const headerTitle =
    checkoutKind === "deposit" || showsFullDepositCopy
      ? t("payment.payDepositLabel")
      : checkoutKind === "balance"
        ? t("payment.payBalanceLabel")
        : t("payment.completePayment");

  const handleBack = () => {
    if (paymentPanelRef.current?.goBack()) return;
    requestClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="absolute inset-0"
        onClick={() => requestClose()}
        onPointerDown={(e) => {
          if (paymentPhase === "confirming") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          {paymentPhase === "card" || paymentPhase === "success" ? (
            <button
              type="button"
              onClick={paymentPhase === "success" ? () => requestClose({ viewDetail: true }) : handleBack}
              aria-label={t("common.back")}
              className="-ml-1 flex shrink-0 cursor-pointer items-center justify-center p-1 text-gray-500 transition-colors hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-7 shrink-0" aria-hidden />
          )}
          <span className="flex-1 truncate text-center text-base font-semibold text-gray-900">
            {paymentPhase === "confirming"
              ? t("payment.confirmingPayment")
              : paymentPhase === "success"
                ? t("payment.confirmationTitle")
                : headerTitle}
          </span>
          <button
            type="button"
            onClick={() => requestClose()}
            disabled={paymentPhase === "confirming"}
            aria-label={t("common.close")}
            className="cursor-pointer shrink-0 text-gray-400 hover:text-gray-600 transition-colors disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Payment panel */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PaymentInlinePanel
            ref={paymentPanelRef}
            bookingId={bookingId}
            bookingTitle={bookingTitle}
            price={price}
            accessToken={accessToken}
            clientProvince={clientProvince}
            depositConfig={depositConfig}
            depositAmountCents={depositAmountCents}
            checkoutKind={checkoutKind}
            fullServiceBase={fullServiceBase}
            pricingMode={pricingMode}
            onPhaseChange={handlePhaseChange}
            onPaymentSuccess={onPaymentSuccess}
            successActions={
              <div className="flex flex-col gap-2.5">
                <Link href="/bookings?payment=success" onClick={() => requestClose()}>
                  <Button className={cn("h-12 w-full rounded-xl", bookingBtnGreen)}>
                    {t("payment.viewBookings")}
                  </Button>
                </Link>
                <Button variant="outline" className={cn("h-12 w-full rounded-xl", bookingBtnNeutral)} onClick={() => requestClose()}>
                  {t("common.close")}
                </Button>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function PaymentModal({ open, ...rest }: Props) {
  if (!open) return null;
  return <PaymentModalInner {...rest} />;
}
