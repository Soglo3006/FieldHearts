"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import PayNowButton from "./PayNowButton";
import { type BookingDetail } from "./BookingDetailModal";
import { getDisputeWindowState } from "@/lib/disputes";
import { resolveBookingCheckoutBase } from "@/lib/listingPrice";

type BookingStatus = "pending" | "accepted" | "active" | "completed" | "cancelled" | "rejected";

interface Props {
  booking: BookingDetail;
  userRole: "worker" | "client";
  updating: boolean;
  hasMarkedDone: boolean;
  otherHasMarkedDone: boolean;
  needsPayment: boolean;
  accessToken: string;
  otherUserName: string;
  otherUserId: string;
  onCallStatus: (status: BookingStatus) => void;
  onMarkCompleted: () => void;
  onUndoMarkCompleted: () => void;
  onOpenDispute: (id: string, title: string) => void;
  onOpenReview: (id: string, name: string) => void;
  onMessage: (userId: string) => void;
  onClose: () => void;
  onPayNow?: () => void;
  onCancelWithDeposit?: () => void;
}

export default function BookingDetailFooter({
  booking, userRole, updating, hasMarkedDone, otherHasMarkedDone,
  needsPayment, accessToken, otherUserName, otherUserId,
  onCallStatus, onMarkCompleted, onUndoMarkCompleted, onOpenDispute, onOpenReview, onMessage, onClose, onPayNow, onCancelWithDeposit,
}: Props) {
  const { t } = useTranslation();
  const [confirmDisputeOpen, setConfirmDisputeOpen] = useState(false);
  const disputeWindow = getDisputeWindowState(booking.completed_at);

  const openDisputeFromCancellation = () => {
    setConfirmDisputeOpen(false);
    onOpenDispute(booking.id, booking.title);
  };

  return (
    <>
      <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2 shrink-0">
      {/* Pending actions — depends on service_type */}
      {booking.status === "pending" && (() => {
        const isLooking = booking.service_type === "looking";
        // Who decides: for "offer" → worker (poster); for "looking" → client (poster)
        const deciderRole = isLooking ? "client" : "worker";
        const applicantRole = isLooking ? "worker" : "client";

        if (userRole === deciderRole) {
          // Poster: Accept or Reject
          return (
            <div className="flex gap-2">
              <Button className="flex-1 bg-green-700 hover:bg-green-800 text-white h-11" onClick={() => onCallStatus("accepted")} disabled={updating}>
                {updating ? "…" : t("bookings.accept")}
              </Button>
              <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 h-11" onClick={() => onCallStatus("rejected")} disabled={updating}>
                {t("bookings.reject")}
              </Button>
            </div>
          );
        } else if (userRole === applicantRole) {
          // Applicant: can only cancel their request
          return (
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-11" onClick={() => onCallStatus("cancelled")} disabled={updating}>
              {updating ? "…" : t("bookings.cancelRequest")}
            </Button>
          );
        }
        return null;
      })()}

      {/* Worker: accepted */}
      {userRole === "worker" && booking.status === "accepted" && (
        <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-11" onClick={() => onCallStatus("cancelled")} disabled={updating}>
          {updating ? "…" : t("bookings.cancelBooking")}
        </Button>
      )}

      {/* Client: accepted — pay now */}
      {userRole === "client" && needsPayment && (
        <PayNowButton
          bookingId={booking.id}
          accessToken={accessToken}
          fullWidth
          bookingTitle={booking.title}
          price={resolveBookingCheckoutBase(booking)}
          clientProvince={booking.client_province ?? null}
          taxRateStored={booking.tax_rate ? Number(booking.tax_rate) : null}
          onPayNow={onPayNow}
        />
      )}

      {/* Active: mark done */}
      {booking.status === "active" && !booking.has_dispute && !hasMarkedDone && (
        <Button className="w-full bg-green-700 hover:bg-green-800 text-white h-11" onClick={onMarkCompleted} disabled={updating}>
          {updating ? "…" : userRole === "worker" ? t("bookings.markWorkDone") : t("bookings.markJobDone")}
        </Button>
      )}
      {booking.status === "active" && !booking.has_dispute && hasMarkedDone && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-2 text-sm text-green-700 font-medium py-1">
            <CheckCircle className="h-4 w-4" />
            {t("bookings.youMarkedDone")}
            {!otherHasMarkedDone && ` — ${userRole === "worker" ? t("bookings.waitingForClient") : t("bookings.waitingForProvider")}`}
          </div>
          {!otherHasMarkedDone && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-gray-500 border-gray-200 hover:bg-gray-50 text-xs h-8"
              onClick={onUndoMarkCompleted}
              disabled={updating}
            >
              {updating ? "…" : t("bookings.undoConfirmation")}
            </Button>
          )}
        </div>
      )}

      {booking.status === "active" && booking.has_dispute && (
        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-red-800">{t("bookings.disputeOpen")}</p>
          <p className="text-xs text-red-700">{t("bookings.disputePaused")}</p>
        </div>
      )}

      {booking.status === "active" && !booking.has_dispute && userRole === "client" &&
        booking.payment_status === "paid" &&
        booking.deposit_enabled &&
        onCancelWithDeposit && (
        <Button
          variant="outline"
          className="w-full text-amber-800 border-amber-200 hover:bg-amber-50 h-10"
          onClick={onCancelWithDeposit}
          disabled={updating}
        >
          {t("deposit.cancelWithDeposit")}
        </Button>
      )}

      {booking.status === "active" && !booking.has_dispute && userRole === "client" &&
        booking.payment_status === "paid" &&
        booking.deposit_enabled &&
        onCancelWithDeposit && (
        <Button
          variant="outline"
          className="w-full text-amber-800 border-amber-200 hover:bg-amber-50 h-10"
          onClick={onCancelWithDeposit}
          disabled={updating}
        >
          {t("deposit.cancelWithDeposit")}
        </Button>
      )}

      {booking.status === "active" && !booking.has_dispute && (
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 h-10 gap-2"
          onClick={() => setConfirmDisputeOpen(true)}
        >
          <AlertTriangle className="h-4 w-4" /> {t("bookings.cancelBooking")}
        </Button>
      )}

      {/* Dispute */}
      {booking.status === "completed" && !booking.has_dispute && disputeWindow.isOpen && (
        <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-10 gap-2"
          onClick={() => onOpenDispute(booking.id, booking.title)}>
          <AlertTriangle className="h-4 w-4" /> {t("bookings.openDispute")}
        </Button>
      )}
      {booking.status === "completed" && !booking.has_dispute && disputeWindow.isExpired && (
        <Button variant="outline" className="w-full text-gray-400 border-gray-200 bg-gray-50 h-10 gap-2" disabled>
          <AlertTriangle className="h-4 w-4" /> {t("bookings.disputeExpiredButton")}
        </Button>
      )}

      {/* Review */}
      {booking.status === "completed" && !booking.has_reviewed && (
        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-10 gap-2"
          onClick={() => onOpenReview(booking.id, otherUserName)}>
          <Star className="h-4 w-4" /> {t("bookings.leaveReview")}
        </Button>
      )}
      {booking.status === "completed" && booking.has_reviewed && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400 py-1">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {t("bookings.reviewed")}
        </div>
      )}

      {/* Message */}
      <Button variant="outline" className="w-full h-10 gap-2" onClick={() => { onMessage(otherUserId); onClose(); }}>
        {t("bookings.message")} {otherUserName.split(" ")[0]}
      </Button>
      </div>

      <Dialog open={confirmDisputeOpen} onOpenChange={setConfirmDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookings.cancelActiveBooking")}</DialogTitle>
            <DialogDescription>{t("bookings.cancelActiveBookingPrompt")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisputeOpen(false)}>
              {t("bookings.keepBooking")}
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={openDisputeFromCancellation}>
              {t("bookings.openDisputeInstead")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
