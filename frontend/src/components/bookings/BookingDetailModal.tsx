"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  X, MapPin, CalendarDays, Tag, CheckCircle, CreditCard, FileText, Grid3x3,
  TrendingDown, TrendingUp, ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import DisputeThread from "@/components/bookings/DisputeThread";
import WorkerCustomizeSection from "./WorkerCustomizeSection";
import BookingDetailFooter from "./BookingDetailFooter";
import { useTranslation } from "react-i18next";
import { getTaxRate, getTaxLabel, formatTaxRate } from "@/lib/taxes";

type BookingStatus = "pending" | "accepted" | "active" | "completed" | "cancelled" | "rejected";

export interface BookingDetail {
  id: string;
  service_id: string;
  client_id: string;
  worker_id: string;
  status: BookingStatus;
  created_at: string;
  title: string;
  price: string | number;
  image_url: string | null;
  image_urls?: string[] | null;
  category: string | null;
  service_location: string | null;
  client_description: string | null;
  has_reviewed: boolean;
  has_dispute: boolean;
  payment_status: string | null;
  completed_by_worker: boolean;
  completed_by_client: boolean;
  is_one_time?: boolean;
  worker_note?: string | null;
  custom_price?: number | null;
  last_modified_at?: string | null;
  modified_fields?: string[] | null;
  cancel_requested_by?: string | null;
  cancel_reason?: string | null;
  completed_at?: string | null;
  client_name?: string;
  worker_name?: string;
  service_type?: "offer" | "looking";
  client_province?: string | null;
  worker_province?: string | null;
  tax_rate?: number | null;
}

interface Props {
  booking: BookingDetail;
  userRole: "worker" | "client";
  accessToken: string;
  onClose: () => void;
  onUpdated: (bookingId: string, updates: Partial<BookingDetail>) => void;
  onMessage: (userId: string) => void;
  onOpenReview: (bookingId: string, targetName: string) => void;
  onOpenDispute: (bookingId: string, title: string) => void;
}

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted:  "bg-green-100 text-green-800 border-green-200",
  active:    "bg-green-100 text-green-800 border-green-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  rejected:  "bg-red-100 text-red-700 border-red-200",
};

function formatDate(dateStr: string, lang: string) {
  try {
    return new Date(dateStr).toLocaleDateString(lang.startsWith("fr") ? "fr-CA" : "en-CA", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

export default function BookingDetailModal({
  booking: initialBooking, userRole, accessToken,
  onClose, onUpdated, onMessage, onOpenReview, onOpenDispute,
}: Props) {
  const { t, i18n } = useTranslation();
  useScrollLock(true);
  const [booking, setBooking] = useState(initialBooking);
  const [serviceDescription, setServiceDescription] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const bookingRef = useRef(booking);
  bookingRef.current = booking;

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${initialBooking.service_id}`)
      .then((r) => r.json())
      .then((s) => { if (s?.description) setServiceDescription(s.description); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 4s while active so both parties see live completion state
  useEffect(() => {
    const interval = setInterval(async () => {
      if (bookingRef.current.status !== "active") return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingRef.current.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setBooking((prev) => {
          if (
            prev.completed_by_worker !== data.completed_by_worker ||
            prev.completed_by_client !== data.completed_by_client ||
            prev.status !== data.status
          ) {
            return { ...prev, ...data };
          }
          return prev;
        });
      } catch { /* silent */ }
    }, 4000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callStatus = async (status: BookingStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setBooking((prev) => ({ ...prev, status }));
      onUpdated(booking.id, { status });
    } finally { setUpdating(false); }
  };

  const callMarkCompleted = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setBooking((prev) => ({ ...prev, ...data }));
      onUpdated(booking.id, data);
    } finally { setUpdating(false); }
  };

  const callUndoMarkCompleted = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/uncomplete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setBooking((prev) => ({ ...prev, ...data }));
      onUpdated(booking.id, data);
    } finally { setUpdating(false); }
  };

  const handleFooterUpdated = (data: Partial<BookingDetail>) => {
    setBooking((prev) => ({ ...prev, ...data }));
    onUpdated(booking.id, data);
  };

  const images = booking.image_urls?.length ? booking.image_urls : booking.image_url ? [booking.image_url] : [];
  const [imgIndex, setImgIndex] = useState(0);
  const prevImg = useCallback(() => setImgIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const nextImg = useCallback(() => setImgIndex((i) => (i + 1) % images.length), [images.length]);

  const currentUserId = userRole === "worker" ? booking.worker_id : booking.client_id;
  const otherUserName = userRole === "worker" ? (booking.client_name ?? t("bookings.clientLabel")) : (booking.worker_name ?? t("bookings.providerLabel"));
  const otherUserId = userRole === "worker" ? booking.client_id : booking.worker_id;
  const needsPayment = booking.status === "accepted" && (!booking.payment_status || booking.payment_status === "unpaid");
  const hasMarkedDone = userRole === "worker" ? booking.completed_by_worker : booking.completed_by_client;
  const otherHasMarkedDone = userRole === "worker" ? booking.completed_by_client : booking.completed_by_worker;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[booking.status]}`}>
              {t(`bookings.${booking.status}`)}
            </span>
            {booking.is_one_time && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                <Tag className="h-3 w-3" /> {t("bookings.oneTime")}
              </span>
            )}
            {booking.payment_status && booking.payment_status !== "unpaid" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                <CreditCard className="h-3 w-3" />
                {booking.payment_status === "transferred" ? t("bookings.paidOut") : t("bookings.paid")}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <AspectRatio ratio={16 / 9}>
            {images.length > 0 ? (
              <div className="relative w-full h-full">
                <img src={images[imgIndex]} alt={booking.title} className="w-full h-full object-cover" />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImg}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextImg}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setImgIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${i === imgIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                        />
                      ))}
                    </div>
                    <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {imgIndex + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <Grid3x3 className="h-10 w-10 text-gray-300" />
              </div>
            )}
          </AspectRatio>

          <div className="px-5 py-4 space-y-4">
            {/* Modification banner */}
            {userRole === "client" && booking.last_modified_at && (booking.modified_fields?.length ?? 0) > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800">
                <p className="font-semibold mb-0.5">{t("bookings.recentlyModified")}</p>
                <p className="text-xs">{t("bookings.providerUpdated")} <span className="font-medium">{booking.modified_fields!.join(", ")}</span>. {t("bookings.reviewBeforePaying")}</p>
              </div>
            )}

            {/* Service info */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">{booking.title}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-2">
                {booking.category && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{booking.category}</span>}
                {booking.service_location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{booking.service_location}</span>
                )}
              </div>
              {(() => {
                const base = Number(booking.custom_price ?? booking.price);
                const origBase = Number(booking.price);
                const fmt = (n: number) => n.toFixed(2);

                const taxRate         = booking.tax_rate ? Number(booking.tax_rate) : getTaxRate(booking.worker_province ?? booking.client_province ?? "QC");
                const taxLabel        = getTaxLabel(booking.worker_province ?? booking.client_province ?? "QC", i18n.language ?? "fr");
                const buyerCommission = base * 0.05;
                const taxes           = base * taxRate;
                const totalPaid       = base + buyerCommission + taxes;
                const commission20    = base * 0.20;
                const workerReceives  = base * 0.80;

                if (["cancelled", "rejected"].includes(booking.status)) return null;

                // Completed: worker sees client summary + payout, client sees total paid only
                if (booking.status === "completed") {
                  if (userRole === "worker") {
                    return (
                      <div className="space-y-3">
                        {/* What the client paid */}
                        <Card className="overflow-hidden shadow-none">
                          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                            <TrendingDown className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("bookings.clientPaid")}</span>
                          </div>
                          <CardContent className="p-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                              <span>{t("serviceDetail.servicePrice")}</span>
                              <span className="font-medium">{fmt(base)} $</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>{t("serviceDetail.buyerCommission")}</span>
                              <span>{fmt(buyerCommission)} $</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <div>
                                <div>{t("serviceDetail.taxes")} ({formatTaxRate(taxRate)}%)</div>
                                <div className="text-[11px] text-gray-400">{taxLabel}</div>
                              </div>
                              <span>{fmt(taxes)} $</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-base">
                              <span>{t("serviceDetail.total")}</span>
                              <span className="text-gray-900">{fmt(totalPaid)} $</span>
                            </div>
                          </CardContent>
                        </Card>
                        {/* Worker payout */}
                        <Card className="overflow-hidden border-green-100 shadow-none">
                          <div className="flex items-center gap-2 bg-green-50 px-4 py-2.5 border-b border-green-100">
                            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">{t("bookings.workerPayout")}</span>
                          </div>
                          <CardContent className="p-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                              <span>{t("serviceDetail.servicePrice")}</span>
                              <span className="font-medium">{fmt(base)} $</span>
                            </div>
                            <div className="flex justify-between text-red-500">
                              <span>{t("bookings.platformCommission20")}</span>
                              <span>−{fmt(commission20)} $</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-base">
                              <span className="text-gray-900">{t("bookings.youWillReceive")}</span>
                              <span className="text-green-600">{fmt(workerReceives)} $</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }
                  // Client completed view
                  return (
                    <Card className="overflow-hidden shadow-none">
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                        <TrendingDown className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("bookings.totalPaid")}</span>
                      </div>
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>{t("serviceDetail.servicePrice")}</span>
                          <span className="font-medium">
                            {fmt(base)} $
                            {booking.custom_price && Number(booking.custom_price) !== origBase && (
                              <span className="text-xs text-gray-400 line-through ml-2">{fmt(origBase)} $</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>{t("serviceDetail.buyerCommission")}</span>
                          <span>{fmt(buyerCommission)} $</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <div>
                            <div>{t("serviceDetail.taxes")} ({formatTaxRate(taxRate)}%)</div>
                            <div className="text-[11px] text-gray-400">{taxLabel}</div>
                          </div>
                          <span>{fmt(taxes)} $</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-base">
                          <span>{t("serviceDetail.total")}</span>
                          <span className="text-gray-900">{fmt(totalPaid)} $</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Worker view (pending/accepted/active): payment summary + projected earnings
                if (userRole === "worker") {
                  return (
                    <div className="space-y-3">
                      {/* Full payment breakdown — what the client paid */}
                      <Card className="overflow-hidden shadow-none">
                        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                          <TrendingDown className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("bookings.clientPaid")}</span>
                        </div>
                        <CardContent className="p-4 space-y-2 text-sm">
                          <div className="flex justify-between text-gray-600">
                            <span>{t("serviceDetail.servicePrice")}</span>
                            <span className="font-medium">
                              {fmt(base)} $
                              {booking.custom_price && Number(booking.custom_price) !== origBase && (
                                <span className="text-xs text-gray-400 line-through ml-2">{fmt(origBase)} $</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>{t("serviceDetail.buyerCommission")}</span>
                            <span>{fmt(buyerCommission)} $</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <div>
                              <div>{t("serviceDetail.taxes")} ({formatTaxRate(taxRate)}%)</div>
                              <div className="text-[11px] text-gray-400">{taxLabel}</div>
                            </div>
                            <span>{fmt(taxes)} $</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold text-base">
                            <span>{t("serviceDetail.total")}</span>
                            <span className="text-gray-900">{fmt(totalPaid)} $</span>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Worker earnings */}
                      <Card className="overflow-hidden border-green-100 shadow-none">
                        <div className="flex items-center gap-2 bg-green-50 px-4 py-2.5 border-b border-green-100">
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">{t("bookings.yourEarnings")}</span>
                        </div>
                        <CardContent className="p-4 space-y-2 text-sm">
                          <div className="flex justify-between text-gray-600">
                            <span>{t("serviceDetail.servicePrice")}</span>
                            <span className="font-medium">{fmt(base)} $</span>
                          </div>
                          <div className="flex justify-between text-red-500">
                            <span>{t("bookings.platformCommission20")}</span>
                            <span>−{fmt(commission20)} $</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold text-base">
                            <span className="text-gray-900">{t("bookings.youWillReceive")}</span>
                            <span className="text-green-600">{fmt(workerReceives)} $</span>
                          </div>
                          <p className="text-[11px] text-gray-400">{t("bookings.payoutDelay")}</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                }

                // Client view (pending/accepted/active): payment summary
                return (
                  <Card className="overflow-hidden shadow-none">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                      <TrendingDown className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("bookings.paymentSummary")}</span>
                    </div>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>{t("serviceDetail.servicePrice")}</span>
                        <span className="font-medium">
                          {fmt(base)} $
                          {booking.custom_price && Number(booking.custom_price) !== origBase && (
                            <span className="text-xs text-gray-400 line-through ml-2">{fmt(origBase)} $</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>{t("serviceDetail.buyerCommission")}</span>
                        <span>{fmt(buyerCommission)} $</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <div>
                          <div>{t("serviceDetail.taxes")} ({formatTaxRate(taxRate)}%)</div>
                          <div className="text-[11px] text-gray-400">{taxLabel}</div>
                        </div>
                        <span>{fmt(taxes)} $</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>{t("serviceDetail.total")}</span>
                        <span className="text-green-600">{fmt(totalPaid)} $</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {serviceDescription && (
              <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                {serviceDescription.length > 240 ? serviceDescription.slice(0, 240) + "…" : serviceDescription}
              </div>
            )}

            <div className="border-t border-gray-100" />

            {/* Other user */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="text-sm bg-green-100 text-green-800">
                  {otherUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-gray-500">{userRole === "worker" ? t("bookings.requestFrom") : t("bookings.serviceBy")}</p>
                <p className="text-sm font-semibold text-gray-900">{otherUserName}</p>
              </div>
            </div>

            {/* Client description */}
            {booking.client_description ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                  <FileText className="h-3.5 w-3.5" />
                  {userRole === "worker" ? t("bookings.clientRequestDetails") : t("bookings.yourRequestDetails")}
                </div>
                <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-line">{booking.client_description}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">{t("bookings.noRequestDescription")}</p>
            )}

            {/* Worker customize */}
            {userRole === "worker" && ["pending", "accepted"].includes(booking.status) && (
              <WorkerCustomizeSection
                booking={booking}
                accessToken={accessToken}
                onSaved={(data) => {
                  setBooking((prev) => ({ ...prev, ...data }));
                  onUpdated(booking.id, data as Partial<BookingDetail>);
                }}
              />
            )}

            {/* Worker note → client */}
            {userRole === "client" && (booking.worker_note || booking.custom_price) && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">{t("bookings.providerNote")}</p>
                {booking.custom_price && Number(booking.custom_price) !== Number(booking.price) && (
                  <p className="text-sm text-gray-700">{t("bookings.adjustedPrice")} <span className="font-semibold text-green-700">{Number(booking.custom_price).toFixed(2)} $</span></p>
                )}
                {booking.worker_note && <p className="text-sm text-gray-600 whitespace-pre-line">{booking.worker_note}</p>}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("bookings.requestedOn")} {formatDate(booking.created_at, i18n.language ?? "fr")}
            </div>

            {booking.status === "accepted" && userRole === "worker" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                {t("bookings.waitingForPayment")}
              </div>
            )}
            {booking.status === "active" && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">{t("bookings.jobInProgress")}</div>
                <div className="flex gap-4">
                  <span className={`flex items-center gap-1 ${booking.completed_by_worker ? "text-green-600" : "text-gray-400"}`}>
                    <CheckCircle className="h-3.5 w-3.5" /> {t("bookings.providerLabel")} {booking.completed_by_worker ? "✓" : t("bookings.pending")}
                  </span>
                  <span className={`flex items-center gap-1 ${booking.completed_by_client ? "text-green-600" : "text-gray-400"}`}>
                    <CheckCircle className="h-3.5 w-3.5" /> {t("bookings.clientLabel")} {booking.completed_by_client ? "✓" : t("bookings.pending")}
                  </span>
                </div>
              </div>
            )}

            {booking.status === "completed" && (() => {
              const DISPUTE_DAYS = 3;
              if (!booking.completed_at) return null;
              const completedMs = new Date(booking.completed_at).getTime();
              const deadlineMs = completedMs + DISPUTE_DAYS * 24 * 60 * 60 * 1000;
              const remainingMs = deadlineMs - Date.now();
              const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
              const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
              if (remainingMs <= 0) return null;
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {i18n.language?.startsWith("fr") ? "Fenêtre de litige" : "Dispute window"}
                  </div>
                  <p>
                    {i18n.language?.startsWith("fr")
                      ? `Vous pouvez ouvrir un litige encore ${remainingDays > 1 ? `${remainingDays} jours` : `${remainingHours} heure${remainingHours > 1 ? "s" : ""}`}. Remboursement max : 50 %.`
                      : `You can open a dispute for ${remainingDays > 1 ? `${remainingDays} more days` : `${remainingHours} more hour${remainingHours > 1 ? "s" : ""}`}. Max refund: 50%.`}
                  </p>
                </div>
              );
            })()}

            {booking.has_dispute && (
              <DisputeThread bookingId={booking.id} currentUserId={currentUserId} accessToken={accessToken} />
            )}
          </div>
        </div>

        <BookingDetailFooter
          booking={booking}
          userRole={userRole}
          updating={updating}
          hasMarkedDone={hasMarkedDone}
          otherHasMarkedDone={otherHasMarkedDone}
          needsPayment={needsPayment}
          accessToken={accessToken}
          otherUserName={otherUserName}
          otherUserId={otherUserId}
          currentUserId={currentUserId}
          onCallStatus={callStatus}
          onMarkCompleted={callMarkCompleted}
          onUndoMarkCompleted={callUndoMarkCompleted}
          onUpdated={handleFooterUpdated}
          onOpenDispute={onOpenDispute}
          onOpenReview={onOpenReview}
          onMessage={onMessage}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
