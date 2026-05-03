"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  X, MapPin, CalendarDays, Tag, CheckCircle, CreditCard, FileText, Grid3x3,
  TrendingDown, TrendingUp, ChevronLeft, AlertTriangle, Star,
  ImagePlus, Loader2,
} from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import DisputeThread from "@/components/bookings/DisputeThread";
import WorkerCustomizeSection from "./WorkerCustomizeSection";
import BookingDetailFooter from "./BookingDetailFooter";
import { useTranslation } from "react-i18next";
import { getTaxRate, getTaxLabel, formatTaxRate } from "@/lib/taxes";
import { uploadDisputeAttachments, type DisputeAttachment } from "@/lib/disputeAttachments";
import { getBookingDisputeFinancialOutcome } from "@/lib/disputeFinancials";
import { getIntlLocale } from "@/lib/locale";
import { sanitizePlainText } from "@/lib/sanitize";
import AppImage from "@/components/ui/AppImage";
import PaymentInlinePanel from "@/components/payment/PaymentInlinePanel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type BookingStatus = "pending" | "accepted" | "active" | "completed" | "cancelled" | "rejected";
type BookingStep = "detail" | "payment" | "review" | "dispute";

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
  dispute_id?: string | null;
  dispute_status?: "open" | "resolved" | "rejected" | null;
  dispute_resolution?: string | null;
  dispute_created_at?: string | null;
  dispute_refund_percentage?: number | null;
}

interface Props {
  booking: BookingDetail;
  userRole: "worker" | "client";
  accessToken: string;
  onClose: () => void;
  onUpdated: (bookingId: string, updates: Partial<BookingDetail>) => void;
  onMessage: (userId: string) => void;
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
    return new Date(dateStr).toLocaleDateString(getIntlLocale(lang, { fr: 'fr-CA', en: 'en-CA' }), {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

/** Même principe que ServiceHero (page détail service) : Embla, flèches, compteur 1/n. */
function BookingDetailHeroCarousel({ images, title }: { images: string[]; title: string }) {
  const validImages = images.filter(Boolean);
  const count = validImages.length;
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const handleSelect = () => setIndex(api.selectedScrollSnap());
    handleSelect();
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);
    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);

  if (count === 0) {
    return (
      <div className="w-full h-full bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Grid3x3 className="h-10 w-10 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Carousel
        key={validImages.join("|")}
        setApi={setApi}
        opts={{ align: "start", loop: count > 1 }}
        className="h-full w-full"
      >
        <CarouselContent className="ml-0 h-full">
          {validImages.map((image, imageIndex) => (
            <CarouselItem key={`${image}-${imageIndex}`} className="pl-0 h-full">
              <AppImage
                src={image}
                alt={`${title} - ${imageIndex + 1}`}
                width={1600}
                height={900}
                sizes="(max-width: 1024px) 100vw, 512px"
                className="h-full w-full object-cover"
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        {count > 1 && (
          <>
            <CarouselPrevious
              className="left-3 top-1/2 z-10 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            />
            <CarouselNext
              className="right-3 top-1/2 z-10 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            />
          </>
        )}
      </Carousel>

      {count > 1 && (
        <span className="absolute top-3 right-3 z-11 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
          {index + 1} / {count}
        </span>
      )}
    </div>
  );
}

export default function BookingDetailModal({
  booking: initialBooking, userRole, accessToken,
  onClose, onUpdated, onMessage,
}: Props) {
  const { t, i18n } = useTranslation();
  useScrollLock(true);
  const [booking, setBooking] = useState(initialBooking);
  const [serviceDescription, setServiceDescription] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [step, setStep] = useState<BookingStep>("detail");
  const [layoutMode, setLayoutMode] = useState<"review" | "dispute" | "payment">("review");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHovered, setReviewHovered] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputePhotos, setDisputePhotos] = useState<File[]>([]);
  const [disputePreviews, setDisputePreviews] = useState<string[]>([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeUploading, setDisputeUploading] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  const [disputeSuccess, setDisputeSuccess] = useState(false);
  const bookingRef = useRef(booking);
  const disputeFileInputRef = useRef<HTMLInputElement>(null);
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

  const images = booking.image_urls?.length ? booking.image_urls : booking.image_url ? [booking.image_url] : [];

  const currentUserId = userRole === "worker" ? booking.worker_id : booking.client_id;
  const otherUserName = userRole === "worker" ? (booking.client_name ?? t("bookings.clientLabel")) : (booking.worker_name ?? t("bookings.providerLabel"));
  const otherUserId = userRole === "worker" ? booking.client_id : booking.worker_id;
  const needsPayment = booking.status === "accepted" && (!booking.payment_status || booking.payment_status === "unpaid");
  const hasMarkedDone = userRole === "worker" ? booking.completed_by_worker : booking.completed_by_client;
  const otherHasMarkedDone = userRole === "worker" ? booking.completed_by_client : booking.completed_by_worker;
  const panelOrders = layoutMode === "dispute"
    ? { review: 0, detail: 1, dispute: 2, payment: 3 }
    : layoutMode === "payment"
      ? { review: 0, detail: 1, payment: 2, dispute: 3 }
      : { dispute: 0, detail: 1, review: 2, payment: 3 };
  const activeIndex = panelOrders[step];
  const translateClass = ["translate-x-0", "-translate-x-1/4", "-translate-x-1/2", "-translate-x-3/4"][activeIndex];
  const orderClasses = ["order-1", "order-2", "order-3", "order-4"];
  const disputeIsValid = disputeDescription.trim().length >= 20;
  const disputeStatus = booking.dispute_status ?? (booking.has_dispute ? "open" : null);
  const disputeIsClosed = disputeStatus === "resolved" || disputeStatus === "rejected";
  const disputeFinancialOutcome = getBookingDisputeFinancialOutcome(booking);
  const displayStatusBadge = (() => {
    if (booking.status === "completed" && disputeIsClosed) {
      if (disputeFinancialOutcome.refundType === "full") {
        return { label: t("bookings.refundedFull"), className: "bg-green-100 text-green-800 border-green-200" };
      }
      if (disputeFinancialOutcome.refundType === "partial") {
        return { label: t("bookings.refundedPartial"), className: "bg-amber-100 text-amber-800 border-amber-200" };
      }
      return { label: t("bookings.notRefunded"), className: "bg-gray-100 text-gray-700 border-gray-200" };
    }

    return {
      label: t(`bookings.${booking.status}`),
      className: STATUS_BADGE[booking.status],
    };
  })();
  const displayPaymentBadge = (() => {
    if (booking.has_dispute && !disputeIsClosed) {
      return { label: t("bookings.disputeUnderReviewBadge"), className: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    if (booking.has_dispute && disputeIsClosed) {
      return { label: t("bookings.disputeClosedBadge"), className: "bg-gray-100 text-gray-700 border-gray-200" };
    }
    if (booking.payment_status && booking.payment_status !== "unpaid") {
      return {
        label: booking.payment_status === "transferred" ? t("bookings.paidOut") : t("bookings.paid"),
        className: "bg-green-100 text-green-700 border-green-200",
      };
    }
    return null;
  })();

  const resetReviewPanel = () => {
    setReviewError("");
    setReviewSuccess(false);
  };

  const resetDisputePanel = () => {
    setDisputeError("");
    setDisputeSuccess(false);
  };

  const openReviewStep = () => {
    setLayoutMode("review");
    resetReviewPanel();
    setStep("review");
  };

  const openDisputeStep = () => {
    setLayoutMode("dispute");
    resetDisputePanel();
    setStep("dispute");
  };

  const handleReviewSubmit = async () => {
    if (reviewRating === 0) {
      setReviewError(t("bookings.reviewModal.selectRating"));
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          rating: reviewRating,
          comment: sanitizePlainText(reviewComment),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReviewError(data.message ?? t("bookings.reviewModal.submitFailed"));
        return;
      }

      setReviewSuccess(true);
      setBooking((prev) => ({ ...prev, has_reviewed: true }));
      onUpdated(booking.id, { has_reviewed: true });
      setTimeout(() => setStep("detail"), 700);
    } catch {
      setReviewError(t("bookings.reviewModal.networkError"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDisputePhotos = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 4);
    setDisputePhotos((prev) => [...prev, ...valid].slice(0, 4));
    setDisputePreviews((prev) => [...prev, ...valid.map((file) => URL.createObjectURL(file))].slice(0, 4));
  };

  const removeDisputePhoto = (idx: number) => {
    URL.revokeObjectURL(disputePreviews[idx]);
    setDisputePhotos((prev) => prev.filter((_, i) => i !== idx));
    setDisputePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDisputeSubmit = async () => {
    if (!disputeIsValid) {
      setDisputeError(t("bookings.openDisputeModal.descriptionTooShort"));
      return;
    }

    setDisputeSubmitting(true);
    setDisputeError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ booking_id: booking.id, description: disputeDescription.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDisputeError(data.message ?? t("bookings.openDisputeModal.openFailed"));
        return;
      }

      const dispute = await res.json();
      let attachments: DisputeAttachment[] = [];
      if (disputePhotos.length > 0) {
        setDisputeUploading(true);
        attachments = await uploadDisputeAttachments({ disputeId: dispute.id, files: disputePhotos, accessToken });
        setDisputeUploading(false);
      }

      const messageRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${dispute.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content: disputeDescription.trim(), attachments }),
      });
      if (!messageRes.ok) {
        const data = await messageRes.json().catch(() => ({}));
        setDisputeError(data.message ?? t("bookings.openDisputeModal.openFailed"));
        return;
      }

      setDisputeSuccess(true);
      const openedAt = new Date().toISOString();
      setBooking((prev) => ({
        ...prev,
        has_dispute: true,
        dispute_id: dispute.id,
        dispute_status: "open",
        dispute_resolution: null,
        dispute_created_at: openedAt,
      }));
      onUpdated(booking.id, {
        has_dispute: true,
        dispute_id: dispute.id,
        dispute_status: "open",
        dispute_resolution: null,
        dispute_created_at: openedAt,
      });
      setTimeout(() => setStep("detail"), 700);
    } catch (error) {
      setDisputeError(error instanceof Error ? error.message : t("bookings.openDisputeModal.networkError"));
    } finally {
      setDisputeSubmitting(false);
      setDisputeUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col z-10 overflow-hidden">
        {/* Header — changes based on step */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          {step !== "detail" ? (
            <button
              type="button"
              onClick={() => setStep("detail")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === "payment"
                ? t("payment.completePayment")
                : step === "review"
                  ? t("bookings.leaveReview")
                  : t("bookings.openDispute")}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${displayStatusBadge.className}`}>
                {displayStatusBadge.label}
              </span>
              {booking.is_one_time && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  <Tag className="h-3 w-3" /> {t("bookings.oneTime")}
                </span>
              )}
              {displayPaymentBadge && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${displayPaymentBadge.className}`}>
                  <CreditCard className="h-3 w-3" />
                  {displayPaymentBadge.label}
                </span>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sliding panels container */}
        <div className={`flex flex-1 min-h-0 w-[400%] transition-transform duration-300 ease-in-out ${translateClass}`}>
          {/* Panel 1 — dispute step */}
          <div className={`flex flex-col overflow-hidden w-1/4 ${orderClasses[panelOrders.dispute]}`}>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 space-y-1.5">
                <p>{t("bookings.openDisputeModal.intro")}</p>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5">
                  <li>{t("bookings.openDisputeModal.ruleCompleted")}</li>
                  <li>{t("bookings.openDisputeModal.ruleInProgress")}</li>
                  <li>{t("bookings.openDisputeModal.ruleFees")}</li>
                  <li>{t("bookings.openDisputeModal.ruleCaseByCase")}</li>
                </ul>
              </div>

              {disputeError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{disputeError}</p>
              )}

              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">
                  {t("bookings.openDisputeModal.describeLabel")} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder={t("bookings.openDisputeModal.describePlaceholder")}
                  className="min-h-32 resize-none rounded-xl"
                />
                <p className={`text-xs text-right ${disputeDescription.length < 20 ? "text-gray-400" : "text-green-600"}`}>
                  {t("bookings.openDisputeModal.minimumCount", { count: disputeDescription.length })}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">{t("bookings.openDisputeModal.photosLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {disputePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <AppImage src={src} alt={t("bookings.openDisputeModal.photoAlt", { number: i + 1 })} width={64} height={64} className="h-16 w-16 object-cover rounded-xl border border-gray-200" />
                      <button
                        type="button"
                        aria-label={t("bookings.openDisputeModal.removePhoto")}
                        onClick={() => removeDisputePhoto(i)}
                        className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full h-4 w-4 flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  {disputePhotos.length < 4 && (
                    <button
                      type="button"
                      aria-label={t("bookings.openDisputeModal.addPhoto")}
                      onClick={() => disputeFileInputRef.current?.click()}
                      className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <input
                  ref={disputeFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  aria-label={t("bookings.openDisputeModal.uploadPhotos")}
                  title={t("bookings.openDisputeModal.uploadPhotos")}
                  onChange={(e) => handleDisputePhotos(e.target.files)}
                />
              </div>

              {disputeUploading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("bookings.openDisputeModal.uploading")}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <Button variant="outline" onClick={() => setStep("detail")} disabled={disputeSubmitting}>{t("common.cancel")}</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white min-w-36"
                onClick={handleDisputeSubmit}
                disabled={disputeSubmitting || !disputeIsValid}
              >
                {disputeSuccess ? (
                  <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {t("bookings.openDisputeModal.opened")}</span>
                ) : disputeSubmitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("bookings.openDisputeModal.opening")}</span>
                ) : t("bookings.openDisputeModal.openButton")}
              </Button>
            </div>
          </div>{/* end panel 1 */}

          {/* Panel 2 — booking detail */}
          <div className={`flex flex-col overflow-hidden w-1/4 ${orderClasses[panelOrders.detail]}`}>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <AspectRatio ratio={16 / 9}>
            <BookingDetailHeroCarousel images={images} title={booking.title} />
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

                const taxRate         = booking.tax_rate ? Number(booking.tax_rate) : getTaxRate(booking.client_province ?? "QC");
                const taxLabel        = getTaxLabel(booking.client_province ?? "QC", i18n.language ?? "fr");
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
                          <div className="flex items-center gap-2 bg-white px-4 py-2.5 border-b border-gray-100">
                            <TrendingDown className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("bookings.clientPaid")}</span>
                          </div>
                          <CardContent className="p-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                              <span>{t("serviceDetail.servicePrice")}</span>
                              <span className="font-medium">{fmt(base)} $</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <div>
                                <div>{t("serviceDetail.buyerCommission")}</div>
                                <div className="text-[11px] text-red-500">{t("payment.nonRefundable")}</div>
                              </div>
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
                        <Card className={`overflow-hidden shadow-none ${disputeFinancialOutcome.hasFinancialAdjustment ? "border-amber-200" : "border-green-100"}`}>
                          <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${disputeFinancialOutcome.hasFinancialAdjustment ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"}`}>
                            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                            <span className={`text-xs font-semibold uppercase tracking-wide ${disputeFinancialOutcome.hasFinancialAdjustment ? "text-amber-800" : "text-green-700"}`}>
                              {disputeFinancialOutcome.hasFinancialAdjustment ? t("bookings.workerPayoutAfterDecision") : t("bookings.workerPayout")}
                            </span>
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
                              <span className="text-gray-900">{disputeFinancialOutcome.hasFinancialAdjustment ? t("bookings.finalPayoutLabel") : t("bookings.youWillReceive")}</span>
                              <span className="text-green-600">
                                {disputeFinancialOutcome.hasFinancialAdjustment && disputeFinancialOutcome.finalWorkerReceives !== null ? (
                                  <span className="inline-flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-400 line-through">{fmt(workerReceives)} $</span>
                                    <span>{fmt(disputeFinancialOutcome.finalWorkerReceives)} $</span>
                                  </span>
                                ) : (
                                  `${fmt(workerReceives)} $`
                                )}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }
                  // Client completed view
                  return (
                    <div className="space-y-3">
                      <Card className="overflow-hidden shadow-none">
                        <div className="flex items-center gap-2 bg-white px-4 py-2.5 border-b border-gray-100">
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
                            <div>
                              <div>{t("serviceDetail.buyerCommission")}</div>
                              <div className="text-[11px] text-red-500">{t("payment.nonRefundable")}</div>
                            </div>
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
                      {disputeFinancialOutcome.hasFinancialAdjustment && disputeFinancialOutcome.finalClientPaid !== null && disputeFinancialOutcome.refundedAmount !== null && (
                        <Card className="overflow-hidden border-amber-200 shadow-none">
                          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 border-b border-amber-100">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{t("bookings.finalOutcomeTitle")}</span>
                          </div>
                          <CardContent className="p-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                              <span>{t("bookings.originalTotalPaidLabel")}</span>
                              <span>{fmt(disputeFinancialOutcome.totalPaidOriginal)} $</span>
                            </div>
                            <div className="flex justify-between text-green-700">
                              <span>{t("bookings.refundAmountLabel")}</span>
                              <span>-{fmt(disputeFinancialOutcome.refundedAmount)} $</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-base">
                              <span className="text-gray-900">{t("bookings.finalTotalPaidLabel")}</span>
                              <span className="text-gray-900">{fmt(disputeFinancialOutcome.finalClientPaid)} $</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                }

                // Worker view (pending/accepted/active): payment summary + projected earnings
                if (userRole === "worker") {
                  return (
                    <div className="space-y-3">
                      {/* Full payment breakdown — what the client paid */}
                      <Card className="overflow-hidden shadow-none">
                        <div className="flex items-center gap-2 bg-white px-4 py-2.5 border-b border-gray-100">
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
                            <div>
                              <div>{t("serviceDetail.buyerCommission")}</div>
                              <div className="text-[11px] text-red-500">{t("payment.nonRefundable")}</div>
                            </div>
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
                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 border-b border-gray-100">
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
                        <div>
                          <div>{t("serviceDetail.buyerCommission")}</div>
                          <div className="text-[11px] text-red-500">{t("payment.nonRefundable")}</div>
                        </div>
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
              <div className="text-sm text-gray-600 leading-relaxed bg-white rounded-lg px-4 py-3 border border-gray-100">
                {serviceDescription.length > 240 ? serviceDescription.slice(0, 240) + "…" : serviceDescription}
              </div>
            )}

            <div className="border-t border-gray-100" />

            {/* Other user */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="text-sm bg-green-100 text-green-800">
                  {otherUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-gray-500">{userRole === "worker" ? t("bookings.requestFrom") : t("bookings.serviceBy")}</p>
                <Link
                  href={`/profile/${otherUserId}`}
                  className="text-sm font-semibold text-gray-900 hover:text-green-700 hover:underline"
                >
                  {otherUserName}
                </Link>
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
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 text-center">
                {t("bookings.waitingForPayment")}
              </div>
            )}
            {booking.status === "active" && booking.has_dispute && disputeStatus === "open" && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("bookings.disputeInProgress")}
                </div>
                <p>{t("bookings.disputePaused")}</p>
              </div>
            )}
            {booking.status === "active" && !booking.has_dispute && (
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

            {booking.status === "completed" && !booking.has_dispute && (() => {
              const DISPUTE_DAYS = 3;
              if (!booking.completed_at) return null;
              const completedMs = new Date(booking.completed_at).getTime();
              const deadlineMs = completedMs + DISPUTE_DAYS * 24 * 60 * 60 * 1000;
              const remainingMs = deadlineMs - Date.now();
              const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
              const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
              if (remainingMs <= 0) {
                if (booking.has_dispute) return null;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('bookings.disputeWindowTitle')}
                    </div>
                    <p>{t("bookings.disputeExpiredNotice")}</p>
                  </div>
                );
              }
              const remainingLabel = remainingDays > 1
                ? t('bookings.remainingDays', { count: remainingDays })
                : t('bookings.remainingHours', { count: remainingHours });
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('bookings.disputeWindowTitle')}
                  </div>
                  <p>{t("bookings.disputeWindowNotice", { time: remainingLabel })}</p>
                </div>
              );
            })()}

            {booking.has_dispute && (
              <div className={`rounded-lg px-3 py-2 text-xs space-y-1 border ${
                disputeStatus === "resolved"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : disputeStatus === "rejected"
                    ? "bg-white border-gray-200 text-gray-700"
                    : "bg-red-50 border-red-200 text-red-700"
              }`}>
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {disputeStatus === "resolved"
                    ? t("bookings.disputeResolvedNotice")
                    : disputeStatus === "rejected"
                      ? t("bookings.disputeRejectedNotice")
                      : t("bookings.disputeInProgress")}
                </div>
                {disputeIsClosed ? (
                  <p>
                    {booking.payment_status === "refunded"
                      ? t("bookings.disputeRefundedNotice")
                      : t("bookings.disputeClosedNotice")}
                  </p>
                ) : (
                  <p>{t("bookings.disputePaused")}</p>
                )}
                {booking.dispute_resolution && (
                  <p>
                    <span className="font-semibold">{t("bookings.disputeDecisionLabel")}</span> {booking.dispute_resolution}
                  </p>
                )}
                {disputeFinancialOutcome.hasFinancialAdjustment && disputeFinancialOutcome.refundedAmount !== null && (
                  <p>
                    <span className="font-semibold">{t("bookings.finalAmountAfterDisputeLabel")}</span>{" "}
                    {userRole === "worker" && disputeFinancialOutcome.finalWorkerReceives !== null
                      ? `${disputeFinancialOutcome.finalWorkerReceives.toFixed(2)} $`
                      : userRole === "client" && disputeFinancialOutcome.finalClientPaid !== null
                        ? `${disputeFinancialOutcome.finalClientPaid.toFixed(2)} $`
                        : `${disputeFinancialOutcome.refundedAmount.toFixed(2)} $`}
                  </p>
                )}
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
          onCallStatus={callStatus}
          onMarkCompleted={callMarkCompleted}
          onUndoMarkCompleted={callUndoMarkCompleted}
          onOpenDispute={openDisputeStep}
          onOpenReview={openReviewStep}
          onMessage={onMessage}
          onClose={onClose}
          onPayNow={() => {
            setLayoutMode("payment");
            setStep("payment");
          }}
        />
          </div>{/* end panel 2 */}

          {/* Panel 3 — review step */}
          <div className={`flex flex-col overflow-hidden w-1/4 ${orderClasses[panelOrders.review]}`}>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
              {reviewError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {reviewError}
                </p>
              )}

              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">
                  {t("bookings.reviewModal.ratingLabel")} <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={t("bookings.reviewModal.starAria", { count: i })}
                      onMouseEnter={() => setReviewHovered(i)}
                      onMouseLeave={() => setReviewHovered(0)}
                      onClick={() => {
                        setReviewRating(i);
                        setReviewError("");
                      }}
                      className="cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          i <= (reviewHovered || reviewRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {reviewRating > 0 && (
                  <p className="text-sm text-gray-500">
                    {["", t("bookings.reviewModal.poor"), t("bookings.reviewModal.fair"), t("bookings.reviewModal.good"), t("bookings.reviewModal.veryGood"), t("bookings.reviewModal.excellent")][reviewRating]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">{t("bookings.reviewModal.commentLabel")}</Label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t("bookings.reviewModal.commentPlaceholder")}
                  className="min-h-28 resize-none rounded-xl"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <Button variant="outline" onClick={() => setStep("detail")} disabled={reviewSubmitting}>{t("common.cancel")}</Button>
              <Button
                className="bg-green-700 hover:bg-green-800 text-white min-w-32"
                onClick={handleReviewSubmit}
                disabled={reviewSubmitting || reviewRating === 0}
              >
                {reviewSuccess ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> {t("bookings.reviewModal.submitted")}
                  </span>
                ) : reviewSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("bookings.reviewModal.submitting")}
                  </span>
                ) : t("bookings.reviewModal.submit")}
              </Button>
            </div>
          </div>{/* end panel 3 */}

          {/* Panel 4 — payment step */}
          <div className={`flex flex-col overflow-hidden w-1/4 ${orderClasses[panelOrders.payment]}`}>
            <PaymentInlinePanel
              bookingId={booking.id}
              bookingTitle={booking.title}
              price={Number(booking.custom_price ?? booking.price)}
              accessToken={accessToken}
              clientProvince={booking.client_province ?? null}
            />
          </div>{/* end panel 4 */}

        </div>{/* end sliding panels */}
      </div>
    </div>
  );
}
