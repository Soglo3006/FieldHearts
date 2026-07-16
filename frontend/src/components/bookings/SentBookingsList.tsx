"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AppImage from "@/components/ui/AppImage";
import { MapPin, Grid3x3, Star, CheckCircle, ChevronDown } from "lucide-react";
import { SentBooking, BookingStatus, STATUS_CONFIG, BOOKING_GROUPS, formatDate } from "./bookingTypes";
import { type BookingDetail } from "./BookingDetailModal";
import PayNowButton from "./PayNowButton";
import BookingSectionPagination from "./BookingSectionPagination";
import { bookingBtnAmber, bookingBtnGreen, bookingBtnNeutral, bookingBtnRed } from "./bookingButtonStyles";
import { negotiationHintPrimary, negotiationHintAction } from "./negotiationCardStyles";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getTaxRate } from "@/lib/taxes";
import { getDisputeWindowState } from "@/lib/disputes";
import { formatBookingCheckoutTotalDisplay, resolveBookingCheckoutBase } from "@/lib/listingPrice";
import { resolveCheckoutPrice, needsBookingPayment, hourlyAwaitingApprovedHours, fixedAwaitingWorkForBalance, resolveBalanceFullServiceBase } from "@/lib/hourlyPayment";
import ListingLocationLine from "@/components/listings/ListingLocationLine";

const SENT_PAGE_SIZE = 4;

function StatusBadge({
  status,
  label,
  className,
}: {
  status: BookingStatus;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className ?? c.badge}`}>
      {label ?? t(c.labelKey)}
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();
  if (!status || status === "unpaid") return null;
  const cfg: Record<string, string> = {
    paid: "bg-green-100 text-green-700 border-green-200",
    deposit_paid: "bg-green-100 text-green-700 border-green-200",
    transferred: "bg-blue-100 text-blue-700 border-blue-200",
    refunded: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const labels: Record<string, string> = {
    paid: t("bookings.paid"),
    deposit_paid: t("bookings.depositPaid"),
    transferred: t("bookings.paidOut"),
    refunded: t("bookings.refunded"),
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {labels[status] ?? status}
    </span>
  );
}

interface Props {
  bookings: SentBooking[];
  updating: string | null;
  chatLoading: boolean;
  accessToken: string;
  onUpdateStatus: (id: string, status: BookingStatus, side: "received" | "sent") => void;
  onMarkCompleted: (id: string, side: "received" | "sent") => void;
  onMessage: (userId: string) => void;
  onReview: (id: string, targetName: string) => void;
  onDispute: (id: string, title: string) => void;
  onCardClick: (booking: BookingDetail) => void;
  onPaymentLockChange?: (locked: boolean) => void;
}

export default function SentBookingsList({
  bookings, updating, chatLoading, accessToken,
  onUpdateStatus, onMarkCompleted, onMessage, onReview, onDispute, onCardClick, onPaymentLockChange,
}: Props) {
  const { t } = useTranslation();
  const getDisplayStatus = (booking: SentBooking): BookingStatus => {
    const depositConfig = booking.deposit_enabled
      ? {
          deposit_enabled: true,
          deposit_type: booking.deposit_type,
          deposit_value: booking.deposit_value,
        }
      : null;
    const paymentNeed = needsBookingPayment(booking, depositConfig);
    return booking.status === "completed" && paymentNeed.kind === "balance"
      ? "active"
      : booking.status;
  };
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BOOKING_GROUPS.map((g) => [g.labelKey, true])),
  );
  const [groupPage, setGroupPage] = useState<Record<string, number>>(() =>
    Object.fromEntries(BOOKING_GROUPS.map((g) => [g.labelKey, 1])),
  );
  const [groupSlideDir, setGroupSlideDir] = useState<Record<string, "prev" | "next">>(() =>
    Object.fromEntries(BOOKING_GROUPS.map((g) => [g.labelKey, "next"])),
  );

  const visibleGroups = BOOKING_GROUPS.filter(({ statuses }) =>
    bookings.some((b) => statuses.includes(getDisplayStatus(b))),
  );

  const changeGroupPage = (labelKey: string, next: number) => {
    setGroupPage((current) => {
      const prev = current[labelKey] ?? 1;
      if (next === prev) return current;
      setGroupSlideDir((dirs) => ({ ...dirs, [labelKey]: next > prev ? "next" : "prev" }));
      return { ...current, [labelKey]: next };
    });
  };

  return (
    <div className="space-y-8">
      {visibleGroups.map(({ labelKey, statuses }, index) => {
        const groupBookings = bookings.filter((b) => statuses.includes(getDisplayStatus(b)));
        const totalPages = Math.max(1, Math.ceil(groupBookings.length / SENT_PAGE_SIZE));
        const page = Math.min(groupPage[labelKey] ?? 1, totalPages);
        const start = (page - 1) * SENT_PAGE_SIZE;
        const pagedBookings = groupBookings.slice(start, start + SENT_PAGE_SIZE);
        const isOpen = groupOpen[labelKey] ?? true;
        const slideDir = groupSlideDir[labelKey] ?? "next";

        return (
          <div key={labelKey}>
            {index > 0 && <div className="border-t border-gray-200 mb-8" aria-hidden />}
            <div className="mb-3 flex items-center justify-center gap-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest text-center">
                {t(labelKey)}
                <span className="text-gray-300 font-normal normal-case tracking-normal text-xs ml-1">
                  ({groupBookings.length})
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setGroupOpen((prev) => ({ ...prev, [labelKey]: !isOpen }))}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {isOpen ? t("bookings.hideSection") : t("bookings.showSection")}
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
              </button>
            </div>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="overflow-hidden">
                  <div
                    key={page}
                    className={cn(
                      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                      "animate-in fade-in-0 duration-300 ease-out",
                      slideDir === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
                    )}
                  >
              {pagedBookings.map((b) => {
                const isLooking = b.service_type === "looking";
                const disputeWindow = getDisputeWindowState(b.completed_at);
                // For offer: other person is the worker (b.worker_id)
                // For looking: other person is the client/poster (b.client_id)
                const otherId = isLooking ? b.client_id : b.worker_id;
                const otherName = isLooking ? b.client_name : b.worker_name;
                const otherLabelKey = isLooking ? "bookings.clientLabel" : "bookings.provider";
                const cardTaxRate = b.tax_rate ? Number(b.tax_rate) : getTaxRate(b.client_province ?? "QC");
                const depositConfig = b.deposit_enabled
                  ? {
                      deposit_enabled: true,
                      deposit_type: b.deposit_type,
                      deposit_value: b.deposit_value,
                    }
                  : null;
                const paymentNeed = needsBookingPayment(b, depositConfig);
                const currentUserPaysBalance = !isLooking;
                const needsPayment = currentUserPaysBalance && paymentNeed.needed;
                const checkoutKind = paymentNeed.kind;
                const hasPendingFinalBalance = b.status === "completed" && checkoutKind === "balance";
                const displayStatus = getDisplayStatus(b);
                const showBalanceDueStatus = b.status === "completed" && currentUserPaysBalance && checkoutKind === "balance";
                const showWaitingBalanceStatus = b.status === "completed" && !currentUserPaysBalance && checkoutKind === "balance";
                const statusBar = STATUS_CONFIG[displayStatus]?.bar ?? "bg-gray-400";
                const awaitingHours = !isLooking && hourlyAwaitingApprovedHours(b);
                const awaitingWork = !isLooking && fixedAwaitingWorkForBalance(b, depositConfig);

                const cardPriceLabel = formatBookingCheckoutTotalDisplay(t, b, cardTaxRate);

                return (
                  <div key={b.id}
                    className="border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => onCardClick(b as BookingDetail)}
                  >
                    <div className="relative">
                      <AspectRatio ratio={16 / 9}>
                        {b.image_url ? (
                          <AppImage src={b.image_url} alt={b.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Grid3x3 className="h-10 w-10 text-gray-300" />
                          </div>
                        )}
                      </AspectRatio>
                      <div className={`absolute bottom-0 left-0 right-0 h-1 ${statusBar}`} />
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-1 hover:text-green-700 transition-colors flex-1">
                          {b.title}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge
                            status={displayStatus}
                            label={showBalanceDueStatus ? t("bookings.balanceDue") : showWaitingBalanceStatus ? t("bookings.waitingBalanceShort") : undefined}
                            className={showBalanceDueStatus ? "bg-amber-100 text-amber-800 border-amber-200" : showWaitingBalanceStatus ? "bg-gray-100 text-gray-600 border-gray-200" : undefined}
                          />
                          <PaymentBadge status={b.payment_status} />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mb-2">
                        {t(otherLabelKey)}{" "}
                        <Link href={`/profile/${otherId}`} onClick={(e) => e.stopPropagation()}
                          className="font-medium text-gray-700 hover:text-green-700 hover:underline">
                          {otherName}
                        </Link>
                      </p>

                      <p className="text-green-700 font-bold text-lg mb-1">
                        {cardPriceLabel}
                      </p>

                      <ListingLocationLine
                        service={b}
                        className="mb-1 flex items-center justify-between text-xs text-gray-500"
                      />

                      {b.category && <p className="text-xs text-gray-400 mb-3">{b.category}</p>}
                      <p className="text-xs text-gray-400 mb-3">{formatDate(b.created_at)}</p>

                      {needsPayment && checkoutKind === "deposit" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 text-xs text-green-700 text-center">
                          {t("bookings.bookingAcceptedPayment")}
                        </div>
                      )}

                      {needsPayment && checkoutKind === "balance" && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
                          {t("bookings.hourlyBalancePaymentDue")}
                        </div>
                      )}

                      {showWaitingBalanceStatus && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 text-xs text-green-700">
                          {t("bookings.waitingForBalance")}
                        </div>
                      )}

                      {awaitingWork && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
                          {t("bookings.fixedPayBalanceAfterWork")}
                        </div>
                      )}

                      {awaitingHours && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
                          {t("bookings.hourlyApproveHoursForBalance")}
                        </div>
                      )}

                      {b.status === "negotiating" && (
                        <div className={negotiationHintPrimary}>
                          {t("priceNegotiation.cardHint")}
                        </div>
                      )}

                      <div className="mt-auto pt-3 border-t border-gray-100 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>

                        {b.status === "pending" && (
                          isLooking ? (
                            // Looking: you applied → waiting for poster to respond
                            <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex-1 text-center">
                              {t("bookings.applicationSentPending")}
                            </span>
                          ) : (
                            // Offer: you sent a request → can cancel
                            <Button type="button" size="sm" variant="outline" className={cn("flex-1", bookingBtnRed)}
                              onClick={() => onUpdateStatus(b.id, "cancelled", "sent")} disabled={updating === b.id}>
                              {updating === b.id ? "…" : t("bookings.cancelRequest")}
                            </Button>
                          )
                        )}

                        {b.status === "negotiating" && (
                          <>
                            <span className={negotiationHintAction}>
                              {t("priceNegotiation.openDetailHint")}
                            </span>
                            <Button type="button" size="sm" variant="outline"
                              className={cn("w-full", bookingBtnRed)}
                              onClick={() => onUpdateStatus(b.id, "cancelled", "sent")} disabled={updating === b.id}>
                              {updating === b.id ? "…" : isLooking ? t("bookings.cancelRequest") : t("bookings.cancelBooking")}
                            </Button>
                          </>
                        )}

                        {needsPayment && (
                          <PayNowButton
                            bookingId={b.id}
                            accessToken={accessToken}
                            bookingTitle={b.title}
                            price={resolveCheckoutPrice(b, depositConfig)}
                            clientProvince={b.client_province ?? null}
                            taxRateStored={b.tax_rate ? Number(b.tax_rate) : null}
                            checkoutKind={checkoutKind}
                            depositConfig={depositConfig}
                            depositAmountCents={b.deposit_amount_cents}
                            fullServiceBase={
                              checkoutKind === "balance"
                                ? resolveBalanceFullServiceBase(b) ?? resolveBookingCheckoutBase(b)
                                : null
                            }
                            pricingMode={b.pricing_mode}
                            onPaymentLockChange={onPaymentLockChange}
                          />
                        )}

                        {b.status === "accepted" && isLooking && (
                          // Looking: poster accepted you → waiting for them to pay
                          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex-1 text-center">
                            {t("bookings.waitingForPayment")}
                          </div>
                        )}

                        {b.status === "active" && (
                          b.has_dispute ? (
                            <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                              {t("bookings.disputePaused")}
                            </div>
                          ) : isLooking ? (
                            // Looking: you are the worker → mark work done
                            <>
                              {!b.completed_by_worker ? (
                                <Button type="button" size="sm" className={cn("flex-1", bookingBtnGreen)}
                                  onClick={() => onMarkCompleted(b.id, "sent")} disabled={updating === b.id}>
                                  {updating === b.id ? "…" : t("bookings.markWorkDone")}
                                </Button>
                              ) : (
                                <span className="text-xs text-green-700 flex items-center gap-1 flex-1">
                                  <CheckCircle className="h-3.5 w-3.5" /> {t("bookings.youMarkedDone")}
                                  {!b.completed_by_client && `. ${t("bookings.waitingForClient")}`}
                                </span>
                              )}
                              {!b.has_dispute && (
                                <Button type="button" size="sm" variant="outline" className={cn("w-full justify-center gap-1.5", bookingBtnRed)}
                                  onClick={() => onDispute(b.id, b.title)}>
                                  {t("bookings.dispute")}
                                </Button>
                              )}
                            </>
                          ) : (
                            // Offer: you are the client → confirm job done
                            <>
                              {!b.completed_by_client ? (
                                <Button type="button" size="sm" className={cn("flex-1", bookingBtnGreen)}
                                  onClick={() => onMarkCompleted(b.id, "sent")} disabled={updating === b.id}>
                                  {updating === b.id ? "…" : t("bookings.markJobDone")}
                                </Button>
                              ) : (
                                <span className="text-xs text-green-700 flex items-center gap-1 flex-1">
                                  <CheckCircle className="h-3.5 w-3.5" /> {t("bookings.youMarkedDone")}
                                  {!b.completed_by_worker && `. ${t("bookings.waitingForProvider")}`}
                                </span>
                              )}
                              {!b.has_dispute && disputeWindow.isOpen && (
                                <Button type="button" size="sm" variant="outline" className={cn("w-full justify-center gap-1.5", bookingBtnRed)}
                                  onClick={() => onDispute(b.id, b.title)}>
                                  {t("bookings.dispute")}
                                </Button>
                              )}
                              {!b.has_dispute && disputeWindow.isExpired && (
                                <Button type="button" size="sm" variant="outline" className="w-full justify-center text-gray-400 border-gray-200 bg-gray-50 gap-1.5" disabled>
                                  {t("bookings.disputeExpiredButton")}
                                </Button>
                              )}
                            </>
                          )
                        )}

                        {b.status === "completed" && (
                          <>
                            {!b.has_reviewed ? (
                              <Button type="button" size="sm" variant="outline" className={cn("flex-1 gap-1.5", bookingBtnAmber)}
                                onClick={() => onReview(b.id, b.worker_name)}>
                                <Star className="h-3.5 w-3.5" /> {t("bookings.review")}
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400 italic flex items-center gap-1 flex-1">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {t("bookings.reviewed")}
                              </span>
                            )}
                            {!hasPendingFinalBalance && !b.has_dispute && disputeWindow.isOpen && (
                              <Button type="button" size="sm" variant="outline" className={cn("w-full justify-center gap-1.5", bookingBtnRed)}
                                onClick={() => onDispute(b.id, b.title)}>
                                {t("bookings.dispute")}
                              </Button>
                            )}
                            {!hasPendingFinalBalance && !b.has_dispute && disputeWindow.isExpired && (
                              <Button type="button" size="sm" variant="outline" className="w-full justify-center text-gray-400 border-gray-200 bg-gray-50 gap-1.5" disabled>
                                {t("bookings.disputeExpiredButton")}
                              </Button>
                            )}
                          </>
                        )}

                        {b.has_dispute && (
                          <div className={`w-full rounded-lg border px-3 py-2 text-xs ${
                            b.dispute_status === "resolved"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : b.dispute_status === "rejected"
                                ? "border-gray-200 bg-gray-50 text-gray-700"
                                : "border-red-200 bg-red-50 text-red-700"
                          }`}>
                            <div className="font-medium">
                              {b.dispute_status === "resolved"
                                ? t("bookings.disputeResolvedNotice")
                                : b.dispute_status === "rejected"
                                  ? t("bookings.disputeRejectedNotice")
                                  : t("bookings.disputeOpen")}
                            </div>
                            {b.dispute_resolution && (
                              <p className="mt-1 line-clamp-2">
                                <span className="font-semibold">{t("bookings.disputeDecisionLabel")}</span> {b.dispute_resolution}
                              </p>
                            )}
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn("w-full justify-center text-center", bookingBtnNeutral)}
                          onClick={() => onMessage(otherId)}
                          disabled={chatLoading}
                        >
                          {t("bookings.message")}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
                  </div>
                </div>
                <BookingSectionPagination
                  page={page}
                  totalPages={totalPages}
                  onPrevious={() => changeGroupPage(labelKey, page - 1)}
                  onNext={() => changeGroupPage(labelKey, page + 1)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
