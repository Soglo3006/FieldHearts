"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useStartConversation } from "@/hooks/useStartConversation";
import { CalendarDays, CheckCircle, XCircle, Clock } from "lucide-react";
import LeaveReviewModal from "@/components/bookings/LeaveReviewModal";
import OpenDisputeModal from "@/components/bookings/OpenDisputeModal";
import BookingDetailModal, { type BookingDetail } from "@/components/bookings/BookingDetailModal";
import ReceivedBookingsList from "@/components/bookings/ReceivedBookingsList";
import SentBookingsList from "@/components/bookings/SentBookingsList";
import { ReceivedBooking, SentBooking, BookingStatus } from "@/components/bookings/bookingTypes";
import { Spinner } from "@/components/ui/Spinner";

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
  const { t } = useTranslation();
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<"received" | "sent" | "done">("received");
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({ received: 0, sent: 0, done: 0 });
  const [received, setReceived] = useState<ReceivedBooking[]>([]);
  const [sent, setSent] = useState<SentBooking[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [reviewBooking, setReviewBooking] = useState<{ id: string; targetName: string } | null>(null);
  const [disputeBooking, setDisputeBooking] = useState<{ id: string; title: string } | null>(null);
  const [detailBooking, setDetailBooking] = useState<{ booking: BookingDetail; role: "worker" | "client" } | null>(null);

  const paymentResult = searchParams.get("payment");
  const [paymentBanner, setPaymentBanner] = useState<"success" | "cancelled" | null>(
    paymentResult === "success" ? "success" : paymentResult === "cancelled" ? "cancelled" : null
  );

  const { startConversation, loading: chatLoading } = useStartConversation();

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const fetchBookings = useCallback(async () => {
    if (!sessionRef.current?.access_token) return;
    const headers = { Authorization: `Bearer ${sessionRef.current.access_token}` };

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/received-bookings`, { headers })
      .then((r) => r.json())
      .then((data) => setReceived(Array.isArray(data) ? data : []))
      .catch(() => setReceived([]))
      .finally(() => setLoadingReceived(false));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, { headers })
      .then((r) => r.json())
      .then((data) => setSent(Array.isArray(data) ? data : []))
      .catch(() => setSent([]))
      .finally(() => setLoadingSent(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!session?.access_token) return;
    fetchBookings();
  }, [user, session, router, authLoading, fetchBookings]);

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
        // Refetch immediately + after a delay in case the Stripe webhook takes a moment to update the DB
        fetchBookings();
        const refetchTimer = setTimeout(() => fetchBookings(), 3000);
        return () => { clearTimeout(timer); clearTimeout(refetchTimer); };
      }
      return () => clearTimeout(timer);
    }
  }, [paymentResult, fetchBookings]);

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
      if (!res.ok) return;
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

  const activeStatuses = ["pending", "accepted", "active"];
  const activeReceived = received.filter((b) => activeStatuses.includes(b.status)).length;
  const activeSent = sent.filter((b) => activeStatuses.includes(b.status)).length;

  const completedReceived = received.filter((b) => b.status === "completed");
  const completedSent = sent.filter((b) => b.status === "completed");
  const doneCount = completedReceived.length + completedSent.length;

  const badgeReceived = Math.max(0, activeReceived - seenCounts.received);
  const badgeSent = Math.max(0, activeSent - seenCounts.sent);
  const badgeDone = Math.max(0, doneCount - seenCounts.done);

  const switchTab = (newTab: "received" | "sent" | "done") => {
    setTab(newTab);
    const current = newTab === "received" ? activeReceived : newTab === "sent" ? activeSent : doneCount;
    setSeenCounts((prev) => ({ ...prev, [newTab]: current }));
  };

  // Auto-mark initial tab as seen once data loads
  useEffect(() => {
    if (!loadingReceived) setSeenCounts((prev) => ({ ...prev, received: activeReceived }));
  }, [loadingReceived]);
  useEffect(() => {
    if (!loadingSent) setSeenCounts((prev) => ({ ...prev, sent: activeSent }));
  }, [loadingSent]);

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
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{t("bookings.paymentSuccess")}</p>
          <button type="button" aria-label="Dismiss" onClick={() => setPaymentBanner(null)} className="cursor-pointer ml-auto text-green-600 hover:text-green-800">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {paymentBanner === "cancelled" && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-700">
          <XCircle className="h-5 w-5 flex-shrink-0 text-gray-400" />
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
          Terminé
          {badgeDone > 0 && (
            <span className="bg-green-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {badgeDone}
            </span>
          )}
        </button>
      </div>

      {tab === "received" && (
        <>
          {loadingReceived ? <LoadingSkeleton /> : received.length === 0 ? (
            <EmptyState message={t("bookings.noReceived")} />
          ) : (
            <ReceivedBookingsList
              bookings={received}
              updating={updating}
              chatLoading={chatLoading}
              accessToken={session?.access_token ?? ""}
              onUpdateStatus={updateStatus}
              onMarkCompleted={markCompleted}
              onMessage={(userId) => startConversation(userId)}
              onReview={(id, targetName) => setReviewBooking({ id, targetName })}
              onDispute={(id, title) => setDisputeBooking({ id, title })}
              onCardClick={(booking) => setDetailBooking({ booking, role: "worker" })}
            />
          )}
        </>
      )}

      {tab === "sent" && (
        loadingSent ? <LoadingSkeleton /> : sent.length === 0 ? (
          <EmptyState message={t("bookings.noSent")} />
        ) : (
          <SentBookingsList
            bookings={sent}
            updating={updating}
            chatLoading={chatLoading}
            accessToken={session?.access_token ?? ""}
            onUpdateStatus={updateStatus}
            onMarkCompleted={markCompleted}
            onMessage={(workerId) => startConversation(workerId)}
            onReview={(id, targetName) => setReviewBooking({ id, targetName })}
            onDispute={(id, title) => setDisputeBooking({ id, title })}
            onCardClick={(booking) => setDetailBooking({ booking, role: "client" })}
          />
        )
      )}

      {tab === "done" && (
        loadingReceived || loadingSent ? <LoadingSkeleton /> :
        doneCount === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">Aucune réservation terminée</p>
            <p className="text-sm text-gray-400 mt-1">Vos réservations complétées apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {completedReceived.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Services rendus</h2>
                <div className="space-y-3">
                  {completedReceived.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-gray-300 transition-colors"
                      onClick={() => setDetailBooking({ booking: b as BookingDetail, role: "worker" })}
                    >
                      {b.image_url && (
                        <img src={b.image_url} alt={b.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{b.title}</p>
                        <p className="text-sm text-gray-500">{b.service_type === "looking" ? "Prestataire" : "Client"} : {b.client_name}</p>
                        <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-green-700">+{(Number(b.price) * 0.80).toFixed(2)} $</p>
                        <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-0.5">Terminé</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {completedSent.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Services reçus</h2>
                <div className="space-y-3">
                  {completedSent.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-gray-300 transition-colors"
                      onClick={() => setDetailBooking({ booking: b as BookingDetail, role: "client" })}
                    >
                      {b.image_url && (
                        <img src={b.image_url} alt={b.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{b.title}</p>
                        <p className="text-sm text-gray-500">Prestataire : {b.worker_name}</p>
                        <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-red-600">-{(Number(b.price) * 1.19975).toFixed(2)} $</p>
                        <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-0.5">Terminé</span>
                        {!b.has_reviewed && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setReviewBooking({ id: b.id, targetName: b.worker_name }); }}
                            className="block mt-1 text-xs text-green-700 hover:underline"
                          >
                            Laisser un avis
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {detailBooking && session?.access_token && (
        <BookingDetailModal
          booking={detailBooking.booking}
          userRole={detailBooking.role}
          accessToken={session.access_token}
          onClose={() => setDetailBooking(null)}
          onUpdated={(bookingId, updates) => {
            setReceived((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...updates } : b));
            setSent((prev) => prev.map((b) => b.id === bookingId ? { ...b, ...updates } : b));
            setDetailBooking((prev) => prev ? { ...prev, booking: { ...prev.booking, ...updates } } : null);
          }}
          onMessage={(userId) => startConversation(userId)}
          onOpenReview={(bookingId, targetName) => setReviewBooking({ id: bookingId, targetName })}
          onOpenDispute={(bookingId, title) => setDisputeBooking({ id: bookingId, title })}
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
            setReceived((prev) => prev.map((b) => b.id === bookingId ? { ...b, has_dispute: true } : b));
            setSent((prev) => prev.map((b) => b.id === bookingId ? { ...b, has_dispute: true } : b));
          }}
        />
      )}
    </main>
  );
}

export default function BookingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
