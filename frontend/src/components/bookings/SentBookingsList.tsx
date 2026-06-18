"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AppImage from "@/components/ui/AppImage";
import { MapPin, Grid3x3, Star, CheckCircle } from "lucide-react";
import { SentBooking, BookingStatus, STATUS_CONFIG, BOOKING_GROUPS, formatDate } from "./bookingTypes";
import { type BookingDetail } from "./BookingDetailModal";
import PayNowButton from "./PayNowButton";
import { useTranslation } from "react-i18next";
import { getTaxRate } from "@/lib/taxes";
import { getDisputeWindowState } from "@/lib/disputes";
import { resolveBookingCheckoutBase } from "@/lib/listingPrice";
import { needsBookingPayment, resolveCheckoutPrice } from "@/lib/hourlyPayment";

function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.badge}`}>
      {t(c.labelKey)}
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();
  if (!status || status === "unpaid") return null;
  const cfg: Record<string, string> = {
    paid: "bg-green-100 text-green-700 border-green-200",
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
}

export default function SentBookingsList({
  bookings, updating, chatLoading, accessToken,
  onUpdateStatus, onMarkCompleted, onMessage, onReview, onDispute, onCardClick,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      {BOOKING_GROUPS
        .filter(({ statuses }) => bookings.some((b) => statuses.includes(b.status)))
        .map(({ labelKey, statuses }) => (
          <div key={labelKey}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              {t(labelKey)}
              <span className="text-gray-300 font-normal normal-case tracking-normal text-xs">
                ({bookings.filter((b) => statuses.includes(b.status)).length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.filter((b) => statuses.includes(b.status)).map((b) => {
                const isLooking = b.service_type === "looking";
                const statusBar = STATUS_CONFIG[b.status]?.bar ?? "bg-gray-400";
                const disputeWindow = getDisputeWindowState(b.completed_at);
                // For offer: other person is the worker (b.worker_id)
                // For looking: other person is the client/poster (b.client_id)
                const otherId = isLooking ? b.client_id : b.worker_id;
                const needsPayment = !isLooking && needsBookingPayment(b).needed;
                const checkoutKind = needsBookingPayment(b).kind;

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
                          <StatusBadge status={b.status} />
                          <PaymentBadge status={b.payment_status} />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mb-2">
                        {t("bookings.provider")}{" "}
                        <Link href={`/profile/${otherId}`} onClick={(e) => e.stopPropagation()}
                          className="font-medium text-gray-700 hover:text-green-700 hover:underline">
                          {b.worker_name}
                        </Link>
                      </p>

                      <p className="text-green-700 font-bold text-lg mb-1">
                        {(resolveBookingCheckoutBase(b) * (1 + 0.05 + (b.tax_rate ? Number(b.tax_rate) : getTaxRate(b.client_province ?? "QC")))).toFixed(2)} $
                      </p>

                      {b.service_location && (
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                          <span className="line-clamp-1">{b.service_location}</span>
                        </div>
                      )}

                      {b.category && <p className="text-xs text-gray-400 mb-3">{b.category}</p>}
                      <p className="text-xs text-gray-400 mb-3">{formatDate(b.created_at)}</p>

                      {needsPayment && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 text-xs text-green-700">
                          {t("bookings.bookingAcceptedPayment")}
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
                            <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-1"
                              onClick={() => onUpdateStatus(b.id, "cancelled", "sent")} disabled={updating === b.id}>
                              {updating === b.id ? "…" : t("bookings.cancelRequest")}
                            </Button>
                          )
                        )}

                        {needsPayment && (
                          <PayNowButton
                            bookingId={b.id}
                            accessToken={accessToken}
                            bookingTitle={b.title}
                            price={resolveCheckoutPrice(
                              b,
                              b.deposit_enabled
                                ? {
                                    deposit_enabled: true,
                                    deposit_type: b.deposit_type,
                                    deposit_value: b.deposit_value,
                                  }
                                : null,
                            )}
                            clientProvince={b.client_province ?? null}
                            taxRateStored={b.tax_rate ? Number(b.tax_rate) : null}
                            checkoutKind={checkoutKind}
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
                                <Button type="button" size="sm" className="bg-green-700 hover:bg-green-800 text-white flex-1"
                                  onClick={() => onMarkCompleted(b.id, "sent")} disabled={updating === b.id}>
                                  {updating === b.id ? "…" : t("bookings.markWorkDone")}
                                </Button>
                              ) : (
                                <span className="text-xs text-green-700 flex items-center gap-1 flex-1">
                                  <CheckCircle className="h-3.5 w-3.5" /> {t("bookings.youMarkedDone")}
                                  {!b.completed_by_client && ` — ${t("bookings.waitingForClient")}`}
                                </span>
                              )}
                              {!b.has_dispute && (
                                <Button type="button" size="sm" variant="outline" className="w-full justify-center w-full justify-center text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                                  onClick={() => onDispute(b.id, b.title)}>
                                  {t("bookings.dispute")}
                                </Button>
                              )}
                            </>
                          ) : (
                            // Offer: you are the client → confirm job done
                            <>
                              {!b.completed_by_client ? (
                                <Button type="button" size="sm" className="bg-green-700 hover:bg-green-800 text-white flex-1"
                                  onClick={() => onMarkCompleted(b.id, "sent")} disabled={updating === b.id}>
                                  {updating === b.id ? "…" : t("bookings.markJobDone")}
                                </Button>
                              ) : (
                                <span className="text-xs text-green-700 flex items-center gap-1 flex-1">
                                  <CheckCircle className="h-3.5 w-3.5" /> {t("bookings.youMarkedDone")}
                                  {!b.completed_by_worker && ` — ${t("bookings.waitingForProvider")}`}
                                </span>
                              )}
                              {!b.has_dispute && disputeWindow.isOpen && (
                                <Button type="button" size="sm" variant="outline" className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
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
                              <Button type="button" size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white flex-1 gap-1.5"
                                onClick={() => onReview(b.id, b.worker_name)}>
                                <Star className="h-3.5 w-3.5" /> {t("bookings.review")}
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400 italic flex items-center gap-1 flex-1">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {t("bookings.reviewed")}
                              </span>
                            )}
                            {!b.has_dispute && disputeWindow.isOpen && (
                              <Button type="button" size="sm" variant="outline" className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
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
                          className="w-full justify-center text-center"
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
        ))}
    </div>
  );
}
