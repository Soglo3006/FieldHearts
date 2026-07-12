"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import LinkLabelWithLoadingSpinner from "@/components/ui/LinkLabelWithLoadingSpinner";
import BillingAddressSelector, { type BillingAddress } from "@/components/payment/BillingAddressSelector";
import PaymentCheckoutForm from "@/components/payment/PaymentCheckoutForm";
import { getTaxRate, getTaxLabel, formatTaxRate } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingTitle: string;
  price: number;
  accessToken: string;
  clientProvince: string | null;
  taxRateStored: number | null;
  onPaymentSuccess?: () => void;
}

export default function PaymentSheet({
  open,
  onClose,
  bookingId,
  bookingTitle,
  price,
  accessToken,
  clientProvince,
  onPaymentSuccess,
}: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
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

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.publishable_key) setPublishableKey(data.publishable_key);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setError("");
      setBillingConfirmed(false);
      return;
    }
    if (!accessToken) return;

    setLoadingAddresses(true);
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
  }, [open, accessToken]);

  useEffect(() => {
    setClientSecret(null);
  }, [selectedAddress?.id]);

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
      setPreparingPayment(false);
    } catch {
      setError(t("payment.networkError"));
      setPreparingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setPaying(true);
    setError("");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      onClose();
      if (onPaymentSuccess) {
        onPaymentSuccess();
      } else {
        router.push(`/payment/success?booking_id=${bookingId}`);
      }
    } catch {
      setError(t("payment.networkError"));
      setPaying(false);
    }
  };

  const billingProvince = selectedAddress?.province ?? clientProvince ?? "QC";
  const taxRate = getTaxRate(billingProvince);
  const taxLabel = getTaxLabel(billingProvince, i18n.language ?? "fr");
  const commission = price * 0.05;
  const taxes = price * taxRate;
  const total = price + commission + taxes;
  const fmt = (n: number) => n.toFixed(2);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto px-5 pb-8 sm:max-w-lg sm:mx-auto sm:rounded-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-bold text-gray-900">{t("payment.completePayment")}</SheetTitle>
          <p className="text-sm text-gray-500 line-clamp-1">{bookingTitle}</p>
        </SheetHeader>

        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-5 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{t("payment.servicePrice")}</span>
            <span className="font-medium text-gray-900">{fmt(price)} $</span>
          </div>
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
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-1">
            <span>{t("payment.total")}</span>
            <span className="text-green-700">{fmt(total)} $</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-4 py-4 mb-4">
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

        <label className="flex items-start gap-3 cursor-pointer mb-4 select-none">
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
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 mb-4 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {clientSecret && publishableKey ? (
          <PaymentCheckoutForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            disabled={paying || !billingConfirmed || !selectedAddress}
            submitLabel={t("payment.payAmount", { amount: fmt(total) })}
            processingLabel={t("payment.processingPayment")}
            onSuccess={handlePaymentSuccess}
            onError={(message) => setError(message)}
          />
        ) : (
          <Button
            onClick={handlePreparePayment}
            disabled={preparingPayment || paying || !billingConfirmed || !selectedAddress || !publishableKey}
            className={`w-full h-12 text-base font-semibold bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-50 ${preparingPayment ? "pointer-events-none" : ""}`}
            aria-busy={preparingPayment}
          >
            <LinkLabelWithLoadingSpinner
              label={t("payment.continueToPayment")}
              loading={preparingPayment}
            />
          </Button>
        )}

        <p className="text-xs text-center text-gray-400 mt-3">
          {t("payment.securedByStripe")}
        </p>
      </SheetContent>
    </Sheet>
  );
}
