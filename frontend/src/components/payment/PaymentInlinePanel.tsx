"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LinkLabelWithLoadingSpinner from "@/components/ui/LinkLabelWithLoadingSpinner";
import BillingAddressSelector, { type BillingAddress } from "@/components/payment/BillingAddressSelector";
import PaymentCheckoutForm from "@/components/payment/PaymentCheckoutForm";
import PaymentSuccessReceipt from "@/components/payment/PaymentSuccessReceipt";
import { getTaxRate, getTaxLabel, formatTaxRate } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";
import { PaymentDepositRows } from "@/components/payment/PaymentDepositRows";
import type { DepositConfig } from "@/lib/deposit";
import {
  isWorkBasedPricingMode,
  usesFullUpfrontDepositPayment,
  type CheckoutKind,
} from "@/lib/hourlyPayment";
import { normalizePricingMode } from "@/lib/listingPrice";

export type PaymentInlinePhase = "billing" | "card" | "confirming" | "success";

export type PaymentInlinePanelHandle = {
  /** Returns true if back was handled (card → billing). */
  goBack: () => boolean;
};

interface Props {
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
  onPhaseChange?: (phase: PaymentInlinePhase) => void;
  /** Shown under the in-modal receipt (e.g. close / view bookings). */
  successActions?: ReactNode;
};

const PaymentInlinePanel = forwardRef<PaymentInlinePanelHandle, Props>(function PaymentInlinePanel(
  {
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
    onPhaseChange,
    successActions,
  },
  ref,
) {
  const { t, i18n } = useTranslation();
  const checkoutLocale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en" });

  const [billingAddresses, setBillingAddresses] = useState<BillingAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<BillingAddress | null>(null);
  const [billingConfirmed, setBillingConfirmed] = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [phase, setPhase] = useState<PaymentInlinePhase>("billing");

  const goToPhase = (next: PaymentInlinePhase) => {
    setPhase(next);
    onPhaseChange?.(next);
  };

  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (phase !== "card") return false;
      goToPhase("billing");
      return true;
    },
  }), [phase]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.publishable_key) setPublishableKey(data.publishable_key);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((addressData) => {
        const addresses: BillingAddress[] = Array.isArray(addressData) ? addressData : [];
        setBillingAddresses(addresses);
        setSelectedAddress(addresses.find((a) => a.is_default) ?? addresses[0] ?? null);
      })
      .finally(() => setLoadingAddresses(false));
  }, [accessToken]);

  useEffect(() => {
    setClientSecret(null);
    setPhase("billing");
    onPhaseChange?.("billing");
  }, [selectedAddress?.id, checkoutKind, onPhaseChange]);

  const handleAddAddress = async (data: Omit<BillingAddress, "id" | "is_default">) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const newAddr: BillingAddress = await res.json();
    if (res.ok) {
      setBillingAddresses((prev) => [...prev, newAddr]);
      setSelectedAddress(newAddr);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setBillingAddresses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      if (selectedAddress?.id === id) setSelectedAddress(updated[0] ?? null);
      return updated;
    });
  };

  const handleUpdateAddress = async (id: string, data: Omit<BillingAddress, "id" | "is_default">) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const updatedAddr: BillingAddress = await res.json();
    if (res.ok) {
      setBillingAddresses((prev) => prev.map((addr) => (addr.id === id ? updatedAddr : addr)));
      setSelectedAddress((prev) => (prev?.id === id ? updatedAddr : prev));
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses/${id}/default`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const defaultAddr: BillingAddress = await res.json();
    if (res.ok) {
      setBillingAddresses((prev) => prev.map((addr) => ({ ...addr, is_default: addr.id === id })));
      setSelectedAddress(defaultAddr);
      setBillingConfirmed(false);
    }
  };

  const handlePreparePayment = async () => {
    if (!billingConfirmed) {
      setError(t("payment.mustConfirmBilling"));
      return;
    }
    setPreparingPayment(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          booking_id: bookingId,
          locale: checkoutLocale,
          billing_address_id: selectedAddress?.id ?? null,
          billing_province: selectedAddress?.province ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("payment.paymentFailed"));
        setPreparingPayment(false);
        return;
      }
      setClientSecret(data.client_secret);
      goToPhase("card");
      setPreparingPayment(false);
    } catch {
      setError(t("payment.networkError"));
      setPreparingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setPaying(true);
    setError("");
    goToPhase("confirming");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    const verifyOnce = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ booking_id: bookingId }),
      });
      return res.json().catch(() => ({}));
    };

    const waitForSettledBooking = async () => {
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            const status = data?.payment_status;
            if (status === "deposit_paid" || status === "paid") {
              return data;
            }
          }
        } catch {
          // retry
        }
        await new Promise((r) => setTimeout(r, 800 + attempt * 400));
        await verifyOnce().catch(() => ({}));
      }
      return null;
    };

    try {
      await verifyOnce();
      await waitForSettledBooking();
      if (onPaymentSuccess) {
        await onPaymentSuccess();
      }
      goToPhase("success");
    } catch {
      setError(t("payment.networkError"));
      setPaying(false);
      goToPhase("card");
    }
  };

  const billingProvince = selectedAddress?.province ?? clientProvince ?? "QC";
  const taxRate = getTaxRate(billingProvince);
  const taxLabel = getTaxLabel(billingProvince, i18n.language ?? "fr");
  const isDepositCheckout = checkoutKind === "deposit";
  const isBalanceCheckout = checkoutKind === "balance";
  const isFullDepositCheckout =
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
  const feeBase = isBalanceCheckout && fullServiceBase != null ? fullServiceBase : price;
  const commission = isDepositCheckout ? 0 : feeBase * 0.05;
  const taxes = isDepositCheckout ? 0 : feeBase * taxRate;
  const total = isDepositCheckout ? price : price + commission + taxes;
  const fmt = (n: number) => n.toFixed(2);
  const mode = normalizePricingMode(pricingMode);
  const depositNoticeKey =
    mode === "hourly"
      ? "payment.hourlyDepositNotice"
      : isWorkBasedPricingMode(mode)
        ? "payment.fixedDepositNotice"
        : "payment.splitDepositNotice";
  const balanceNoticeKey =
    mode === "hourly"
      ? "payment.balanceDueNoticeHourly"
      : isWorkBasedPricingMode(mode)
        ? "payment.balanceDueNoticeFixed"
        : "payment.balanceDueNotice";
  const balanceLabelKey =
    mode === "hourly"
      ? "payment.balanceAmountHourly"
      : isWorkBasedPricingMode(mode)
        ? "payment.balanceAmountFixed"
        : "payment.balanceAmount";

  const servicePriceLabel = isDepositCheckout || isFullDepositCheckout
    ? t("payment.depositAmount")
    : isBalanceCheckout
      ? t("payment.balanceAmount")
      : t("payment.servicePrice");

  const payButtonLabel = isDepositCheckout || isFullDepositCheckout
    ? t("payment.payDepositLabel")
    : isBalanceCheckout
      ? t("payment.payBalanceLabel")
      : t("payment.payNowLabel");

  const showCardPhase = phase === "card" && Boolean(clientSecret && publishableKey);

  if (phase === "confirming") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        <p className="text-base font-semibold text-gray-900">{t("payment.confirmingPayment")}</p>
        <p className="max-w-xs text-sm text-gray-500">{t("payment.confirmingPaymentDesc")}</p>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PaymentSuccessReceipt
          bookingId={bookingId}
          accessToken={accessToken}
          embedded
          showHeroImage={false}
        />
        {successActions ? (
          <div className="shrink-0 border-t border-gray-100 px-5 py-4">
            {successActions}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={`flex h-full min-h-0 w-[200%] transition-transform duration-300 ease-in-out ${
          showCardPhase ? "-translate-x-1/2" : "translate-x-0"
        }`}
      >
        {/* Step 1 — billing / summary */}
        <div className="flex w-1/2 min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="space-y-1.5 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm">
              <p className="mb-2 text-base font-bold text-gray-900">{bookingTitle}</p>
              {isBalanceCheckout && (
                <p className="mb-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
                  {t(balanceNoticeKey)}
                </p>
              )}
              <div className="flex justify-between text-gray-600">
                <span>{isBalanceCheckout ? t(balanceLabelKey) : servicePriceLabel}</span>
                <span className="font-medium text-gray-900">{fmt(price)} $</span>
              </div>
              <hr className="my-1 border-gray-100" />
              {!isDepositCheckout && !isBalanceCheckout && !isFullDepositCheckout && (
                <PaymentDepositRows
                  price={price}
                  depositConfig={depositConfig}
                  depositAmountCents={depositAmountCents}
                />
              )}
              {isDepositCheckout && (
                <p className="text-xs text-gray-500">{t(depositNoticeKey)}</p>
              )}
              {isFullDepositCheckout && (
                <p className="text-xs text-gray-500">{t("payment.fullDepositCoversServiceNotice")}</p>
              )}
              {isDepositCheckout && (
                <p className="text-xs text-gray-500">{t("payment.depositFeesDeferredNotice")}</p>
              )}
              {!isDepositCheckout && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <div>
                      <div>{t("payment.buyerCommission")}</div>
                      <div className="text-xs text-red-400">{t("payment.nonRefundable")}</div>
                    </div>
                    <span>{fmt(commission)} $</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <div>
                      <div>{t("payment.taxes")} ({formatTaxRate(taxRate)}%)</div>
                      <div className="text-xs text-gray-400">{taxLabel}</div>
                    </div>
                    <span>{fmt(taxes)} $</span>
                  </div>
                </>
              )}
              <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
                <span>{t("payment.total")}</span>
                <span className="text-green-700">{fmt(total)} $</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
              {loadingAddresses ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("payment.loading")}
                </div>
              ) : (
                <BillingAddressSelector
                  addresses={billingAddresses}
                  selectedId={selectedAddress?.id ?? null}
                  onSelect={(addr) => { setSelectedAddress(addr); setBillingConfirmed(false); }}
                  onAdd={handleAddAddress}
                  onUpdate={handleUpdateAddress}
                  onSetDefault={handleSetDefaultAddress}
                  onDelete={handleDeleteAddress}
                  accessToken={accessToken}
                />
              )}
            </div>

            <label className="flex cursor-pointer select-none items-start gap-3">
              <input
                type="checkbox"
                checked={billingConfirmed}
                onChange={(e) => { setBillingConfirmed(e.target.checked); if (e.target.checked) setError(""); }}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-xs leading-relaxed text-gray-600">
                {t("payment.confirmBillingAccuracy")}
              </span>
            </label>

            {error && phase === "billing" && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 px-5 py-4">
            <Button
              onClick={handlePreparePayment}
              disabled={preparingPayment || paying || !billingConfirmed || !selectedAddress || !publishableKey}
              className={`h-12 w-full rounded-xl bg-green-700 text-base font-semibold text-white hover:bg-green-800 disabled:opacity-50 ${preparingPayment ? "pointer-events-none" : ""}`}
              aria-busy={preparingPayment}
            >
              <LinkLabelWithLoadingSpinner
                label={t("payment.continueToPayment")}
                loading={preparingPayment}
              />
            </Button>
            <p className="mt-2 text-center text-xs text-gray-400">{t("payment.securedByStripe")}</p>
          </div>
        </div>

        {/* Step 2 — Stripe card form */}
        <div className="flex w-1/2 min-h-0 flex-col overflow-hidden">
          {(isDepositCheckout || isBalanceCheckout) && (
            <div className="shrink-0 border-b border-gray-100 px-5 py-3">
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
                {isDepositCheckout ? t(depositNoticeKey) : t(balanceNoticeKey)}
              </p>
            </div>
          )}
          {error && phase === "card" && (
            <div className="mx-5 mt-3 flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {clientSecret && publishableKey ? (
            <PaymentCheckoutForm
              clientSecret={clientSecret}
              publishableKey={publishableKey}
              disabled={paying || !billingConfirmed || !selectedAddress}
              submitLabel={payButtonLabel}
              processingLabel={t("payment.processingPayment")}
              loadingLabel={t("payment.preparingPayment")}
              fillHeight
              footerNote={t("payment.securedByStripe")}
              onSuccess={handlePaymentSuccess}
              onError={(message) => {
                // Ignore incomplete-field copy in the red banner — button stays disabled instead.
                if (/incomplet/i.test(message)) return;
                setError(message);
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-green-700" />
              <span>{t("payment.preparingPayment")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default PaymentInlinePanel;
