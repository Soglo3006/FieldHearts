"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Calendar } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/Spinner";
import AppImage from "@/components/ui/AppImage";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getTaxLabel, formatTaxRate } from "@/lib/taxes";
import { getIntlLocale } from "@/lib/locale";
import {
  buildPaymentSuccessBreakdown,
  type LatestPaymentInfo,
  type PaidCheckoutKind,
} from "@/lib/paymentSuccessSummary";
import { HourlyDepositReceiptBreakdown } from "@/components/payment/HourlyDepositReceiptBreakdown";
import { normalizePricingMode } from "@/lib/listingPrice";

interface Booking {
  id: string;
  status: string;
  payment_status: string | null;
  price: number;
  custom_price: number | null;
  pricing_mode?: string | null;
  price_max?: number | null;
  estimated_hours?: number | string | null;
  approved_hours_total?: number | string | null;
  paid_service_base_cents?: number | null;
  balance_due_cents?: number | null;
  deposit_amount_cents?: number | null;
  tax_rate: number | null;
  worker_province: string | null;
  client_province: string | null;
  title: string;
  image_url: string | null;
  service_location: string | null;
  created_at: string;
  worker_name: string;
}

interface VerifyResult {
  payment_kind?: PaidCheckoutKind | string;
  amount_cents?: number | null;
  platform_fee_cents?: number;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const { session } = useAuth();
  const { t, i18n } = useTranslation();
  const bookingLocale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });
  const [booking, setBooking] = useState<Booking | null>(null);
  const [latestPayment, setLatestPayment] = useState<LatestPaymentInfo | null>(null);
  const [verifyMeta, setVerifyMeta] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!bookingId || !session?.access_token) return;
    const headers = { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };

    const applyVerifyResult = (data: {
      payment_kind?: string;
      amount_cents?: number | null;
      platform_fee_cents?: number;
      booking?: Partial<Booking> | null;
      confirmed?: boolean;
    }) => {
      if (data?.payment_kind || data?.amount_cents != null) {
        setVerifyMeta({
          payment_kind: data.payment_kind,
          amount_cents: data.amount_cents,
          platform_fee_cents: data.platform_fee_cents,
        });
        if (data.amount_cents != null) {
          setLatestPayment({
            amount: data.amount_cents,
            platform_fee: data.platform_fee_cents ?? 0,
            payment_kind: data.payment_kind,
          });
        }
      }
      if (data?.booking) {
        setBooking((prev) => (prev ? { ...prev, ...data.booking } : null));
      }
    };

    const verify = () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ booking_id: bookingId }),
      })
        .then((r) => r.json())
        .then(applyVerifyResult)
        .catch(() => {});

    verify();
    const retryTimers = [3000, 8000, 15000].map((ms) => setTimeout(verify, ms));

    const fetchBookingDetails = (attempt = 0) => {
      Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, { headers }).then((r) => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/status/${bookingId}`, { headers }).then((r) => r.json()),
      ])
        .then(([bookingData, paymentStatus]) => {
          if (bookingData && bookingData.id && bookingData.created_at) {
            setBooking(bookingData);
          }
          if (paymentStatus?.payment) {
            setLatestPayment((prev) => ({
              amount: paymentStatus.payment.amount,
              platform_fee: paymentStatus.payment.platform_fee ?? 0,
              payment_kind: paymentStatus.payment.payment_kind ?? prev?.payment_kind,
            }));
          }
          const paymentSettled =
            bookingData?.status === "active" &&
            (bookingData?.payment_status === "deposit_paid" || bookingData?.payment_status === "paid");
          if (!paymentSettled && attempt < 4) {
            setTimeout(() => fetchBookingDetails(attempt + 1), 4000);
          }
        })
        .catch(() => {
          if (attempt < 4) setTimeout(() => fetchBookingDetails(attempt + 1), 4000);
        });
    };
    fetchBookingDetails();

    return () => retryTimers.forEach(clearTimeout);
  }, [bookingId, session?.access_token]);

  const breakdown = useMemo(() => {
    if (!booking) return null;
    return buildPaymentSuccessBreakdown(booking, latestPayment, verifyMeta?.payment_kind);
  }, [booking, latestPayment, verifyMeta?.payment_kind]);

  const taxLabel = getTaxLabel(booking?.client_province ?? "QC", i18n.language ?? "fr");
  const taxRate = booking?.tax_rate ? Number(booking.tax_rate) : undefined;
  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {breakdown ? t(breakdown.titleKey) : t("payment.confirmed")}
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            {breakdown ? t(breakdown.descKey) : t("payment.confirmedDesc")}
          </p>
        </div>

        {!booking || !breakdown ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-8 w-8 text-green-600" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
            {booking.image_url && (
              <AspectRatio ratio={16 / 9}>
                <AppImage
                  src={booking.image_url}
                  alt={booking.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 512px"
                  className="object-cover"
                />
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
                {breakdown.kind === "deposit" ? (
                  <>
                    <div className="flex justify-between text-green-700 bg-green-50 -mx-1 px-2 py-1.5 rounded-lg">
                      <span className="font-medium">{t("payment.depositPaidLine")}</span>
                      <span className="font-semibold">{fmt(breakdown.totalPaid)} $</span>
                    </div>
                    {breakdown.estimatedTotalBase != null &&
                      breakdown.estimatedTotalBase > breakdown.totalPaid &&
                      breakdown.estimatedRemainingTotal != null &&
                      breakdown.estimatedRemainingTotal > 0 && (
                        <HourlyDepositReceiptBreakdown
                          depositPaid={breakdown.totalPaid}
                          serviceBase={breakdown.estimatedTotalBase}
                          hourlyRate={
                            normalizePricingMode(booking.pricing_mode) === "hourly"
                              ? Number(booking.price)
                              : null
                          }
                          hoursLabel={(() => {
                            const approved = Number(booking.approved_hours_total) || 0;
                            if (approved > 0) return approved;
                            const est = Number(booking.estimated_hours);
                            return Number.isFinite(est) && est > 0 ? est : null;
                          })()}
                          hoursIsApproved={(Number(booking.approved_hours_total) || 0) > 0}
                          estimatedTotalWithFees={breakdown.estimatedTotalWithFees ?? 0}
                          remainingBase={breakdown.estimatedRemainingBase ?? 0}
                          remainingCommission={breakdown.estimatedRemainingCommission ?? 0}
                          remainingTaxes={breakdown.estimatedRemainingTaxes ?? 0}
                          remainingTotal={breakdown.estimatedRemainingTotal}
                          taxRate={taxRate}
                          taxLabel={taxLabel}
                          fmt={fmt}
                        />
                      )}
                    {breakdown.balanceDueNow > 0 && (
                      <>
                        <Separator className="my-3" />
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-1">
                          <div className="flex justify-between text-gray-900 font-semibold">
                            <span>{t("payment.balanceDueNow")}</span>
                            <span>{fmt(breakdown.balanceDueTotal ?? breakdown.balanceDueNow)} $</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-700">
                            <span>{t("payment.balanceAmount")}</span>
                            <span>{fmt(breakdown.balanceDueNow)} $</span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : breakdown.kind === "balance" ? (
                  <>
                    <div className="flex justify-between text-gray-500">
                      <span>{t("payment.balancePaidLine")}</span>
                      <span className="text-gray-700">{fmt(breakdown.serviceBase)} $</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <div>
                        <div>{t("payment.buyerCommission")}</div>
                        <div className="text-xs text-red-400">{t("payment.nonRefundable")}</div>
                      </div>
                      <span>{fmt(breakdown.commission)} $</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <div>
                        <div>
                          {t("payment.taxes")}
                          {taxRate != null ? ` (${formatTaxRate(taxRate)}%)` : ""}
                        </div>
                        <div className="text-xs text-gray-300">{taxLabel}</div>
                      </div>
                      <span>{fmt(breakdown.taxes)} $</span>
                    </div>
                    {breakdown.isFullyPaid && (
                      <div className="flex justify-between text-gray-400 pt-1 border-t border-gray-100">
                        <span>{t("payment.totalPaidOnBooking")}</span>
                        <span>{fmt((booking.paid_service_base_cents ?? 0) / 100)} $</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-gray-500">
                      <span>{t("payment.servicePrice")}</span>
                      <span className="text-gray-700">{fmt(breakdown.serviceBase)} $</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <div>
                        <div>{t("payment.buyerCommission")}</div>
                        <div className="text-xs text-red-400">{t("payment.nonRefundable")}</div>
                      </div>
                      <span>{fmt(breakdown.commission)} $</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <div>
                        <div>
                          {t("payment.taxes")}
                          {taxRate != null ? ` (${formatTaxRate(taxRate)}%)` : ""}
                        </div>
                        <div className="text-xs text-gray-300">{taxLabel}</div>
                      </div>
                      <span>{fmt(breakdown.taxes)} $</span>
                    </div>
                  </>
                )}

                {breakdown.kind !== "deposit" && (
                  <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2.5 mt-1">
                    <span>{t("payment.amountPaid")}</span>
                    <span className="text-green-700">{fmt(breakdown.totalPaid)} $</span>
                  </div>
                )}

                {breakdown.isFullyPaid && breakdown.kind !== "full" && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1.5 mt-1">
                    {t("payment.fullyPaidNotice")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {booking && (
          <div className="flex flex-col gap-2.5">
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
          </div>
        )}
      </div>
    </div>
  );
}
