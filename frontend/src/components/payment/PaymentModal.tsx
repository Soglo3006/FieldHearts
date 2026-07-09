"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";
import PaymentInlinePanel from "@/components/payment/PaymentInlinePanel";
import type { DepositConfig } from "@/lib/deposit";
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
}: Omit<Props, "open">) {
  const { t } = useTranslation();
  const router = useRouter();
  useScrollLock(true);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-900 text-base">{headerTitle}</span>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Payment panel */}
        <PaymentInlinePanel
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
          onPaymentSuccess={() => {
            onClose();
            router.push(`/payment/success?booking_id=${bookingId}`);
          }}
        />
      </div>
    </div>
  );
}

export default function PaymentModal({ open, ...rest }: Props) {
  if (!open) return null;
  return <PaymentModalInner {...rest} />;
}
