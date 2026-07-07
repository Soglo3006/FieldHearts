"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, FileText, TrendingDown, TrendingUp, TriangleAlert, ZoomIn } from "lucide-react";

import AppImage from "@/components/ui/AppImage";
import { ImageLightbox } from "@/components/messages/ImageLightbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { getBookingDisputeFinancialOutcome } from "@/lib/disputeFinancials";
import {
  workerCommissionFromGross,
  workerNetFromGross,
} from "@/lib/commissionRates";
import { canAccessAdminPortal } from "@/lib/auth";
import { adminApiHeaders } from "@/lib/adminStepUp";
import { getIntlLocale } from "@/lib/locale";

type AdminBookingDetail = {
  id: string;
  service_id: string;
  client_id: string;
  worker_id: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  completed_at: string | null;
  title: string;
  price: string | number;
  custom_price?: number | null;
  image_url: string | null;
  image_urls?: string[] | null;
  category: string | null;
  service_location: string | null;
  client_description: string | null;
  worker_note?: string | null;
  client_name?: string;
  client_email?: string;
  worker_name?: string;
  worker_email?: string;
  client_province?: string | null;
  worker_province?: string | null;
  service_type?: "offer" | "looking";
  tax_rate?: number | null;
  dispute_id?: string | null;
  dispute_status?: "open" | "resolved" | "rejected" | null;
  dispute_resolution?: string | null;
  dispute_refund_percentage?: number | null;
  dispute_created_at?: string | null;
  cancel_reason?: string | null;
  client_avatar_url?: string | null;
  worker_avatar_url?: string | null;
};

type DisputeStatus = "open" | "resolved" | "rejected";

type DisputeMessage = {
  id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_email: string;
  attachments: Array<{ url: string; name: string }>;
};

type DisputeDetail = {
  dispute: {
    id: string;
    status: DisputeStatus;
    description: string;
    resolution: string | null;
    refund_percentage: number | null;
    created_at: string;
    booking_id: string;
    raised_by_name: string;
  };
  payment: {
    id: string;
    amount: number;
    platform_fee: number;
    status: string;
    currency: string;
    created_at: string;
  } | null;
  refund_summary: {
    base_price_cents: number;
    platform_fee_cents: number;
    min_percentage: number;
    max_percentage: number;
  } | null;
  messages: DisputeMessage[];
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

const DISPUTE_STATUS_STYLES: Record<DisputeStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  unpaid: "bg-yellow-100 text-yellow-800",
  refunded: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-700",
};

export default function AdminBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });

  const [allowed, setAllowed] = useState(false);
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [disputeDetail, setDisputeDetail] = useState<DisputeDetail | null>(null);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState<DisputeStatus>("open");
  const [refundPercentage, setRefundPercentage] = useState(50);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!canAccessAdminPortal(user)) { router.replace("/"); return; }
    setAllowed(true);
  }, [loading, router, user]);

  useEffect(() => {
    if (!allowed || !session?.access_token || !params?.id) return;
    const loadBooking = async () => {
      setFetching(true);
      setLoadError("");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${params.id}/admin`, {
          headers: adminApiHeaders(session.access_token),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.message || t("admin.bookings.loadError", { defaultValue: "Failed to load booking." }));
        }
        setBooking(await res.json());
      } catch (error) {
        setBooking(null);
        setLoadError(error instanceof Error ? error.message : t("admin.bookings.loadError", { defaultValue: "Failed to load booking." }));
      } finally {
        setFetching(false);
      }
    };
    loadBooking();
  }, [allowed, params?.id, session?.access_token, t]);

  const fetchDisputeDetail = useCallback(async (disputeId: string) => {
    setDisputeLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${disputeId}/admin`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDisputeDetail(data);
      setResolution(data.dispute.resolution || "");
      setNewStatus(data.dispute.status);
      if (data.dispute.refund_percentage) {
        setRefundPercentage(Number(data.dispute.refund_percentage));
      }
    } catch {
      setDisputeDetail(null);
    } finally {
      setDisputeLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (booking?.dispute_id && allowed && session?.access_token) {
      fetchDisputeDetail(booking.dispute_id);
    }
  }, [booking?.dispute_id, allowed, session?.access_token]); // eslint-disable-line react-hooks/exhaustive-deps


  const displayPrice = useMemo(() => {
    const value = Number(booking?.custom_price ?? booking?.price ?? 0);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(value);
  }, [booking?.custom_price, booking?.price, locale]);

  const financials = useMemo(() => {
    if (!booking) return null;
    return getBookingDisputeFinancialOutcome(booking);
  }, [booking]);

  const formatMoney = useCallback((value: number) => new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value), [locale]);

  const handleSave = async () => {
    if (!booking?.dispute_id) return;
    setSaving(true);
    setSaveError("");
    try {
      const trimmedResolution = resolution.trim();
      if (newStatus !== "open" && !trimmedResolution) {
        setSaveError(t("admin.disputes.finalDecisionRequired"));
        setSaving(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${booking.dispute_id}/admin`, {
        method: "PUT",
        headers: {
          ...(session?.access_token ? adminApiHeaders(session.access_token) : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          resolution: trimmedResolution,
          ...(newStatus === "resolved" ? { refund_percentage: refundPercentage } : {}),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || t("admin.disputes.saveError"));

      setBooking((prev) => prev ? { ...prev, dispute_status: payload.status } : prev);
      await fetchDisputeDetail(booking.dispute_id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t("admin.disputes.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!allowed || (fetching && !booking && !loadError)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/admin/disputes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
              {t("admin.bookings.backToDisputes", { defaultValue: "Back to disputes" })}
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              {t("admin.bookings.title", { defaultValue: "Booking details" })}
            </h1>
            <p className="text-sm text-gray-500">{booking?.id}</p>
          </div>

          {booking?.dispute_id && booking.dispute_status && (
            <Badge className={DISPUTE_STATUS_STYLES[booking.dispute_status] ?? "bg-gray-100 text-gray-700"}>
              {t(`admin.status.${booking.dispute_status}`)}
            </Badge>
          )}
        </div>

        {loadError ? (
          <Card className="p-8 text-center space-y-4">
            <TriangleAlert className="mx-auto h-10 w-10 text-amber-500" />
            <p className="text-sm text-gray-600">{loadError}</p>
            <div className="flex items-center justify-center gap-2">
              <Link href="/admin/disputes">
                <Button variant="outline">{t("admin.bookings.backToDisputes", { defaultValue: "Back to disputes" })}</Button>
              </Link>
            </div>
          </Card>
        ) : booking ? (
          <div className="grid gap-5 lg:grid-cols-[1.25fr,0.75fr]">
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              <Card className="overflow-hidden bg-white">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <div className="relative min-h-56 bg-gray-100">
                    {booking.image_url ? (
                      <AppImage
                        src={booking.image_url}
                        alt={booking.title}
                        fill
                        sizes="(min-width: 768px) 220px, 100vw"
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <FileText className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-900">{booking.title}</h2>
                      <Badge className={STATUS_STYLES[booking.status] ?? "bg-gray-100 text-gray-700"}>{booking.status}</Badge>
                      {booking.payment_status && (
                        <Badge className={PAYMENT_STATUS_STYLES[booking.payment_status] ?? "bg-gray-100 text-gray-700"}>
                          {booking.payment_status}
                        </Badge>
                      )}
                    </div>

                    {booking.dispute_id && disputeDetail?.dispute.raised_by_name && (
                      <p className="text-sm">
                        <span className="font-bold text-red-600">{t("admin.disputes.raisedByLabel")} </span>
                        <span className="font-bold text-gray-900">{disputeDetail.dispute.raised_by_name}</span>
                      </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("admin.bookings.priceLabel", { defaultValue: "Price" })}</p>
                        <p className="mt-1 text-base font-semibold text-gray-900">{displayPrice}</p>
                      </div>
                      <div className="rounded-xl border bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("admin.bookings.categoryLabel", { defaultValue: "Category" })}</p>
                        <p className="mt-1 text-base text-gray-900">{booking.category || t("admin.support.notAvailable")}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <p>{t("admin.bookings.createdLabel", { defaultValue: "Created" })}: {new Date(booking.created_at).toLocaleDateString(locale)}</p>
                      {booking.completed_at && (
                        <p>{t("admin.bookings.completedLabel", { defaultValue: "Completed" })}: {new Date(booking.completed_at).toLocaleDateString(locale)}</p>
                      )}
                      <p>{t("admin.bookings.locationLabel", { defaultValue: "Location" })}: {booking.service_location || t("admin.support.notAvailable")}</p>
                      <p>{t("admin.bookings.paymentStatusLabel", { defaultValue: "Payment status" })}: {booking.payment_status || t("admin.support.notAvailable")}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Invoice card */}
              {financials && (
                <Card className="overflow-hidden bg-white">
                  <div className="grid grid-cols-2 divide-x">
                    {/* Worker — left */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b">
                        <TrendingUp className="h-3.5 w-3.5 text-green-700 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wide text-green-700">{t("admin.bookings.workerPayout", { defaultValue: "Versement prestataire" })}</span>
                      </div>
                      <div className="p-4 flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={booking.worker_avatar_url ?? undefined} alt={booking.worker_name} />
                          <AvatarFallback className="bg-green-100 text-green-800 font-semibold text-sm">
                            {(booking.worker_name ?? "W").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm">{booking.worker_name || t("admin.support.notAvailable")}</p>
                          <p className="text-xs text-gray-400 truncate">{booking.worker_email}</p>
                        </div>
                      </div>
                      <div className="px-4 pb-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{t("admin.bookings.basePrice", { defaultValue: "Prix du service" })}</span>
                          <span>{formatMoney(Number(booking.custom_price ?? booking.price ?? 0))}</span>
                        </div>
                        <div className="flex items-center justify-between text-red-500">
                          <span>{t("admin.bookings.platformFee", { defaultValue: "Commission plateforme (5%)" })}</span>
                          <span>- {formatMoney(workerCommissionFromGross(Number(booking.custom_price ?? booking.price ?? 0)))}</span>
                        </div>
                        {financials.hasFinancialAdjustment && financials.refundedBase !== null && (
                          <div className="flex items-center justify-between text-orange-500">
                            <span>{t("admin.disputes.workerAdjustment", { defaultValue: "Ajustement litige" })}</span>
                            <span>- {formatMoney(workerNetFromGross(financials.refundedBase))}</span>
                          </div>
                        )}
                        <div className="border-t pt-2 flex items-center justify-between font-bold text-gray-900">
                          <span>{t("admin.bookings.workerReceived", { defaultValue: "Vous recevrez" })}</span>
                          <span className="text-green-700 text-base">
                            {financials.finalWorkerReceives !== null
                              ? formatMoney(financials.finalWorkerReceives)
                              : formatMoney(financials.workerReceivesOriginal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Client — right */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b">
                        <TrendingDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("admin.bookings.clientPayment", { defaultValue: "Ce que le client a payé" })}</span>
                      </div>
                      <div className="p-4 flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={booking.client_avatar_url ?? undefined} alt={booking.client_name} />
                          <AvatarFallback className="bg-green-100 text-green-800 font-semibold text-sm">
                            {(booking.client_name ?? "C").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm">{booking.client_name || t("admin.support.notAvailable")}</p>
                          <p className="text-xs text-gray-400 truncate">{booking.client_email}</p>
                        </div>
                      </div>
                      <div className="px-4 pb-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{t("admin.bookings.basePrice", { defaultValue: "Prix du service" })}</span>
                          <span>{formatMoney(Number(booking.custom_price ?? booking.price ?? 0))}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between text-gray-600">
                            <span>{t("admin.bookings.buyerFee", { defaultValue: "Commission acheteur (5%)" })}</span>
                            <span>{formatMoney(Number(booking.custom_price ?? booking.price ?? 0) * 0.05)}</span>
                          </div>
                          <p className="text-xs text-red-500">{t("admin.bookings.nonRefundable", { defaultValue: "* Non remboursable" })}</p>
                        </div>
                        {booking.tax_rate ? (
                          <div className="flex items-center justify-between text-gray-600">
                            <span>{t("admin.bookings.taxes", { defaultValue: "Taxes" })} ({(booking.tax_rate * 100).toFixed(3).replace(/\.?0+$/, "")}%)</span>
                            <span>{formatMoney(Number(booking.custom_price ?? booking.price ?? 0) * booking.tax_rate)}</span>
                          </div>
                        ) : null}
                        {financials.hasFinancialAdjustment && financials.refundedAmount !== null && (
                          <div className="flex items-center justify-between text-blue-600">
                            <span>{t("admin.bookings.refundApplied", { defaultValue: "Remboursement" })} ({booking.dispute_refund_percentage}%)</span>
                            <span>- {formatMoney(financials.refundedAmount)}</span>
                          </div>
                        )}
                        <div className="border-t pt-2 flex items-center justify-between font-bold text-gray-900">
                          <span>{t("admin.bookings.clientPaid", { defaultValue: "Total" })}</span>
                          <span className="text-base">
                            {financials.finalClientPaid !== null
                              ? formatMoney(financials.finalClientPaid)
                              : formatMoney(financials.totalPaidOriginal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {financials.hasFinancialAdjustment && financials.refundedAmount !== null && (
                    <div className="border-t bg-blue-50 grid grid-cols-2 divide-x divide-blue-100">
                      <div className="px-5 py-3 text-sm space-y-0.5">
                        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">{t("admin.bookings.workerReceived", { defaultValue: "Worker — after dispute" })}</p>
                        <p className="font-bold text-gray-900">
                          {financials.finalWorkerReceives !== null ? formatMoney(financials.finalWorkerReceives) : formatMoney(financials.workerReceivesOriginal)}
                        </p>
                        {financials.refundedBase !== null && (
                          <p className="text-xs text-orange-500">- {formatMoney(workerNetFromGross(financials.refundedBase ?? 0))} {t("admin.disputes.adjustment", { defaultValue: "adjustment" })}</p>
                        )}
                      </div>
                      <div className="px-5 py-3 text-sm space-y-0.5">
                        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">{t("admin.bookings.clientPaid", { defaultValue: "Client — net paid" })}</p>
                        <p className="font-bold text-gray-900">
                          {financials.finalClientPaid !== null ? formatMoney(financials.finalClientPaid) : formatMoney(financials.totalPaidOriginal)}
                        </p>
                        {financials.refundedAmount !== null && (
                          <p className="text-xs text-blue-500">- {formatMoney(financials.refundedAmount)} {t("admin.bookings.refundApplied", { defaultValue: "refunded" })}</p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {booking.cancel_reason && (
                <Card className="p-4 bg-white">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{t("admin.bookings.cancelReasonLabel", { defaultValue: "Cancellation reason" })}</p>
                  <div className="rounded-lg border bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
                    {booking.cancel_reason}
                  </div>
                </Card>
              )}

              {/* Dispute thread — visible only when dispute exists */}
              {booking.dispute_id && (
                disputeLoading ? (
                  <Card className="p-10 flex items-center justify-center">
                    <Spinner size="lg" />
                  </Card>
                ) : disputeDetail ? (
                  <Card className="overflow-hidden bg-white">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
                      <h3 className="font-semibold text-gray-900">{t("admin.disputes.threadTitle")}</h3>
                      <Badge variant="outline">{t("admin.disputes.messageCount", { count: disputeDetail.messages.length })}</Badge>
                    </div>

                    <ScrollArea className="h-[520px]">
                      <div className="p-4 space-y-1 bg-white min-h-full">
                        {disputeDetail.messages.length === 0 ? (
                          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                            {t("admin.disputes.evidenceEmpty")}
                          </div>
                        ) : disputeDetail.messages.map((message, index) => {
                          const isClient = message.sender_email === booking.client_email;
                          const initial = message.sender_name?.charAt(0)?.toUpperCase() ?? "?";
                          const timeStr = new Date(message.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

                          const showDate = index === 0
                            || new Date(message.created_at).toDateString() !== new Date(disputeDetail.messages[index - 1].created_at).toDateString();
                          const dateStr = new Date(message.created_at).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" });

                          return (
                            <div key={message.id}>
                              {showDate && (
                                <div className="flex items-center gap-2 my-4">
                                  <div className="flex-1 h-px bg-gray-200" />
                                  <span className="text-[11px] text-gray-400 shrink-0 capitalize">{dateStr}</span>
                                  <div className="flex-1 h-px bg-gray-200" />
                                </div>
                              )}

                              <div className={`flex items-end gap-2 py-1 ${isClient ? "justify-start" : "justify-end"}`}>
                                {isClient && (
                                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 text-xs font-semibold shrink-0">
                                    {initial}
                                  </div>
                                )}

                                <div className={`flex flex-col gap-1 max-w-[72%] ${isClient ? "" : "items-end"}`}>
                                  <span className="text-[11px] text-gray-400 px-1">
                                    {message.sender_name} · {timeStr}
                                  </span>

                                  {message.content && (
                                    <div className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                                      isClient
                                        ? "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                                        : "bg-green-700 text-white rounded-br-sm"
                                    }`}>
                                      {message.content}
                                    </div>
                                  )}

                                  {message.attachments?.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                      {message.attachments.map((attachment, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => setLightboxImage(attachment.url)}
                                          className="group relative overflow-hidden rounded-xl border bg-white"
                                          title={attachment.name}
                                          aria-label={attachment.name}
                                        >
                                          <AppImage src={attachment.url} alt={attachment.name} width={160} height={120} className="h-28 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity rounded-xl">
                                            <ZoomIn className="h-5 w-5 text-white" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {!isClient && (
                                  <div className="h-8 w-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                    {initial}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </Card>
                ) : null
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5 lg:sticky lg:top-5 lg:self-start lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto">
              {/* Dispute resolution — visible only when dispute exists */}
              {booking.dispute_id && disputeDetail && (
                <>
                  {(() => {
                    const isLocked = disputeDetail.dispute.status !== "open";
                    return (
                  <Card className={`p-5 bg-white space-y-4 ${isLocked ? "opacity-80" : ""}`}>
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">{t("admin.disputes.resolutionSectionTitle")}</div>
                      <p className="text-xs text-gray-500">{t("admin.disputes.finalDecisionHelp")}</p>
                    </div>

                    {isLocked && (
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                        <span>🔒</span>
                        <span>{t("admin.disputes.decisionLocked", { defaultValue: "Decision already made — editing will be available in a future update." })}</span>
                      </div>
                    )}

                    {disputeDetail.dispute.resolution && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 whitespace-pre-wrap">
                        <span className="font-semibold">{t("admin.disputes.currentDecisionLabel")}</span>
                        <div className="mt-1">{disputeDetail.dispute.resolution}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="status" className="font-semibold text-gray-800">{t("admin.disputes.decisionLabel")}</Label>
                      <Select value={newStatus} onValueChange={(value: DisputeStatus) => setNewStatus(value)} disabled={isLocked}>
                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="open">{t("admin.disputes.decisionOpen")}</SelectItem>
                          <SelectItem value="resolved">{t("admin.disputes.decisionResolved")}</SelectItem>
                          <SelectItem value="rejected">{t("admin.disputes.decisionRejected")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newStatus === "resolved" && disputeDetail.refund_summary && (() => {
                      const base = disputeDetail.refund_summary.base_price_cents / 100;
                      const taxRate = booking.tax_rate ?? 0;
                      const refundBase = base * (refundPercentage / 100);
                      const refundTaxes = refundBase * taxRate;
                      const totalToClient = refundBase + refundTaxes;
                      const workerLoss = workerNetFromGross(refundBase);
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold text-gray-800">{t("admin.disputes.refundPercentageLabel", { defaultValue: "Refund percentage" })}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={50}
                                max={100}
                                value={refundPercentage}
                                onChange={(e) => setRefundPercentage(Math.max(50, Math.min(100, Number(e.target.value))))}
                                className="w-20 text-center bg-white"
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                          <div className="rounded-xl border overflow-hidden text-xs">
                            <div className="grid grid-cols-2 divide-x divide-gray-200">
                              {/* Worker */}
                              <div className="space-y-0">
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b">
                                  <TrendingUp className="h-3 w-3 text-green-700 shrink-0" />
                                  <span className="font-bold uppercase tracking-wide text-green-700 text-[10px]">{t("admin.bookings.workerPayout", { defaultValue: "Versement prestataire" })}</span>
                                </div>
                                <div className="p-3 flex items-center gap-2">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={booking.worker_avatar_url ?? undefined} />
                                    <AvatarFallback className="bg-green-100 text-green-800 font-semibold text-[10px]">
                                      {(booking.worker_name ?? "W").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold text-gray-800 truncate">{booking.worker_name}</span>
                                </div>
                                <div className="px-3 pb-3 space-y-1.5">
                                  <div className="flex justify-between text-gray-500">
                                    <span>{t("admin.bookings.basePrice", { defaultValue: "Prix du service" })}</span>
                                    <span className="font-semibold text-gray-800">{formatMoney(base)}</span>
                                  </div>
                                  <div className="flex justify-between text-red-500 font-medium">
                                    <span>{t("admin.bookings.platformFee", { defaultValue: "Commission (5%)" })}</span>
                                    <span>- {formatMoney(workerCommissionFromGross(base))}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1.5">
                                    <span>{t("admin.bookings.workerReceived", { defaultValue: "Reçu initialement" })}</span>
                                    <span>{formatMoney(workerNetFromGross(base))}</span>
                                  </div>
                                  <div className="border-t border-dashed border-gray-300 pt-1.5 flex justify-between text-red-500 font-medium">
                                    <span>{t("admin.disputes.adjustment", { defaultValue: "Ajustement litige" })}</span>
                                    <span>- {formatMoney(workerLoss)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1.5">
                                    <span>{t("admin.bookings.workerReceived", { defaultValue: "Vous recevrez" })}</span>
                                    <span className="text-green-700">{formatMoney(workerNetFromGross(base) - workerLoss)}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Client */}
                              <div className="space-y-0">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white border-b">
                                  <TrendingDown className="h-3 w-3 text-gray-500 shrink-0" />
                                  <span className="font-bold uppercase tracking-wide text-gray-500 text-[10px]">{t("admin.bookings.clientPayment", { defaultValue: "Ce que le client a payé" })}</span>
                                </div>
                                <div className="p-3 flex items-center gap-2">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={booking.client_avatar_url ?? undefined} />
                                    <AvatarFallback className="bg-green-100 text-green-800 font-semibold text-[10px]">
                                      {(booking.client_name ?? "C").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold text-gray-800 truncate">{booking.client_name}</span>
                                </div>
                                <div className="px-3 pb-3 space-y-1.5">
                                  <div className="flex justify-between text-gray-500">
                                    <span>{t("admin.bookings.basePrice", { defaultValue: "Prix du service" })}</span>
                                    <span className="font-semibold text-gray-800">{formatMoney(base)}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex justify-between text-gray-500">
                                      <span>{t("admin.bookings.buyerFee", { defaultValue: "Commission acheteur (5%)" })}</span>
                                      <span className="font-medium">{formatMoney(base * 0.05)}</span>
                                    </div>
                                    <span className="text-red-500 font-medium">{t("admin.bookings.nonRefundable", { defaultValue: "* Non remboursable" })}</span>
                                  </div>
                                  {taxRate > 0 && (
                                    <div className="flex justify-between text-gray-500">
                                      <span>{t("admin.bookings.taxes", { defaultValue: "Taxes" })} ({(taxRate * 100).toFixed(3).replace(/\.?0+$/, "")}%)</span>
                                      <span className="font-medium">{formatMoney(base * taxRate)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1.5">
                                    <span>{t("admin.bookings.clientPaid", { defaultValue: "Total payé" })}</span>
                                    <span>{formatMoney(base + base * 0.05 + base * taxRate)}</span>
                                  </div>
                                  <div className="border-t border-dashed border-gray-300 pt-1.5 flex justify-between text-green-700 font-medium">
                                    <span>{t("admin.bookings.refundApplied", { defaultValue: "Remboursement" })} ({refundPercentage}%)</span>
                                    <span>- {formatMoney(totalToClient)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1.5">
                                    <span>{t("admin.bookings.clientPaid", { defaultValue: "Net payé" })}</span>
                                    <span className="text-green-700">{formatMoney(base + base * 0.05 + base * taxRate - totalToClient)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      <Label htmlFor="resolution" className="font-semibold text-gray-800">
                        {t("admin.disputes.finalDecisionMessage")} <span className="text-gray-400 font-normal">({t("admin.disputes.visibleToBoth")})</span>
                      </Label>
                      <Textarea
                        id="resolution"
                        placeholder={t("admin.disputes.explainDecision")}
                        value={resolution}
                        onChange={(event) => setResolution(event.target.value)}
                        rows={5}
                        disabled={isLocked}
                      />
                    </div>

                    {saveError && (
                      <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{saveError}</span>
                      </p>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button
                        className="bg-green-700 hover:bg-green-800 text-white"
                        onClick={handleSave}
                        disabled={saving || disputeLoading || isLocked}
                      >
                        {saving ? t("admin.disputes.saving") : t("admin.disputes.saveDecision")}
                      </Button>
                    </div>
                  </Card>
                  );})()}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  );
}
