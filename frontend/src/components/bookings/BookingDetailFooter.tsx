"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Star } from "lucide-react";
import PayNowButton from "./PayNowButton";
import { type BookingDetail } from "./BookingDetailModal";

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
  currentUserId: string;
  onCallStatus: (status: BookingStatus) => void;
  onMarkCompleted: () => void;
  onUndoMarkCompleted: () => void;
  onUpdated: (data: Partial<BookingDetail>) => void;
  onOpenDispute: (id: string, title: string) => void;
  onOpenReview: (id: string, name: string) => void;
  onMessage: (userId: string) => void;
  onClose: () => void;
}

export default function BookingDetailFooter({
  booking, userRole, updating, hasMarkedDone, otherHasMarkedDone,
  needsPayment, accessToken, otherUserName, otherUserId, currentUserId,
  onCallStatus, onMarkCompleted, onUndoMarkCompleted, onUpdated, onOpenDispute, onOpenReview, onMessage, onClose,
}: Props) {
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const cancelRequestedByMe = booking.cancel_requested_by === currentUserId;
  const cancelRequestedByOther = !!booking.cancel_requested_by && !cancelRequestedByMe;

  const submitCancelRequest = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (!res.ok) return;
      onUpdated(await res.json());
      setCancelMode(false);
    } catch { /* silent */ }
  };

  const approveCancellation = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      onUpdated(await res.json());
    } catch { /* silent */ }
  };

  const declineCancellation = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/cancel-decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      onUpdated(await res.json());
    } catch { /* silent */ }
  };

  return (
    <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2 flex-shrink-0">
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
                {updating ? "…" : "Accept"}
              </Button>
              <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 h-11" onClick={() => onCallStatus("rejected")} disabled={updating}>
                Reject
              </Button>
            </div>
          );
        } else if (userRole === applicantRole) {
          // Applicant: can only cancel their request
          return (
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-11" onClick={() => onCallStatus("cancelled")} disabled={updating}>
              {updating ? "…" : "Cancel Request"}
            </Button>
          );
        }
        return null;
      })()}

      {/* Worker: accepted */}
      {userRole === "worker" && booking.status === "accepted" && (
        <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-11" onClick={() => onCallStatus("cancelled")} disabled={updating}>
          {updating ? "…" : "Cancel Booking"}
        </Button>
      )}

      {/* Client: accepted — pay now */}
      {userRole === "client" && needsPayment && (
        <PayNowButton bookingId={booking.id} accessToken={accessToken} fullWidth />
      )}

      {/* Active: mark done */}
      {booking.status === "active" && !hasMarkedDone && (
        <Button className="w-full bg-green-700 hover:bg-green-800 text-white h-11" onClick={onMarkCompleted} disabled={updating}>
          {updating ? "…" : userRole === "worker" ? "Mark Work Done" : "Mark Job Done"}
        </Button>
      )}
      {booking.status === "active" && hasMarkedDone && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-2 text-sm text-green-700 font-medium py-1">
            <CheckCircle className="h-4 w-4" />
            You marked done{!otherHasMarkedDone && ` — waiting for ${userRole === "worker" ? "client" : "provider"}`}
          </div>
          {!otherHasMarkedDone && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-gray-500 border-gray-200 hover:bg-gray-50 text-xs h-8"
              onClick={onUndoMarkCompleted}
              disabled={updating}
            >
              {updating ? "…" : "Annuler ma confirmation"}
            </Button>
          )}
        </div>
      )}

      {/* Active: mutual cancellation */}
      {booking.status === "active" && (
        <>
          {cancelRequestedByOther && (
            <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-red-800">The other party wants to cancel</p>
              {booking.cancel_reason && <p className="text-xs text-red-700 italic">"{booking.cancel_reason}"</p>}
              <p className="text-xs text-red-700">Transaction fees will not be refunded.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={approveCancellation} disabled={updating}>
                  {updating ? "…" : "Approve"}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={declineCancellation} disabled={updating}>Decline</Button>
              </div>
            </div>
          )}
          {cancelRequestedByMe && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 text-center">
              Cancellation requested — waiting for the other party to approve.
            </div>
          )}
          {!booking.cancel_requested_by && !cancelMode && (
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-10 text-sm" onClick={() => setCancelMode(true)}>
              Request Cancellation
            </Button>
          )}
          {cancelMode && (
            <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-red-700">Request cancellation</p>
              <p className="text-xs text-red-600">Transaction fees will not be refunded. Both parties must agree.</p>
              <textarea
                value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2}
                placeholder="Reason for cancellation…"
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-100"
                  onClick={submitCancelRequest} disabled={updating || !cancelReason.trim()}>
                  {updating ? "…" : "Send Request"}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setCancelMode(false)}>Back</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dispute */}
      {(booking.status === "active" || booking.status === "completed") && !booking.has_dispute && (() => {
        const DISPUTE_DAYS = 3;
        const disputeExpired = booking.status === "completed" && booking.completed_at
          ? (Date.now() - new Date(booking.completed_at).getTime()) > DISPUTE_DAYS * 24 * 60 * 60 * 1000
          : false;
        if (disputeExpired) return null;
        return (
          <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-10 gap-2"
            onClick={() => { onOpenDispute(booking.id, booking.title); onClose(); }}>
            <AlertTriangle className="h-4 w-4" /> Open Dispute
          </Button>
        );
      })()}

      {/* Review */}
      {booking.status === "completed" && !booking.has_reviewed && (
        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-10 gap-2"
          onClick={() => { onOpenReview(booking.id, otherUserName); onClose(); }}>
          <Star className="h-4 w-4" /> Leave a Review
        </Button>
      )}
      {booking.status === "completed" && booking.has_reviewed && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400 py-1">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> Review submitted
        </div>
      )}

      {/* Message */}
      <Button variant="outline" className="w-full h-10 gap-2" onClick={() => { onMessage(otherUserId); onClose(); }}>
        Message {otherUserName.split(" ")[0]}
      </Button>
    </div>
  );
}
