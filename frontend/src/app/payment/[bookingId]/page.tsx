"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AppImage from "@/components/ui/AppImage";
import { CheckCircle, AlertCircle, MapPin, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getTaxLabel, formatTaxRate, getTaxRate, normalizeProvince } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";
import BillingAddressSelector, { type BillingAddress } from "@/components/payment/BillingAddressSelector";

interface Booking {
  id: string;
  status: string;
  payment_status: string;
  price: number;
  custom_price: number | null;
  tax_rate: number | null;
  worker_province: string | null;
  client_province: string | null;
  service_id: string;
  worker_id: string;
  created_at: string;
  title: string;
  image_url: string | null;
  location: string;
  city: string | null;
  worker_name: string;
}

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const bookingLocale = getIntlLocale(i18n.language, { fr: 'fr-CA', en: 'en-CA' });
  const checkoutLocale = getIntlLocale(i18n.language, { fr: 'fr-CA', en: 'en' });
  const defaultBillingLabel = t("payment.defaultBillingLabel");
  const wasCancelled = searchParams.get("cancelled") === "true";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // Billing addresses
  const [billingAddresses, setBillingAddresses] = useState<BillingAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<BillingAddress | null>(null);
  const [billingConfirmed, setBillingConfirmed] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !bookingId) return;
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => r.json()),
    ])
      .then(async ([bookingData, addressData, profileData]) => {
        setBooking(bookingData);
        let addresses: BillingAddress[] = Array.isArray(addressData) ? addressData : [];
        if (addresses.length === 0 && profileData?.address && profileData?.city && profileData?.province) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              label: defaultBillingLabel,
              full_name: profileData.full_name ?? profileData.company_name ?? null,
              address_line1: profileData.address,
              city: profileData.city,
              province: normalizeProvince(profileData.province),
              postal_code: profileData.postal_code ?? "",
              is_default: true,
            }),
          });
          if (res.ok) {
            const newAddr: BillingAddress = await res.json();
            addresses = [newAddr];
          }
        }
        setBillingAddresses(addresses);
        const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
        setSelectedAddress(defaultAddr);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId, defaultBillingLabel, session?.access_token]);

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
    if (!session?.access_token) return;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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

  // Use selected billing address province for live tax recalculation
  const billingProvince = selectedAddress?.province ?? booking.client_province ?? "QC";
  const price = Number(booking.custom_price ?? booking.price);
  const taxRate = getTaxRate(billingProvince);
  const taxLabel = getTaxLabel(billingProvince, i18n.language ?? "fr");
  const buyerCommission = price * 0.05;
  const taxes = price * taxRate;
  const total = price + buyerCommission + taxes;
  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Back */}
        <button
          onClick={() => router.push("/bookings")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("payment.backToBookings")}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("payment.completePayment")}</h1>

        {wasCancelled && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-5 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("payment.cancelledNotice")}
          </div>
        )}

        {/* Booking summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          {booking.image_url && (
            <div className="relative h-40 w-full">
              <AppImage src={booking.image_url} alt={booking.title} fill sizes="(max-width: 1024px) 100vw, 512px" className="object-cover" />
            </div>
          )}
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{booking.title}</h2>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{booking.city ?? booking.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{t("payment.bookedOn", { date: new Date(booking.created_at).toLocaleDateString(bookingLocale) })}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t("payment.servicePrice")}</span>
                <span className="font-medium text-gray-900">{fmt(price)} $</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <div>
                  <div>{t("payment.buyerCommission")}</div>
                  <div className="text-xs text-red-400">{t("payment.nonRefundable")}</div>
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
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-1">
                <span>{t("payment.total")}</span>
                <span className="text-green-700">{fmt(total)} $</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing address */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
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
        </div>

        {/* Billing accuracy confirmation */}
        <label className="flex items-start gap-3 cursor-pointer mb-5 select-none">
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

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Pay button */}
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
            <span>{t("payment.payAmount", { amount: fmt(total) })}</span>
          )}
        </Button>

        <p className="text-xs text-center text-gray-400 mt-3">
          {t("payment.securedByStripe")}
        </p>
      </div>
    </div>
  );
}
