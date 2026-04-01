"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, MapPin, Calendar, CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getTaxLabel, formatTaxRate, getTaxRate } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";

interface Booking {
  id: string;
  status: string;
  payment_status: string;
  price: number;
  custom_price: number | null;
  tax_rate: number | null;
  worker_province: string | null;
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
  const wasCancelled = searchParams.get("cancelled") === "true";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.access_token || !bookingId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId, session?.access_token]);

  const handlePay = async () => {
    if (!session?.access_token) return;
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ booking_id: bookingId, locale: checkoutLocale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Payment failed. Please try again.");
        setPaying(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
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

  const price = Number(booking.custom_price ?? booking.price);
  const taxRate = booking.tax_rate ? Number(booking.tax_rate) : getTaxRate(booking.worker_province ?? "QC");
  const taxLabel = getTaxLabel(booking.worker_province ?? "QC", i18n.language ?? "fr");
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
            <img src={booking.image_url} alt={booking.title} className="w-full h-40 object-cover" />
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
                <span>{t("payment.buyerCommission")}</span>
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
          disabled={paying}
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
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("payment.payAmount", { amount: fmt(total) })}
            </span>
          )}
        </Button>

        <p className="text-xs text-center text-gray-400 mt-3">
          {t("payment.securedByStripe")}
        </p>
      </div>
    </div>
  );
}
