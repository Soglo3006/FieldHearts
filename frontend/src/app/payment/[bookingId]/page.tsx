"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AppImage from "@/components/ui/AppImage";
import { CheckCircle, AlertCircle, MapPin, Calendar, ArrowLeft, Grid3x3 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getTaxLabel, formatTaxRate, getTaxRate } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";
import { normalizePricingMode } from "@/lib/listingPrice";
import BillingAddressSelector, { type BillingAddress } from "@/components/payment/BillingAddressSelector";
import { PaymentDepositRows } from "@/components/payment/PaymentDepositRows";
import type { DepositConfig } from "@/lib/deposit";
import {
  fixedAwaitingWorkForBalance,
  hourlyAwaitingApprovedHours,
  isWorkBasedPricingMode,
  resolveBalanceFullServiceBase,
  resolveCheckoutKind,
  resolveCheckoutPrice,
} from "@/lib/hourlyPayment";
import { isNegotiablePricingMode, isPriceAgreementComplete } from "@/lib/priceNegotiation";

interface Booking {
  id: string;
  status: string;
  payment_status: string;
  price: number;
  custom_price: number | null;
  custom_price_min?: number | null;
  custom_price_max?: number | null;
  pricing_mode?: string | null;
  price_max?: number | null;
  estimated_hours?: number | string | null;
  approved_hours_total?: number | string | null;
  tax_rate: number | null;
  worker_province: string | null;
  client_province: string | null;
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  deposit_amount_cents?: number | null;
  paid_service_base_cents?: number | null;
  balance_due_cents?: number | null;
  completed_by_worker?: boolean;
  completed_by_client?: boolean;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
  service_id: string;
  worker_id: string;
  created_at: string;
  title: string;
  image_url: string | null;
  service_location: string | null;
  worker_name: string;
}

function getDepositConfig(booking: Booking): DepositConfig | null {
  if (!booking.deposit_enabled) return null;
  return {
    deposit_enabled: true,
    deposit_type: booking.deposit_type,
    deposit_value: booking.deposit_value,
  };
}

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const bookingLocale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });
  const checkoutLocale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en" });
  const wasCancelled = searchParams.get("cancelled") === "true";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const [billingAddresses, setBillingAddresses] = useState<BillingAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<BillingAddress | null>(null);
  const [billingConfirmed, setBillingConfirmed] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !bookingId) return;
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
    ])
      .then(async ([bookingRes, addressRes]) => {
        const bookingData = bookingRes.ok ? await bookingRes.json() : null;
        const addressData = addressRes.ok ? await addressRes.json() : [];
        if (!bookingData?.id) {
          setBooking(null);
        } else {
          setBooking(bookingData);
        }
        const addresses: BillingAddress[] = Array.isArray(addressData) ? addressData : [];
        setBillingAddresses(addresses);
        const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
        setSelectedAddress(defaultAddr);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId, session?.access_token]);

  const depositConfig = useMemo(
    () => (booking ? getDepositConfig(booking) : null),
    [booking],
  );

  const checkoutKind = useMemo(
    () => (booking ? resolveCheckoutKind(booking, depositConfig) : null),
    [booking, depositConfig],
  );

  const checkoutPrice = useMemo(
    () => (booking ? resolveCheckoutPrice(booking, depositConfig) : 0),
    [booking, depositConfig],
  );

  const fullServiceBase = useMemo(
    () => (booking ? resolveBalanceFullServiceBase(booking) : null),
    [booking],
  );

  const billingProvince = selectedAddress?.province ?? booking?.client_province ?? "QC";
  const taxRate = getTaxRate(billingProvince);
  const taxLabel = getTaxLabel(billingProvince, i18n.language ?? "fr");
  const isDepositCheckout = checkoutKind === "deposit";
  const isBalanceCheckout = checkoutKind === "balance";
  const pricingMode = normalizePricingMode(booking?.pricing_mode);
  const feeBase = isBalanceCheckout && fullServiceBase != null ? fullServiceBase : checkoutPrice;
  const buyerCommission = isDepositCheckout ? 0 : feeBase * 0.05;
  const taxes = isDepositCheckout ? 0 : feeBase * taxRate;
  const total = isDepositCheckout ? checkoutPrice : checkoutPrice + buyerCommission + taxes;
  const fmt = (n: number) => n.toFixed(2);

  const depositNoticeKey =
    pricingMode === "hourly"
      ? "payment.hourlyDepositNotice"
      : isWorkBasedPricingMode(pricingMode)
        ? "payment.fixedDepositNotice"
        : "payment.splitDepositNotice";
  const balanceNoticeKey =
    pricingMode === "hourly"
      ? "payment.balanceDueNoticeHourly"
      : isWorkBasedPricingMode(pricingMode)
        ? "payment.balanceDueNoticeFixed"
        : "payment.balanceDueNotice";
  const balanceLabelKey =
    pricingMode === "hourly"
      ? "payment.balanceAmountHourly"
      : isWorkBasedPricingMode(pricingMode)
        ? "payment.balanceAmountFixed"
        : "payment.balanceAmount";

  const servicePriceLabel = isDepositCheckout
    ? t("payment.depositAmount")
    : isBalanceCheckout
      ? t(balanceLabelKey)
      : t("payment.servicePrice");

  const payButtonLabel = isDepositCheckout
    ? t("payment.payDepositLabel")
    : isBalanceCheckout
      ? t("payment.payBalanceLabel")
      : t("payment.payAmount", { amount: fmt(total) });

  const handleAddAddress = async (data: Omit<BillingAddress, "id" | "is_default">) => {
    if (!session?.access_token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });
    const newAddr: BillingAddress = await res.json();
    if (res.ok) {
      setBillingAddresses((prev) => [...prev, newAddr]);
      setSelectedAddress(newAddr);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!session?.access_token) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setBillingAddresses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      if (selectedAddress?.id === id) {
        setSelectedAddress(updated[0] ?? null);
      }
      return updated;
    });
  };

  const handleUpdateAddress = async (id: string, data: Omit<BillingAddress, "id" | "is_default">) => {
    if (!session?.access_token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });
    const updatedAddr: BillingAddress = await res.json();
    if (res.ok) {
      setBillingAddresses((prev) => prev.map((addr) => (addr.id === id ? updatedAddr : addr)));
      setSelectedAddress((prev) => (prev?.id === id ? updatedAddr : prev));
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!session?.access_token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses/${id}/default`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const defaultAddr: BillingAddress = await res.json();
    if (res.ok) {
      setBillingAddresses((prev) => prev.map((addr) => ({ ...addr, is_default: addr.id === id })));
      setSelectedAddress(defaultAddr);
      setBillingConfirmed(false);
    }
  };

  const handlePay = async () => {
    if (!session?.access_token || !checkoutKind) return;
    if (!billingConfirmed) {
      setError(t("payment.mustConfirmBilling"));
      return;
    }
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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
        setPaying(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("payment.networkError"));
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t("payment.bookingNotFound")}</h2>
          <Link href="/bookings">
            <Button className="mt-4 bg-green-700 hover:bg-green-800 text-white">{t("payment.backToBookings")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (booking.payment_status === "paid") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t("payment.alreadyPaid")}</h2>
          <p className="text-gray-500 text-sm">{t("payment.alreadyPaidDesc")}</p>
          <Link href="/bookings">
            <Button className="mt-4 bg-green-700 hover:bg-green-800 text-white">{t("payment.goToBookings")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!checkoutKind) {
    const awaitingPrice =
      booking.status === "negotiating" ||
      (booking.status === "accepted" &&
        isNegotiablePricingMode(booking.pricing_mode) &&
        !isPriceAgreementComplete(booking));

    const unavailableMessage = awaitingPrice
      ? t("payment.awaitingPriceAgreement")
      : hourlyAwaitingApprovedHours(booking)
          ? t("payment.awaitingApprovedHours")
          : fixedAwaitingWorkForBalance(booking, depositConfig)
            ? t("payment.awaitingWorkCompletion")
            : booking.payment_status === "deposit_paid"
              ? t("payment.depositAlreadyPaid")
              : t("payment.checkoutUnavailable");

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t("payment.checkoutUnavailableTitle")}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{unavailableMessage}</p>
          <Link href="/bookings">
            <Button className="mt-4 bg-green-700 hover:bg-green-800 text-white">{t("payment.backToBookings")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-12">
        <button
          onClick={() => router.push("/bookings")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("payment.backToBookings")}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("payment.completePayment")}</h1>

        {wasCancelled && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("payment.cancelledNotice")}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
          <div className="lg:self-start">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                    <AspectRatio ratio={16 / 9}>
                      {booking.image_url ? (
                        <AppImage
                          src={booking.image_url}
                          alt={booking.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 640px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
                          <Grid3x3 className="h-10 w-10 text-gray-300" />
                        </div>
                      )}
                    </AspectRatio>
                  </div>
                </div>

                <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <h2 className="text-2xl font-semibold text-gray-950 mb-4">{booking.title}</h2>

                  <div className="space-y-3 text-sm text-gray-600">
                    {booking.service_location && (
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>{booking.service_location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{t("payment.bookedOn", { date: new Date(booking.created_at).toLocaleDateString(bookingLocale) })}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-100 space-y-2 text-sm">
                    {isBalanceCheckout && (
                      <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1 leading-relaxed">
                        {t(balanceNoticeKey)}
                      </p>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>{servicePriceLabel}</span>
                      <span className="font-medium text-gray-900">{fmt(checkoutPrice)} $</span>
                    </div>
                    {!isDepositCheckout && !isBalanceCheckout && (
                      <PaymentDepositRows
                        price={checkoutPrice}
                        depositConfig={depositConfig}
                        depositAmountCents={booking.deposit_amount_cents}
                      />
                    )}
                    {isDepositCheckout && (
                      <>
                        <p className="text-xs text-gray-500 leading-relaxed">{t(depositNoticeKey)}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{t("payment.depositFeesDeferredNotice")}</p>
                      </>
                    )}
                    {!isDepositCheckout && (
                      <>
                        <div className="flex justify-between text-gray-500">
                          <div>
                            <div>{t("payment.buyerCommission")}</div>
                            <div className="text-xs text-red-500">{t("payment.nonRefundable")}</div>
                          </div>
                          <span>{fmt(buyerCommission)} $</span>
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
                    <div className="flex justify-between font-bold text-2xl border-t border-gray-100 pt-3 mt-2">
                      <span>{t("payment.total")}</span>
                      <span className="text-green-700">{fmt(total)} $</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm p-5 sm:p-6">
            <BillingAddressSelector
              addresses={billingAddresses}
              selectedId={selectedAddress?.id ?? null}
              onSelect={(addr) => { setSelectedAddress(addr); setBillingConfirmed(false); }}
              onAdd={handleAddAddress}
              onUpdate={handleUpdateAddress}
              onSetDefault={handleSetDefaultAddress}
              onDelete={handleDeleteAddress}
              accessToken={session?.access_token ?? ""}
            />

            <label className="flex items-start gap-3 cursor-pointer mt-5 mb-5 select-none">
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
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handlePay}
              disabled={paying || !billingConfirmed || !selectedAddress}
              className="w-full h-14 text-base font-semibold bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-50"
            >
              {paying ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("payment.redirectingToStripe")}
                </span>
              ) : (
                <span>{payButtonLabel}</span>
              )}
            </Button>

            <p className="text-xs text-center text-gray-400 mt-3">
              {t("payment.securedByStripe")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
