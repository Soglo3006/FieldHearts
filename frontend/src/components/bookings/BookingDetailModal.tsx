"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  X, MapPin, CalendarDays, Tag, CheckCircle, CreditCard, FileText, Grid3x3,
} from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import DisputeThread from "@/components/bookings/DisputeThread";
import WorkerCustomizeSection from "./WorkerCustomizeSection";
import BookingDetailFooter from "./BookingDetailFooter";
import { useTranslation } from "react-i18next";

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
  client_name?: string;
  worker_name?: string;
  service_type?: "offer" | "looking";
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
  accepted:  "bg-blue-100 text-blue-800 border-blue-200",
  active:    "bg-green-100 text-green-800 border-green-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  rejected:  "bg-red-100 text-red-700 border-red-200",
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-CA", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

export default function BookingDetailModal({
  booking: initialBooking, userRole, accessToken,
  onClose, onUpdated, onMessage, onOpenReview, onOpenDispute,
}: Props) {
  const { t } = useTranslation();
  const [booking, setBooking] = useState(initialBooking);
  const [serviceDescription, setServiceDescription] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { setBooking(initialBooking); }, [initialBooking]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${booking.service_id}`)
      .then((r) => r.json())
      .then((s) => { if (s?.description) setServiceDescription(s.description); })
      .catch(() => {});
  }, [booking.service_id]);

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

  const handleFooterUpdated = (data: Partial<BookingDetail>) => {
    setBooking((prev) => ({ ...prev, ...data }));
    onUpdated(booking.id, data);
  };

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
            {booking.image_url ? (
              <img src={booking.image_url} alt={booking.title} className="w-full h-full object-cover" />
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
                const buyerCommission = base * 0.05;
                const transactionFee  = base * 0.03;
                const gst             = base * 0.05;
                const qst             = base * 0.09975;
                const total = base + buyerCommission + transactionFee + gst + qst;
                const fmt = (n: number) => n.toFixed(2);
                return (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("serviceDetail.servicePrice")}</span>
                      <span className="font-semibold">
                        ${fmt(base)}
                        {booking.custom_price && Number(booking.custom_price) !== origBase && (
                          <span className="text-xs text-gray-400 line-through ml-2">${fmt(origBase)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("serviceDetail.buyerCommission")}</span>
                      <span className="text-gray-700">${fmt(buyerCommission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("serviceDetail.transactionFee")}</span>
                      <span className="text-gray-700">${fmt(transactionFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("serviceDetail.gst")}</span>
                      <span className="text-gray-700">${fmt(gst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("serviceDetail.qst")}</span>
                      <span className="text-gray-700">${fmt(qst)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                      <span>{t("serviceDetail.total")}</span>
                      <span className="text-green-700">${fmt(total)}</span>
                    </div>
                  </div>
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
                  <p className="text-sm text-gray-700">{t("bookings.adjustedPrice")} <span className="font-semibold text-green-700">${Number(booking.custom_price)}</span></p>
                )}
                {booking.worker_note && <p className="text-sm text-gray-600 whitespace-pre-line">{booking.worker_note}</p>}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("bookings.requestedOn")} {formatDate(booking.created_at)}
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
