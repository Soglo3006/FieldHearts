"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BillingAddressSelector, { type BillingAddress } from "@/components/payment/BillingAddressSelector";
import { getTaxRate, getTaxLabel, formatTaxRate } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";
import { PaymentDepositRows } from "@/components/payment/PaymentDepositRows";
import type { DepositConfig } from "@/lib/deposit";
import type { CheckoutKind } from "@/lib/hourlyPayment";
import { isWorkBasedPricingMode } from "@/lib/hourlyPayment";
import { normalizePricingMode } from "@/lib/listingPrice";

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
}

export default function PaymentInlinePanel({
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
}: Props) {
  const { t, i18n } = useTranslation();
  const checkoutLocale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en" });

  const [billingAddresses, setBillingAddresses] = useState<BillingAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<BillingAddress | null>(null);
  const [billingConfirmed, setBillingConfirmed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);

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

  const handlePay = async () => {
    if (!billingConfirmed) { setError(t("payment.mustConfirmBilling")); return; }
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/checkout`, {
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
      if (!res.ok) { setError(data.message || t("payNowButton.startError")); setPaying(false); return; }
      window.location.href = data.url;
    } catch {
      setError(t("payNowButton.networkError"));
      setPaying(false);
    }
  };

  const billingProvince = selectedAddress?.province ?? clientProvince ?? "QC";
  const taxRate = getTaxRate(billingProvince);
  const taxLabel = getTaxLabel(billingProvince, i18n.language ?? "fr");
  const isDepositCheckout = checkoutKind === "deposit";
  const isBalanceCheckout = checkoutKind === "balance";
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

  const servicePriceLabel = isDepositCheckout
    ? t("payment.depositAmount")
    : isBalanceCheckout
      ? t("payment.balanceAmount")
      : t("payment.servicePrice");

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        {/* Price summary */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 space-y-1.5 text-sm">
          <p className="text-base font-bold text-gray-900 mb-2">{bookingTitle}</p>
          {isBalanceCheckout && (
            <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 mb-1">
              {t(balanceNoticeKey)}
            </p>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{isBalanceCheckout ? t(balanceLabelKey) : servicePriceLabel}</span>
            <span className="font-medium text-gray-900">{fmt(price)} $</span>
          </div>
          <hr className="border-gray-100 my-1" />
          {!isDepositCheckout && !isBalanceCheckout && (
            <PaymentDepositRows
              price={price}
              depositConfig={depositConfig}
              depositAmountCents={depositAmountCents}
            />
          )}
          {isDepositCheckout && (
            <p className="text-xs text-gray-500">{t(depositNoticeKey)}</p>
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
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-1">
            <span>{t("payment.total")}</span>
            <span className="text-green-700">{fmt(total)} $</span>
          </div>
        </div>

        {/* Billing address */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
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

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={billingConfirmed}
            onChange={(e) => { setBillingConfirmed(e.target.checked); if (e.target.checked) setError(""); }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0 cursor-pointer"
          />
          <span className="text-xs text-gray-600 leading-relaxed">
            {t("payment.confirmBillingAccuracy")}
          </span>
        </label>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 shrink-0">
        <Button
          onClick={handlePay}
          disabled={paying || !billingConfirmed || !selectedAddress}
          className="w-full h-12 text-base font-semibold bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-50"
        >
          {paying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("payment.redirectingToStripe")}
            </span>
          ) : (
            <span>
              {isDepositCheckout
                ? t("payment.payDepositLabel")
                : isBalanceCheckout
                  ? t("payment.payBalanceLabel")
                  : t("payment.payNowLabel")}
            </span>
          )}
        </Button>
        <p className="text-xs text-center text-gray-400 mt-2">{t("payment.securedByStripe")}</p>
      </div>
    </div>
  );
}
