"use client";

import { useEffect, useState, Suspense, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useStartConversation } from "@/hooks/useStartConversation";
import { useUnreadBookings } from "@/hooks/useUnreadBookings";
import { CalendarDays, CheckCircle, XCircle, Clock, ChevronDown } from "lucide-react";
import LeaveReviewModal from "@/components/bookings/LeaveReviewModal";
import OpenDisputeModal from "@/components/bookings/OpenDisputeModal";
import BookingDetailModal, { type BookingDetail } from "@/components/bookings/BookingDetailModal";
import ReceivedBookingsList from "@/components/bookings/ReceivedBookingsList";
import SentBookingsList from "@/components/bookings/SentBookingsList";
import { ReceivedBooking, SentBooking, BookingStatus } from "@/components/bookings/bookingTypes";
import { Spinner } from "@/components/ui/Spinner";
import AppImage from "@/components/ui/AppImage";
import { getBookingDisputeFinancialOutcome } from "@/lib/disputeFinancials";
import { getIntlLocale } from "@/lib/locale";
import { toast } from "sonner";
import { isWorkBasedPricingMode } from "@/lib/hourlyPayment";
import { normalizePricingMode } from "@/lib/listingPrice";
import { cn } from "@/lib/utils";
import BookingSectionPagination from "@/components/bookings/BookingSectionPagination";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-xl shadow-sm bg-white animate-pulse overflow-hidden">
          <div className="w-full aspect-video bg-gray-200" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 bg-gray-200 rounded w-20" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 text-gray-500">
      <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
      <p className="font-medium text-gray-700">{message}</p>
      <Link href="/listings" className="text-sm text-green-700 hover:underline mt-2 inline-block">
        {t("bookings.browseListings")}
      </Link>
    </div>
  );
}

function BookingsContent() {
  const { t, i18n } = useTranslation();
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingDateLocale = getIntlLocale(i18n.language, { fr: 'fr-CA', en: 'en-CA' });

  const uid = user?.id ?? null;
  const RECEIVED_SEEN_KEY = uid ? `bookings_received_seen_${uid}` : null;
  const SENT_SEEN_KEY     = uid ? `bookings_sent_seen_${uid}`     : null;
  const DONE_SEEN_KEY     = uid ? `bookings_done_seen_${uid}`     : null;

  function lsGetIds(key: string | null): Set<string> {
    if (!key) return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
  }
  function lsSaveIds(key: string | null, ids: Set<string>) {
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify([...ids])); } catch {}
  }

  const [tab, setTab] = useState<"received" | "sent" | "done">("received");
  const [seenReceivedIds, setSeenReceivedIds] = useState<Set<string>>(new Set());
  const [seenSentIds,     setSeenSentIds]     = useState<Set<string>>(new Set());
  const [seenDoneCount,   setSeenDoneCount]   = useState(0);
  const [doneRenderedPage, setDoneRenderedPage] = useState(1);
  const [doneReceivedPage, setDoneReceivedPage] = useState(1);
  const [doneRenderedSlideDir, setDoneRenderedSlideDir] = useState<"prev" | "next">("next");
  const [doneReceivedSlideDir, setDoneReceivedSlideDir] = useState<"prev" | "next">("next");
  const [doneRenderedOpen, setDoneRenderedOpen] = useState(true);
  const [doneReceivedOpen, setDoneReceivedOpen] = useState(true);
  const DONE_PAGE_SIZE = 4;

  // Load persisted seen data from localStorage on mount (after user is known)
  useEffect(() => {
    if (!uid) return;
    setSeenReceivedIds(lsGetIds(RECEIVED_SEEN_KEY));
    setSeenSentIds(lsGetIds(SENT_SEEN_KEY));
    try {
      const saved = localStorage.getItem(DONE_SEEN_KEY!);
      if (saved) setSeenDoneCount(parseInt(saved, 10));
    } catch {}
  }, [uid]);
  const [received, setReceived] = useState<ReceivedBooking[]>([]);
  const [sent, setSent] = useState<SentBooking[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const [reviewBooking, setReviewBooking] = useState<{ id: string; targetName: string } | null>(null);
  const [disputeBooking, setDisputeBooking] = useState<{ id: string; title: string } | null>(null);
  const [detailBooking, setDetailBooking] = useState<{ booking: BookingDetail; role: "worker" | "client" } | null>(null);

  const paymentResult = searchParams.get("payment");
  const [paymentBanner, setPaymentBanner] = useState<"success" | "cancelled" | null>(
    paymentResult === "success" ? "success" : paymentResult === "cancelled" ? "cancelled" : null
  );

  const { startConversation, loading: chatLoading } = useStartConversation();
  const { markAllSeen } = useUnreadBookings();

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const fetchBookings = useCallback(async (attempt = 0) => {
    if (!sessionRef.current?.access_token) return;
    const headers = { Authorization: `Bearer ${sessionRef.current.access_token}` };
    setFetchError(false);

    const [receivedRes, sentRes] = await Promise.allSettled([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/received-bookings`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, { headers }).then((r) => r.json()),
    ]);

    const receivedOk = receivedRes.status === "fulfilled" && Array.isArray(receivedRes.value);
    const sentOk = sentRes.status === "fulfilled" && Array.isArray(sentRes.value);

    if (receivedOk) setReceived(receivedRes.value);
    if (sentOk) setSent(sentRes.value);

    setDetailBooking((prev) => {
      if (!prev) return null;
      const all = [
        ...(receivedOk ? receivedRes.value : []),
        ...(sentOk ? sentRes.value : []),
      ];
      const fresh = all.find((b: { id: string }) => b.id === prev.booking.id);
      if (!fresh) return prev;
      return { ...prev, booking: { ...prev.booking, ...fresh } };
    });

    if (!receivedOk || !sentOk) {
      if (attempt < 2) {
        // Auto-retry — backend may be waking up from cold start
        setTimeout(() => fetchBookings(attempt + 1), 8000);
      } else {
        setFetchError(true);
        setLoadingReceived(false);
        setLoadingSent(false);
      }
      return;
    }

    setLoadingReceived(false);
    setLoadingSent(false);

    if (sentOk) {
      const stale = sentRes.value.filter(
        (b: SentBooking) =>
          b.status === "accepted" && (!b.payment_status || b.payment_status === "unpaid"),
      );
      if (stale.length > 0) {
        await Promise.allSettled(
          stale.slice(0, 5).map((b: SentBooking) =>
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/verify`, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ booking_id: b.id }),
            }),
          ),
        );
        const refreshed = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, { headers }).then((r) => r.json());
        if (Array.isArray(refreshed)) setSent(refreshed);
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!session?.access_token) return;
    fetchBookings();
  }, [user, session, router, authLoading, fetchBookings]);

  // Refresh when returning to the tab — avoids stale cards after Stripe redirect
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && sessionRef.current?.access_token) {
        fetchBookings();
      }
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [fetchBookings]);

  // Realtime: re-fetch when a booking is created/updated for this user.
  // Two channels to cover both roles:
  //   ch1 — bookings where I am the worker (offer listings: I receive the request)
  //   ch2 — bookings where I am the client (looking listings: I receive the application)
  useEffect(() => {
    if (!user) return;
    const ch1 = supabase
      .channel('bookings-as-worker')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `worker_id=eq.${user.id}`,
      }, () => { fetchBookings(); })
      .subscribe();
    const ch2 = supabase
      .channel('bookings-as-client')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `client_id=eq.${user.id}`,
      }, () => { fetchBookings(); })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user, fetchBookings]);

  useEffect(() => {
    if (paymentResult === "success" || paymentResult === "cancelled") {
      setTab("sent");
      const timer = setTimeout(() => setPaymentBanner(null), 5000);
      if (paymentResult === "success") {
        // Refetch immediately + retries while Stripe webhook / verify may still be updating the DB
        fetchBookings();
        const refetchTimers = [3000, 8000, 15000].map((ms) => setTimeout(() => fetchBookings(), ms));
        return () => {
          clearTimeout(timer);
          refetchTimers.forEach(clearTimeout);
        };
      }
      return () => clearTimeout(timer);
    }
  }, [paymentResult, fetchBookings]);

  const openBookingId = searchParams.get("booking");
  const suppressOpenFromUrlRef = useRef(false);

  const closeDetailBooking = useCallback(() => {
    suppressOpenFromUrlRef.current = true;
    setDetailBooking(null);
    if (searchParams.get("booking")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("booking");
      const qs = params.toString();
      router.replace(qs ? `/bookings?${qs}` : "/bookings", { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (!openBookingId) {
      suppressOpenFromUrlRef.current = false;
      return;
    }
    if (loadingReceived || loadingSent) return;
    if (suppressOpenFromUrlRef.current) return;
    if (detailBooking?.booking.id === openBookingId) return;

    const asWorker = received.find((b) => b.id === openBookingId);
    const asClient = sent.find((b) => b.id === openBookingId);

    if (asWorker) {
      setDetailBooking({ booking: asWorker as BookingDetail, role: "worker" });
      setTab("received");
    } else if (asClient) {
      setDetailBooking({ booking: asClient as BookingDetail, role: "client" });
      setTab("sent");
    }
  }, [openBookingId, received, sent, loadingReceived, loadingSent, detailBooking?.booking.id]);

  const updateStatus = async (bookingId: string, status: BookingStatus, side: "received" | "sent") => {
    setUpdating(bookingId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      if (side === "received") {
        setReceived((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updated } : b)));
      } else {
        setSent((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updated } : b)));
      }
    } catch { /* silent */ } finally {
      setUpdating(null);
    }
  };

  const markCompleted = async (bookingId: string, side: "received" | "sent") => {
    setUpdating(bookingId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.code === "HOURLY_SESSIONS_PENDING") {
          toast.error(t("bookings.hourlySessionsRequired"));
        } else if (err.code === "HOURLY_NO_APPROVED_HOURS") {
          toast.error(t("bookings.hourlyNoApprovedHours"));
        } else if (err.code === "HOURLY_BALANCE_DUE") {
          const b =
            received.find((x) => x.id === bookingId) ??
            sent.find((x) => x.id === bookingId);
          toast.error(
            t(
              isWorkBasedPricingMode(b?.pricing_mode)
                ? "bookings.fixedBalanceDueBeforeComplete"
                : "bookings.hourlyBalanceDueBeforeComplete",
            ),
          );
        } else if (err.message) {
          toast.error(err.message);
        }
        return;
      }
      const updated = await res.json();
      if (side === "received") {
        setReceived((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...updated } : b));
      } else {
        setSent((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...updated } : b));
      }
    } catch { /* silent */ } finally {
      setUpdating(null);
    }
  };

  // Merge all completed bookings (deduplicated) then split by actual role
  const allCompleted = [...received, ...sent].filter((b) => b.status === "completed");
  const seenIds = new Set<string>();
  const uniqueCompleted = allCompleted.filter((b) => {
    if (seenIds.has(b.id)) return false;
    seenIds.add(b.id);
    return true;
  });
  const visibleReceived = received.filter((b) => b.status !== "completed");
  const visibleSent = sent.filter((b) => b.status !== "completed");
  const completedReceived = uniqueCompleted.filter((b) => b.worker_id === uid);
  const completedSent     = uniqueCompleted.filter((b) => b.client_id === uid);
  const doneCount = uniqueCompleted.length;
  const doneRenderedTotalPages = Math.max(1, Math.ceil(completedReceived.length / DONE_PAGE_SIZE));
  const doneReceivedTotalPages = Math.max(1, Math.ceil(completedSent.length / DONE_PAGE_SIZE));
  const pagedCompletedReceived = useMemo(() => {
    const start = (doneRenderedPage - 1) * DONE_PAGE_SIZE;
    return completedReceived.slice(start, start + DONE_PAGE_SIZE);
  }, [completedReceived, doneRenderedPage]);
  const pagedCompletedSent = useMemo(() => {
    const start = (doneReceivedPage - 1) * DONE_PAGE_SIZE;
    return completedSent.slice(start, start + DONE_PAGE_SIZE);
  }, [completedSent, doneReceivedPage]);

  // Badge logic — based on unseen IDs, not counts
  // Received: new pending requests (need worker action)
  const unseenReceivedIds = received
    .filter((b) => b.status === "pending" && !seenReceivedIds.has(b.id))
    .map((b) => b.id);
  // Sent: accepted or refused responses (status changed for client)
  const unseenSentIds = sent
    .filter((b) => ["accepted", "refused"].includes(b.status) && !seenSentIds.has(b.id))
    .map((b) => b.id);

  const badgeReceived = unseenReceivedIds.length;
  const badgeSent     = unseenSentIds.length;
  const badgeDone     = Math.max(0, doneCount - seenDoneCount);

  const markReceivedSeen = () => {
    const newIds = new Set([...seenReceivedIds, ...unseenReceivedIds]);
    setSeenReceivedIds(newIds);
    lsSaveIds(RECEIVED_SEEN_KEY, newIds);
  };
  const markSentSeen = () => {
    const newIds = new Set([...seenSentIds, ...unseenSentIds]);
    setSeenSentIds(newIds);
    lsSaveIds(SENT_SEEN_KEY, newIds);
  };
  const markDoneSeen = () => {
    setSeenDoneCount(doneCount);
    try { if (DONE_SEEN_KEY) localStorage.setItem(DONE_SEEN_KEY, String(doneCount)); } catch {}
  };

  const switchTab = (newTab: "received" | "sent" | "done") => {
    setTab(newTab);
    if (newTab !== "done") {
      setDoneRenderedPage(1);
      setDoneReceivedPage(1);
      setDoneRenderedSlideDir("next");
      setDoneReceivedSlideDir("next");
    }
    if (newTab === "received") markReceivedSeen();
    if (newTab === "sent")     markSentSeen();
    if (newTab === "done")     markDoneSeen();
  };

  useEffect(() => {
    if (doneRenderedPage > doneRenderedTotalPages) setDoneRenderedPage(doneRenderedTotalPages);
  }, [doneRenderedPage, doneRenderedTotalPages]);

  useEffect(() => {
    if (doneReceivedPage > doneReceivedTotalPages) setDoneReceivedPage(doneReceivedTotalPages);
  }, [doneReceivedPage, doneReceivedTotalPages]);

  const changeDoneRenderedPage = (next: number) => {
    setDoneRenderedPage((current) => {
      if (next === current) return current;
      setDoneRenderedSlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

  const changeDoneReceivedPage = (next: number) => {
    setDoneReceivedPage((current) => {
      if (next === current) return current;
      setDoneReceivedSlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

  // Auto-mark current tab as seen once data loads
  useEffect(() => {
    if (!loadingReceived && tab === "received") markReceivedSeen();
  }, [loadingReceived]);
  useEffect(() => {
    if (!loadingSent && tab === "sent") markSentSeen();
  }, [loadingSent]);

  // Clear the Header badge when both lists are loaded
  useEffect(() => {
    if (!loadingReceived && !loadingSent) markAllSeen();
  }, [loadingReceived, loadingSent]);

  if (authLoading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-center py-24">
          <Spinner size="md" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">{t("bookings.title")}</h1>

      {paymentBanner === "success" && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-green-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{t("bookings.paymentSuccess")}</p>
          <button type="button" aria-label="Dismiss" onClick={() => setPaymentBanner(null)} className="cursor-pointer ml-auto text-green-600 hover:text-green-800">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {paymentBanner === "cancelled" && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-700">
          <XCircle className="h-5 w-5 shrink-0 text-gray-400" />
          <p className="text-sm">{t("bookings.paymentCancelled")}</p>
          <button type="button" aria-label="Dismiss" onClick={() => setPaymentBanner(null)} className="cursor-pointer ml-auto text-gray-400 hover:text-gray-600">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => switchTab("received")}
          className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "received" ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("bookings.received")}
          {badgeReceived > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {badgeReceived}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => switchTab("sent")}
          className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "sent" ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("bookings.sent")}
          {badgeSent > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {badgeSent}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => switchTab("done")}
          className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "done" ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("bookings.done")}
          {badgeDone > 0 && (
            <span className="bg-green-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {badgeDone}
            </span>
          )}
        </button>
      </div>

      {fetchError && !loadingReceived && !loadingSent && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
          <span>{t("bookings.loadError")}</span>
          <button type="button" onClick={() => { setLoadingReceived(true); setLoadingSent(true); fetchBookings(0); }}
            className="cursor-pointer ml-4 font-medium underline hover:no-underline">
            {t("common.retry")}
          </button>
        </div>
      )}

      {tab === "received" && (
        <>
          {loadingReceived ? <LoadingSkeleton /> : visibleReceived.length === 0 ? (
            <EmptyState message={t("bookings.noReceived")} />
          ) : (
            <ReceivedBookingsList
              bookings={visibleReceived}
              updating={updating}
              chatLoading={chatLoading}
              accessToken={session?.access_token ?? ""}
              onUpdateStatus={updateStatus}
              onMarkCompleted={markCompleted}
              onMessage={(userId) => startConversation(userId)}
              onReview={(id, targetName) => setReviewBooking({ id, targetName })}
              onDispute={(id, title) => setDisputeBooking({ id, title })}
              onCardClick={(booking) => setDetailBooking({ booking, role: booking.worker_id === uid ? "worker" : "client" })}
            />
          )}
        </>
      )}

      {tab === "sent" && (
        loadingSent ? <LoadingSkeleton /> : visibleSent.length === 0 ? (
          <EmptyState message={t("bookings.noSent")} />
        ) : (
          <SentBookingsList
            bookings={visibleSent}
            updating={updating}
            chatLoading={chatLoading}
            accessToken={session?.access_token ?? ""}
            onUpdateStatus={updateStatus}
            onMarkCompleted={markCompleted}
            onMessage={(workerId) => startConversation(workerId)}
            onReview={(id, targetName) => setReviewBooking({ id, targetName })}
            onDispute={(id, title) => setDisputeBooking({ id, title })}
            onCardClick={(booking) => setDetailBooking({ booking, role: booking.worker_id === uid ? "worker" : "client" })}
          />
        )
      )}

      {tab === "done" && (
        loadingReceived || loadingSent ? <LoadingSkeleton /> :
        doneCount === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">{t("bookings.noDone")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("bookings.noDoneDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-start">
            <div className="flex-1 min-w-0 md:pr-6">
              <div className="mb-3 flex items-center justify-center gap-2">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center">
                  {t("bookings.servicesRendered")}
                  <span className="text-gray-300 font-normal normal-case tracking-normal text-xs ml-1">
                    ({completedReceived.length})
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setDoneRenderedOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  {doneRenderedOpen ? t("bookings.hideSection") : t("bookings.showSection")}
                  <ChevronDown className={`h-4 w-4 transition-transform ${doneRenderedOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  doneRenderedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="overflow-hidden">
                    <div
                      key={doneRenderedPage}
                      className={cn(
                        "space-y-3",
                        "animate-in fade-in-0 duration-300 ease-out",
                        doneRenderedSlideDir === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
                      )}
                    >
                    {pagedCompletedReceived.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">—</p>
                    ) : (
                      pagedCompletedReceived.map((b) => {
                        const outcome = getBookingDisputeFinancialOutcome(b);
                        const finalAmount = outcome.finalWorkerReceives ?? outcome.workerReceivesOriginal;

                        return (
                          <div
                            key={b.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-gray-300 transition-colors"
                            onClick={() => setDetailBooking({ booking: b as BookingDetail, role: "worker" })}
                          >
                            {b.image_url && (
                              <AppImage src={b.image_url} alt={b.title} width={56} height={56} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{b.title}</p>
                              <p className="text-sm text-gray-500">{t("bookings.clientLabel")} : {("client_name" in b ? (b as ReceivedBooking).client_name : (b as SentBooking).worker_name)}</p>
                              <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString(bookingDateLocale, { year: "numeric", month: "long", day: "numeric" })}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-green-700">+{finalAmount.toFixed(2)} $</p>
                              {outcome.hasFinancialAdjustment && outcome.finalWorkerReceives !== null && (
                                <>
                                  <p className="text-xs text-gray-400 line-through">+{outcome.workerReceivesOriginal.toFixed(2)} $</p>
                                  <p className="text-xs text-amber-700">{t("bookings.finalAfterDispute")}</p>
                                </>
                              )}
                              <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-0.5">{t("bookings.done")}</span>
                              {!b.has_reviewed && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setReviewBooking({ id: b.id, targetName: (b as ReceivedBooking).client_name }); }}
                                  className="block mt-1 text-xs text-green-700 hover:underline"
                                >
                                  {t("bookings.leaveReview")}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    </div>
                  </div>
                  <BookingSectionPagination
                    page={doneRenderedPage}
                    totalPages={doneRenderedTotalPages}
                    onPrevious={() => changeDoneRenderedPage(doneRenderedPage - 1)}
                    onNext={() => changeDoneRenderedPage(doneRenderedPage + 1)}
                  />
                </div>
              </div>
            </div>

            <div className="my-6 border-t border-gray-200 md:my-0 md:border-t-0 md:w-px md:self-stretch md:shrink-0 md:bg-gray-200" aria-hidden />

            <div className="flex-1 min-w-0 md:pl-6">
              <div className="mb-3 flex items-center justify-center gap-2">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center">
                  {t("bookings.servicesReceived")}
                  <span className="text-gray-300 font-normal normal-case tracking-normal text-xs ml-1">
                    ({completedSent.length})
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setDoneReceivedOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  {doneReceivedOpen ? t("bookings.hideSection") : t("bookings.showSection")}
                  <ChevronDown className={`h-4 w-4 transition-transform ${doneReceivedOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  doneReceivedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="overflow-hidden">
                    <div
                      key={doneReceivedPage}
                      className={cn(
                        "space-y-3",
                        "animate-in fade-in-0 duration-300 ease-out",
                        doneReceivedSlideDir === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
                      )}
                    >
                    {pagedCompletedSent.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">—</p>
                    ) : (
                      pagedCompletedSent.map((b) => {
                        const outcome = getBookingDisputeFinancialOutcome(b);
                        const finalAmount = outcome.finalClientPaid ?? outcome.totalPaidOriginal;

                        return (
                          <div
                            key={b.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-gray-300 transition-colors"
                            onClick={() => setDetailBooking({ booking: b as BookingDetail, role: "client" })}
                          >
                            {b.image_url && (
                              <AppImage src={b.image_url} alt={b.title} width={56} height={56} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{b.title}</p>
                              <p className="text-sm text-gray-500">{t("bookings.providerLabel")} : {("worker_name" in b ? (b as SentBooking).worker_name : (b as ReceivedBooking).client_name)}</p>
                              <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString(bookingDateLocale, { year: "numeric", month: "long", day: "numeric" })}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-red-600">-{finalAmount.toFixed(2)} $</p>
                              {outcome.hasFinancialAdjustment && outcome.finalClientPaid !== null && (
                                <>
                                  <p className="text-xs text-gray-400 line-through">-{outcome.totalPaidOriginal.toFixed(2)} $</p>
                                  <p className="text-xs text-amber-700">{t("bookings.finalAfterDispute")}</p>
                                </>
                              )}
                              <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-0.5">{t("bookings.done")}</span>
                              {!b.has_reviewed && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setReviewBooking({ id: b.id, targetName: ("worker_name" in b ? (b as SentBooking).worker_name : (b as ReceivedBooking).client_name) }); }}
                                  className="block mt-1 text-xs text-green-700 hover:underline"
                                >
                                  {t("bookings.leaveReview")}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    </div>
                  </div>
                  <BookingSectionPagination
                    page={doneReceivedPage}
                    totalPages={doneReceivedTotalPages}
                    onPrevious={() => changeDoneReceivedPage(doneReceivedPage - 1)}
                    onNext={() => changeDoneReceivedPage(doneReceivedPage + 1)}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {detailBooking && session?.access_token && (
        <BookingDetailModal
          booking={detailBooking.booking}
          userRole={detailBooking.role}
          accessToken={session.access_token}
          onClose={closeDetailBooking}
          onUpdated={(bookingId, updates) => {
            setReceived((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...updates } : b));
            setSent((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...updates } : b));
            setDetailBooking((prev) => prev ? { ...prev, booking: { ...prev.booking, ...updates } } : null);
          }}
          onMessage={(userId) => startConversation(userId)}
        />
      )}

      {reviewBooking && session?.access_token && (
        <LeaveReviewModal
          bookingId={reviewBooking.id}
          targetName={reviewBooking.targetName}
          accessToken={session.access_token}
          onClose={() => setReviewBooking(null)}
          onReviewed={(bookingId) => {
            setReceived((prev) => prev.map((b) => b.id === bookingId ? { ...b, has_reviewed: true } : b));
            setSent((prev) => prev.map((b) => b.id === bookingId ? { ...b, has_reviewed: true } : b));
          }}
        />
      )}

      {disputeBooking && session?.access_token && (
        <OpenDisputeModal
          bookingId={disputeBooking.id}
          serviceTitle={disputeBooking.title}
          accessToken={session.access_token}
          onClose={() => setDisputeBooking(null)}
          onOpened={(bookingId) => {
            const openedAt = new Date().toISOString();
            const disputeUpdate = {
              has_dispute: true,
              dispute_status: "open" as const,
              dispute_resolution: null,
              dispute_created_at: openedAt,
            };
            setReceived((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...disputeUpdate } : b));
            setSent((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...disputeUpdate } : b));
          }}
        />
      )}
    </main>
  );
}

export default function BookingsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        </main>
      }>
        <BookingsContent />
      </Suspense>
    </div>
  );
}
