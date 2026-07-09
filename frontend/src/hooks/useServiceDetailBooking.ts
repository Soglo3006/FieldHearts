"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";

type BookingState = "idle" | "loading" | "success" | "error";

type Options = {
  serviceId: string;
  canOpenBooking?: () => boolean;
  onBookingBlocked?: () => void;
};

export function useServiceDetailBooking({ serviceId, canOpenBooking, onBookingBlocked }: Options) {
  const { requireAuth, notifyAuthActionReady } = useAuthGate();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingErrorMsg, setBookingErrorMsg] = useState("");
  const [pendingBooking, setPendingBooking] = useState(false);

  const openBookingFlow = useCallback(() => {
    if (canOpenBooking && !canOpenBooking()) {
      onBookingBlocked?.();
      return;
    }
    setBookingState("idle");
    setBookingNote("");
    setShowBookingModal(true);
    notifyAuthActionReady();
  }, [canOpenBooking, onBookingBlocked, notifyAuthActionReady]);

  const queueBookingFlow = useCallback(() => {
    setPendingBooking(true);
  }, []);

  useEffect(() => {
    if (!pendingBooking) return;
    setPendingBooking(false);
    openBookingFlow();
  }, [pendingBooking, openBookingFlow]);

  useAuthResumeAction(
    "booking",
    (payload) => {
      if (payload.serviceId === serviceId) {
        queueBookingFlow();
      }
    },
  );

  const handleBookingRequest = useCallback(() => {
    if (
      !requireAuth({
        context: "booking",
        redirect: `/serviceDetail/${serviceId}`,
        from: "booking",
        onSuccess: queueBookingFlow,
        resume: { type: "booking", payload: { serviceId } },
      })
    ) {
      return;
    }
    openBookingFlow();
  }, [requireAuth, serviceId, queueBookingFlow, openBookingFlow, canOpenBooking, onBookingBlocked]);

  return {
    showBookingModal,
    setShowBookingModal,
    bookingState,
    setBookingState,
    bookingNote,
    setBookingNote,
    bookingErrorMsg,
    setBookingErrorMsg,
    handleBookingRequest,
  };
}
