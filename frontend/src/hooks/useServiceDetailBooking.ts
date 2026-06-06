"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";
import { isProfileDetailsIncomplete } from "@/lib/onboardingSteps";
import type { ProfileForCompletion } from "@/lib/onboardingSteps";

type BookingState = "idle" | "loading" | "success" | "error";

type Options = {
  serviceId: string;
  profile: ProfileForCompletion | null;
  profileLoading: boolean;
  onProfileIncomplete: () => void;
};

export function useServiceDetailBooking({
  serviceId,
  profile,
  profileLoading,
  onProfileIncomplete,
}: Options) {
  const { requireAuth, notifyAuthActionReady } = useAuthGate();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingErrorMsg, setBookingErrorMsg] = useState("");
  const [pendingBooking, setPendingBooking] = useState(false);

  const openBookingFlow = useCallback(() => {
    if (isProfileDetailsIncomplete(profile)) {
      onProfileIncomplete();
      notifyAuthActionReady();
      return;
    }
    setBookingState("idle");
    setBookingNote("");
    setShowBookingModal(true);
    notifyAuthActionReady();
  }, [profile, onProfileIncomplete, notifyAuthActionReady]);

  const queueBookingFlow = useCallback(() => {
    setPendingBooking(true);
  }, []);

  useEffect(() => {
    if (!pendingBooking || profileLoading) return;
    setPendingBooking(false);
    openBookingFlow();
  }, [pendingBooking, profileLoading, openBookingFlow]);

  useAuthResumeAction(
    "booking",
    (payload) => {
      if (payload.serviceId === serviceId) {
        queueBookingFlow();
      }
    },
    { waitForProfile: true },
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
  }, [requireAuth, serviceId, queueBookingFlow, openBookingFlow]);

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
