"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/Spinner";

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

interface Transaction {
  id: string;
  booking_id: string | null;
  type: "credit" | "debit";
  amount: number;
  description: string;
  other_user_name: string | null;
  listing_title: string | null;
  created_at: string;
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
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
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
  const [connectLoading, setConnectLoading] = useState(false);
  const [detailBooking, setDetailBooking] = useState<{ booking: BookingDetail; role: "worker" | "client" } | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const { startConversation } = useStartConversation();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!session?.access_token) return;

    const headers = { Authorization: `Bearer ${session.access_token}` };
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/transactions?period=${period}`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/status`, { headers }).then((r) => r.json()),
    ])
      .then(([walletData, txData, statusData]) => {
        setWallet(walletData);
        setTransactions(Array.isArray(txData) ? txData : []);
        setConnectStatus(statusData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, session, router, authLoading]);

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

  const handleOpenBooking = async (tx: Transaction) => {
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

  const handleConnectStripe = async () => {
    if (!session?.access_token) return;
    setConnectLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <WalletSkeleton />
        </main>
      </div>
    );
  }

  const currentPeriodLabel = t(PERIODS.find((p) => p.key === period)?.labelKey ?? "wallet.last2weeks");

  return (
    <div className="min-h-screen bg-gray-50">
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

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Balance — full width on mobile */}
          <Card className="col-span-2 sm:col-span-1 border-green-200 bg-gradient-to-br from-green-700 to-green-800 text-white shadow-md">
            <CardContent className="pt-4 pb-4 px-5 sm:pt-5 sm:pb-5">
              <p className="text-xs text-green-200 font-medium uppercase tracking-wide mb-1">
                {t("wallet.availableBalance")}
              </p>
              <p className="text-3xl font-extrabold tracking-tight">
                {fmt(wallet?.balance ?? 0)}&nbsp;$
              </p>
            </CardContent>
          </Card>

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
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-base flex items-center gap-2 font-semibold text-gray-900">
                <Calendar className="h-4 w-4 text-green-700" />
                {t("wallet.nextPayout")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 pb-5 px-5 space-y-3">
              {(wallet?.available_for_payout ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{t("wallet.youWillReceive")}</span>
                  <span className="text-lg font-bold text-green-700">{fmt(wallet?.available_for_payout ?? 0)}&nbsp;$</span>
                </div>
              )}
              {(wallet?.pending_amount ?? 0) > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {t("wallet.pendingInfo", { amount: fmt(wallet?.pending_amount ?? 0) })}
                  </p>
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
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  onClick={() => tx.booking_id && handleOpenBooking(tx)}
                  className={`flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors ${tx.booking_id ? "cursor-pointer active:bg-gray-50 hover:bg-gray-50" : ""}`}
                >
                  {/* Icon */}
                  <div
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === "credit" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {tx.type === "credit"
                      ? <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      : <ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.listing_title ?? tx.description}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {tx.other_user_name && (
                        <span className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-none">
                          {tx.type === "credit" ? t("wallet.from") : t("wallet.to")}&nbsp;{tx.other_user_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{formatDate(tx.created_at, lang)}</span>
                    </div>
                  </div>

                  {/* Amount + arrow */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-sm font-bold ${tx.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                      {tx.type === "credit" ? "+" : "−"}{fmt(tx.amount)}&nbsp;$
                    </span>
                    {tx.booking_id && (
                      detailLoading === tx.id
                        ? <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
                        : <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

      </main>

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
          onOpenReview={() => setDetailBooking(null)}
          onOpenDispute={() => setDetailBooking(null)}
        />
      )}
    </div>
  );
}
