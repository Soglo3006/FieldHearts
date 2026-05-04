"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, MapPin, Calendar } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import AppImage from "@/components/ui/AppImage";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getTaxRate, getTaxLabel, formatTaxRate } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";

interface Booking {
  id: string;
  price: number;
  custom_price: number | null;
  tax_rate: number | null;
  worker_province: string | null;
  client_province: string | null;
  title: string;
  image_url: string | null;
  service_location: string | null;
  created_at: string;
  worker_name: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const { session } = useAuth();
  const { t, i18n } = useTranslation();
  const bookingLocale = getIntlLocale(i18n.language, { fr: 'fr-CA', en: 'en-CA' });
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!bookingId || !session?.access_token) return;
    const headers = { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };

    // Confirm payment with backend (updates booking to active + creates wallet transaction)
    // Retry once after 8s in case the server was cold-starting
    const verify = () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ booking_id: bookingId }),
      }).catch(() => {});
    verify();
    const retryVerify = setTimeout(verify, 8000);

    // Fetch booking details for display — validate response before setting state
    const fetchBookingDetails = (attempt = 0) => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, { headers })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.id && data.created_at) {
            setBooking(data);
          } else if (attempt < 2) {
            // Backend may be cold-starting; retry after a short delay
            setTimeout(() => fetchBookingDetails(attempt + 1), 5000);
          }
        })
        .catch(() => {
          if (attempt < 2) setTimeout(() => fetchBookingDetails(attempt + 1), 5000);
        });
    };
    fetchBookingDetails();

    return () => clearTimeout(retryVerify);
  }, [bookingId, session?.access_token]);

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t("payment.confirmed")}</h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            {t("payment.confirmedDesc")}
          </p>
        </div>

        {/* Booking summary */}
        {!booking ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-8 w-8 text-green-600" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
            {booking.image_url && (
              <AspectRatio ratio={16 / 9}>
                <AppImage src={booking.image_url} alt={booking.title} fill sizes="(max-width: 1024px) 100vw, 512px" className="object-cover" />
              </AspectRatio>
            )}
            <div className="p-5">
              <h2 className="font-semibold text-gray-900 text-base mb-3">{booking.title}</h2>
              <div className="space-y-1.5 text-sm text-gray-600">
                {booking.service_location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{booking.service_location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{new Date(booking.created_at).toLocaleDateString(bookingLocale)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-1.5 text-sm">
                {(() => {
                  const price = Number(booking.custom_price ?? booking.price);
                  const taxRate = booking.tax_rate ? Number(booking.tax_rate) : getTaxRate(booking.client_province ?? "QC");
                  const taxLabel = getTaxLabel(booking.client_province ?? "QC", i18n.language ?? "fr");
                  const buyerCommission = price * 0.05;
                  const taxes = price * taxRate;
                  const total = price + buyerCommission + taxes;
                  const fmt = (n: number) => n.toFixed(2);
                  return (
                    <>
                      <div className="flex justify-between text-gray-500">
                        <span>{t("payment.servicePrice")}</span>
                        <span className="text-gray-700">{fmt(price)} $</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <div>
                          <div>{t("payment.buyerCommission")}</div>
                          <div className="text-xs text-red-400">{t("payment.nonRefundable")}</div>
                        </div>
                        <span>{fmt(buyerCommission)} $</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <div>
                          <div>{t("payment.taxes")} ({formatTaxRate(taxRate)}%)</div>
                          <div className="text-xs text-gray-300">{taxLabel}</div>
                        </div>
                        <span>{fmt(taxes)} $</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2.5 mt-1">
                        <span>{t("payment.amountPaid")}</span>
                        <span className="text-green-700">{fmt(total)} $</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {booking && <div className="flex flex-col gap-2.5">
          <Link href="/bookings?payment=success">
            <Button className="w-full bg-green-700 hover:bg-green-800 text-white h-12 rounded-xl">
              {t("payment.viewBookings")}
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full h-12 rounded-xl">
              {t("payment.backHome")}
            </Button>
          </Link>
        </div>}
      </div>
    </div>
  );
}
