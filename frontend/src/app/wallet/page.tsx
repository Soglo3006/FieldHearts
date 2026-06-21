"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStartConversation } from "@/hooks/useStartConversation";
import BookingDetailModal, { type BookingDetail } from "@/components/bookings/BookingDetailModal";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  X,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getLanguageCode } from "@/lib/locale";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { createStripeConnectLink } from "@/lib/stripeConnect";
import {
  groupWalletTransactions,
  isDepositOnlyDescription,
  type DisplayWalletTransaction,
  type WalletTransaction,
} from "@/lib/groupWalletTransactions";
import { getDisputeWindowState } from "@/lib/disputes";

interface WalletData {
  balance: number;
  total_earned: number;
  total_spent: number;
  available_for_payout: number;
  pending_amount: number;
  commission_amount: number;
  net_payout: number;
  next_payout_date: string;
}

type Transaction = WalletTransaction;

interface PendingHoldItem {
  booking_id: string;
  listing_title: string;
  amount: number;
  completed_at: string;
  other_user_name: string;
  has_open_dispute: boolean;
}

interface DisputeEligibleItem {
  booking_id: string;
  listing_title: string;
  completed_at: string;
  other_user_name: string;
  amount_paid: number;
}

type Period = "2weeks" | "1month" | "3months" | "6months" | "1year" | "all";

const PERIODS: { key: Period; labelKey: string }[] = [
  { key: "2weeks",  labelKey: "wallet.last2weeks" },
  { key: "1month",  labelKey: "wallet.last1month" },
  { key: "3months", labelKey: "wallet.last3months" },
  { key: "6months", labelKey: "wallet.last6months" },
  { key: "1year",   labelKey: "wallet.last1year" },
  { key: "all",     labelKey: "wallet.allTransactions" },
];

function fmt(n: number) {
  return Number(n).toFixed(2);
}

function formatDate(dateStr: string, lang: string) {
  try {
    return new Date(dateStr).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

function formatPayoutDate(dateStr: string, lang: string) {
  try {
    return new Date(dateStr).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function WalletSkeleton() {
  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-7 w-36" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Balance card — taller, dark */}
        <Card className="shadow-md overflow-hidden">
          <CardContent className="pt-5 pb-5 px-5">
            <Skeleton className="h-3 w-28 mb-3" />
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
        {/* Earned */}
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-5 px-5 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardContent>
        </Card>
        {/* Spent */}
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-5 px-5 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction card */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-5">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        {/* Tabs row */}
        <div className="px-5 pb-4">
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
        <Separator />
        <CardContent className="pt-4 pb-2 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const lang = getLanguageCode(i18n.language);
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("2weeks");
  const [connectStatus, setConnectStatus] = useState<{
    connected: boolean;
    charges_enabled: boolean;
    details_submitted: boolean;
  } | null>(null);

  // Read sessionStorage cache after hydration (uses localStorage to derive userId so no hydration mismatch)
  useEffect(() => {
    try {
      const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0];
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { user?: { id?: string } };
      const userId = parsed?.user?.id;
      if (!userId) return;
      const walletRaw = sessionStorage.getItem(`wallet-${userId}`);
      if (walletRaw) { setWallet(JSON.parse(walletRaw)); setLoading(false); }
      const txRaw = sessionStorage.getItem(`wallet-tx-${userId}-2weeks`);
      if (txRaw) setTransactions(JSON.parse(txRaw));
      const connectRaw = sessionStorage.getItem(`wallet-connect-${userId}`);
      if (connectRaw) setConnectStatus(JSON.parse(connectRaw));
    } catch {}
  }, []);
  const [connectLoading, setConnectLoading] = useState(false);
  const [detailBooking, setDetailBooking] = useState<{ booking: BookingDetail; role: "worker" | "client" } | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [payoutModal, setPayoutModal] = useState<{ date: string; items: { booking_id: string; title: string; base_price: number; worker_amount: number }[]; total: number } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
  const [payoutItemLoading, setPayoutItemLoading] = useState<string | null>(null);
  const [payoutView, setPayoutView] = useState<"list" | "detail">("list");
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingDetailsLoading, setPendingDetailsLoading] = useState(false);
  const [workerHolds, setWorkerHolds] = useState<PendingHoldItem[]>([]);
  const [disputeEligible, setDisputeEligible] = useState<DisputeEligibleItem[]>([]);
  const { startConversation } = useStartConversation();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!session?.access_token) return;

    const hasCached = !!sessionStorage.getItem(`wallet-${user.id}`);
    if (!hasCached) setLoading(true);

    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/transactions?period=2weeks`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/status`, { headers }).then((r) => r.json()),
    ])
      .then(([walletData, txData, statusData]) => {
        setWallet(walletData);
        setTransactions(Array.isArray(txData) ? txData : []);
        setConnectStatus(statusData);
        try {
          sessionStorage.setItem(`wallet-${user.id}`, JSON.stringify(walletData));
          sessionStorage.setItem(`wallet-tx-${user.id}-2weeks`, JSON.stringify(txData));
          sessionStorage.setItem(`wallet-connect-${user.id}`, JSON.stringify(statusData));
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, session?.user?.id, router, authLoading]);

  useEffect(() => {
    if (!session?.access_token || !user) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    setTxLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/transactions?period=${period}`, { headers })
      .then((r) => r.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, [period]);

  const fetchPendingDetails = useCallback(async () => {
    if (!session?.access_token) return;
    setPendingDetailsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/pending-details`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setWorkerHolds(Array.isArray(data.worker_holds) ? data.worker_holds : []);
      setDisputeEligible(Array.isArray(data.dispute_eligible) ? data.dispute_eligible : []);
    } catch {
    } finally {
      setPendingDetailsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !user) return;
    fetchPendingDetails();
  }, [session?.access_token, user, fetchPendingDetails]);

  const openPendingModal = () => {
    setPendingModalOpen(true);
    fetchPendingDetails();
  };

  const formatDisputeDeadline = (completedAt: string) => {
    const window = getDisputeWindowState(completedAt);
    if (!window.isOpen || window.remainingMs == null) return "";
    const deadline = new Date(new Date(completedAt).getTime() + 3 * 24 * 60 * 60 * 1000);
    return deadline.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpenPendingBooking = async (bookingId: string, role: "worker" | "client") => {
    if (!session?.access_token) return;
    setDetailLoading(bookingId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPendingModalOpen(false);
      setDetailBooking({ booking: data as BookingDetail, role });
    } catch {
    } finally {
      setDetailLoading(null);
    }
  };

  const hasPendingModalContent =
    (wallet?.pending_amount ?? 0) > 0 || workerHolds.length > 0 || disputeEligible.length > 0;

  const handleOpenBooking = async (tx: DisplayWalletTransaction) => {
    if (!tx.booking_id || !session?.access_token) return;
    setDetailLoading(tx.id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${tx.booking_id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const role: "worker" | "client" = tx.type === "credit" ? "worker" : "client";
      setDetailBooking({ booking: data as BookingDetail, role });
    } catch {
    } finally {
      setDetailLoading(null);
    }
  };

  const handleOpenPayout = async (tx: Transaction) => {
    if (!session?.access_token) return;
    setPayoutLoading(tx.id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/wallet/payout-details?date=${encodeURIComponent(tx.created_at)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const items = await res.json();
      const total = items.reduce((sum: number, i: { worker_amount: number }) => sum + Number(i.worker_amount), 0);
      setPayoutView("list");
      setPayoutModal({ date: tx.created_at, items, total });
    } catch {
    } finally {
      setPayoutLoading(null);
    }
  };

  const handleOpenPayoutItem = async (bookingId: string) => {
    if (!session?.access_token) return;
    setPayoutItemLoading(bookingId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDetailBooking({ booking: data as BookingDetail, role: "worker" });
      setPayoutModal(null);
    } catch {
    } finally {
      setPayoutItemLoading(null);
    }
  };

  const handleConnectStripe = async () => {
    if (!session?.access_token) return;
    setConnectLoading(true);
    try {
      const { url } = await createStripeConnectLink({
        accessToken: session.access_token,
        returnPath: "/wallet?stripe=success",
        refreshPath: "/wallet?stripe=refresh",
      });
      if (url) window.location.href = url;
    } catch {
    } finally {
      setConnectLoading(false);
    }
  };

  // Auto-redirect back to Stripe if URL contains ?stripe=refresh
  useEffect(() => {
    if (searchParams.get("stripe") === "refresh" && session?.access_token && !connectLoading) {
      handleConnectStripe();
    }
  }, [searchParams, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <WalletSkeleton />
        </main>
      </div>
    );
  }

  const currentPeriodLabel = t(PERIODS.find((p) => p.key === period)?.labelKey ?? "wallet.last2weeks");
  const displayTransactions = groupWalletTransactions(transactions, t);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10 space-y-5">

        {/* Page title */}
        <h1 className="text-2xl font-bold text-gray-900">{t("wallet.title")}</h1>

        {/* Stripe Connect banner */}
        {connectStatus && !connectStatus.charges_enabled && (
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              {connectStatus.details_submitted ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t("wallet.verificationInProgress")}</p>
                    <p className="text-sm text-gray-500 max-w-xs">{t("wallet.stripeVerifyingDesc")}</p>
                  </div>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={connectLoading}
                    className="bg-green-700 hover:bg-green-800 text-white gap-2 px-6 h-11 rounded-xl text-sm"
                  >
                    {connectLoading ? <Spinner size="sm" /> : null}
                    {t("wallet.completeFile")}
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t("wallet.receivePayments")}</p>
                    <p className="text-sm text-gray-500 max-w-xs">{t("wallet.connectBankDesc")}</p>
                  </div>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={connectLoading}
                    className="bg-green-700 hover:bg-green-800 text-white gap-2 px-6 h-11 rounded-xl text-sm"
                  >
                    {connectLoading ? <Spinner size="sm" /> : null}
                    {t("wallet.connectAccount")}
                  </Button>
                  <p className="text-xs text-gray-400 flex items-center gap-1 -mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-300" />
                    {t("wallet.securedByStripe")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bank connected pill */}
        {connectStatus?.charges_enabled && (
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-gray-500">
              {t("wallet.bankAccountConnected")} —{" "}
              <button
                onClick={handleConnectStripe}
                className="text-green-700 hover:underline cursor-pointer"
              >
                {t("wallet.manageOnStripe")}
              </button>
            </p>
          </div>
        )}

        {/* Balance breakdown card */}
        <Card className="shadow-md overflow-hidden border-green-100">
          <CardContent className="p-0">
            {/* Top: total */}
            <div className="bg-gradient-to-br from-green-700 to-green-800 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-200 font-medium uppercase tracking-wide">{t("wallet.totalBalance")}</p>
                <p className="text-3xl font-extrabold tracking-tight text-white mt-0.5">
                  {fmt((wallet?.available_for_payout ?? 0) + (wallet?.pending_amount ?? 0))}&nbsp;$
                </p>
              </div>
            </div>
            {/* Bottom: approved + pending */}
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wallet.approvedAmount")}</p>
                </div>
                <p className="text-xl font-bold text-green-700">{fmt(wallet?.available_for_payout ?? 0)}&nbsp;$</p>
                <p className="text-[11px] text-gray-400 mt-1">{t("wallet.approvedAmountDesc")}</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wallet.pendingAmountLabel")}</p>
                </div>
                <p className="text-xl font-bold text-amber-600">{fmt(wallet?.pending_amount ?? 0)}&nbsp;$</p>
                <p className="text-[11px] text-gray-400 mt-1">{t("wallet.pendingAmountDesc")}</p>
                {hasPendingModalContent && (
                  <button
                    type="button"
                    onClick={openPendingModal}
                    className="text-xs text-amber-700 hover:text-amber-900 hover:underline mt-2 text-left cursor-pointer font-medium"
                  >
                    {t("wallet.viewPendingDetail")} →
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Earned */}
          <Card className="shadow-sm">
            <CardContent className="pt-4 pb-4 px-4 sm:pt-5 sm:pb-5 sm:px-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium truncate">{t("wallet.totalEarned")}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {fmt(wallet?.total_earned ?? 0)}&nbsp;$
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Spent */}
          <Card className="shadow-sm">
            <CardContent className="pt-4 pb-4 px-4 sm:pt-5 sm:pb-5 sm:px-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium truncate">{t("wallet.totalSpent")}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {fmt(wallet?.total_spent ?? 0)}&nbsp;$
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next payout */}
        {((wallet?.available_for_payout ?? 0) > 0 || (wallet?.pending_amount ?? 0) > 0) && (
          <Card className="shadow-sm">
            <CardHeader className=" px-5">
              <CardTitle className="text-base flex items-center gap-2 font-semibold text-gray-900">
                {t("wallet.nextPayout")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className=" pb-5 px-5 space-y-3">
              {(wallet?.available_for_payout ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{t("wallet.youWillReceive")}</span>
                  <span className="text-lg font-bold text-green-700">{fmt(wallet?.available_for_payout ?? 0)}&nbsp;$</span>
                </div>
              )}
              {(wallet?.pending_amount ?? 0) > 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg py-2 px-3">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-red-500 leading-relaxed">
                      {t("wallet.pendingInfo", { amount: fmt(wallet?.pending_amount ?? 0) })}
                    </p>
                    {hasPendingModalContent && (
                      <button
                        type="button"
                        onClick={openPendingModal}
                        className="text-xs text-red-700 hover:underline mt-1 font-medium cursor-pointer"
                      >
                        {t("wallet.viewPendingDetail")} →
                      </button>
                    )}
                  </div>
                </div>
              )}
              {wallet?.next_payout_date && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t("wallet.nextPayoutDate")}</span>
                    <span className="text-sm font-medium text-gray-800">
                      {formatPayoutDate(wallet.next_payout_date, lang)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transaction history */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-base font-semibold text-gray-900">
              {t("wallet.transactionHistory")}
            </CardTitle>
          </CardHeader>

          {/* Period selector — dropdown on mobile, tabs on desktop */}
          <div className="px-5 pb-4">
            {/* Mobile: Select dropdown */}
            <div className="sm:hidden">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="h-9 text-sm bg-gray-100 border-0 focus:ring-1 focus:ring-green-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.key} value={p.key} className="text-sm">
                      {t(p.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Desktop: Tabs */}
            <div className="hidden sm:block">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList className="h-8 gap-0.5 bg-gray-100">
                  {PERIODS.map((p) => (
                    <TabsTrigger
                      key={p.key}
                      value={p.key}
                      className="text-xs px-2.5 h-6 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:font-semibold"
                    >
                      {t(p.labelKey)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          <Separator />

          {txLoading ? (
            <CardContent className="pt-5 pb-5 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </CardContent>
          ) : transactions.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Clock className="h-7 w-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">
                {period === "all"
                  ? t("wallet.noTransactions")
                  : t("wallet.noTransactionsInPeriod", { period: currentPeriodLabel })}
              </p>
              <Link href="/listings" className="text-sm text-green-700 hover:underline mt-3">
                {t("wallet.browseListings")}
              </Link>
            </CardContent>
          ) : (
            <ul className="divide-y divide-gray-100">
              {displayTransactions.map((tx) => {
                const isPayout = !tx.booking_id && tx.type === "debit" && tx.description?.toLowerCase().includes("versement");
                const isClickable = !!tx.booking_id || isPayout;
                const showPartBreakdown = tx.isGrouped || (tx.parts.length === 1 && isDepositOnlyDescription(tx.description));
                const partLine = tx.parts
                  .map((part) => `${part.label} ${fmt(part.amount)} $`)
                  .join(t("wallet.txPartsJoin"));
                return (
                <li
                  key={tx.id}
                  onClick={() => {
                    if (isPayout) handleOpenPayout(tx);
                    else if (tx.booking_id) handleOpenBooking(tx);
                  }}
                  className={`flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors ${isClickable ? "cursor-pointer active:bg-gray-50 hover:bg-gray-50" : ""}`}
                >
                  {/* Icon */}
                  <div
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === "credit" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {isPayout
                      ? <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                      : tx.type === "credit"
                        ? <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        : <ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.listing_title ?? tx.description}
                    </p>
                    {showPartBreakdown && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{partLine}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {tx.other_user_name && (
                        <span className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-none">
                          {tx.type === "credit" ? t("wallet.from") : t("wallet.to")}&nbsp;{tx.other_user_name}
                        </span>
                      )}
                      {tx.other_user_name && <span className="text-xs text-gray-300">·</span>}
                      <span className="text-xs text-gray-400">{formatDate(tx.created_at, lang)}</span>
                    </div>
                  </div>

                  {/* Amount + arrow */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-sm font-bold ${tx.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                      {tx.type === "credit" ? "+" : "−"}{fmt(tx.amount)}&nbsp;$
                    </span>
                    {isClickable && (
                      (detailLoading === tx.id || payoutLoading === tx.id)
                        ? <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
                        : <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </Card>

      </main>

      {/* Pending / dispute detail modal */}
      {pendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">{t("wallet.pendingModalTitle")}</h2>
              <button
                type="button"
                title={t("serviceDetail.close")}
                onClick={() => setPendingModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {pendingDetailsLoading ? (
                <div className="px-5 py-10 flex justify-center">
                  <Spinner size="sm" />
                </div>
              ) : workerHolds.length === 0 && disputeEligible.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">{t("wallet.noPendingItems")}</p>
              ) : (
                <>
                  {workerHolds.length > 0 && (
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {t("wallet.workerHoldsSection")}
                      </p>
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">{t("wallet.workerHoldsHint")}</p>
                      <ul className="space-y-2">
                        {workerHolds.map((item) => (
                          <li key={item.booking_id}>
                            <button
                              type="button"
                              onClick={() => handleOpenPendingBooking(item.booking_id, "worker")}
                              className="w-full flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.listing_title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {t("wallet.from")} {item.other_user_name}
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                  {t("wallet.disputeDeadline", { date: formatDisputeDeadline(item.completed_at) })}
                                </p>
                                {item.has_open_dispute && (
                                  <span className="inline-block mt-1 text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                    {t("wallet.openDisputeBadge")}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-bold text-amber-600 shrink-0">+{fmt(item.amount)} $</span>
                              {detailLoading === item.booking_id
                                ? <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                              }
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {disputeEligible.length > 0 && (
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {t("wallet.disputeEligibleSection")}
                      </p>
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">{t("wallet.disputeEligibleHint")}</p>
                      <ul className="space-y-2">
                        {disputeEligible.map((item) => (
                          <li key={item.booking_id}>
                            <button
                              type="button"
                              onClick={() => handleOpenPendingBooking(item.booking_id, "client")}
                              className="w-full flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.listing_title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {t("wallet.to")} {item.other_user_name}
                                </p>
                                <p className="text-xs text-red-600 mt-0.5">
                                  {t("wallet.disputeDeadline", { date: formatDisputeDeadline(item.completed_at) })}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold text-gray-800 block">−{fmt(item.amount_paid)} $</span>
                                <span className="text-[10px] text-gray-400">{t("wallet.amountPaid")}</span>
                              </div>
                              {detailLoading === item.booking_id
                                ? <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                              }
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payout detail modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">{t("wallet.payoutDetails")}</h2>
              <button onClick={() => setPayoutModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Date */}
            <div className="px-5 py-2.5 bg-white border-b border-gray-100 shrink-0">
              <p className="text-xs text-gray-500">{formatDate(payoutModal.date, lang)}</p>
            </div>
            {/* Items */}
            <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
              {payoutModal.items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">{t("wallet.noDetails")}</p>
              ) : payoutModal.items.map((item) => (
                <div
                  key={item.booking_id}
                  onClick={() => handleOpenPayoutItem(item.booking_id)}
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t("wallet.basePrice")} : {fmt(item.base_price)} $</p>
                  </div>
                  <span className="text-sm font-bold text-green-700 shrink-0">+{fmt(item.worker_amount)} $</span>
                  {payoutItemLoading === item.booking_id
                    ? <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  }
                </div>
              ))}
            </div>
            {/* Total */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-white shrink-0">
              <span className="text-sm font-semibold text-gray-700">{t("wallet.totalPayout")}</span>
              <span className="text-base font-bold text-gray-900">−{fmt(payoutModal.total)} $</span>
            </div>
          </div>
        </div>
      )}

      {detailBooking && session?.access_token && (
        <BookingDetailModal
          booking={detailBooking.booking}
          userRole={detailBooking.role}
          accessToken={session.access_token}
          onClose={() => setDetailBooking(null)}
          onUpdated={(id, updates) =>
            setDetailBooking((prev) =>
              prev ? { ...prev, booking: { ...prev.booking, ...updates } } : prev
            )
          }
          onMessage={(userId) => { setDetailBooking(null); startConversation(userId); }}
        />
      )}
    </div>
  );
}
