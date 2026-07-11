"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStartConversation } from "@/hooks/useStartConversation";
import BookingDetailModal, { type BookingDetail } from "@/components/bookings/BookingDetailModal";
import {
  ChevronLeft,
  Clock,
  ChevronRight,
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { getLanguageCode } from "@/lib/locale";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import WalletSkeleton, {
  WalletModalListSkeleton,
  WalletSummaryListSkeleton,
  WalletTransactionListSkeleton,
} from "@/components/wallet/WalletSkeleton";
import StripePayoutSetup from "@/components/stripe/StripePayoutSetup";
import {
  groupWalletTransactions,
  isDepositOnlyDescription,
  transactionMatchesCategory,
  type DisplayWalletTransaction,
  type TransactionCategoryFilter,
  type WalletTransaction,
} from "@/lib/groupWalletTransactions";
import { getDisputeWindowState } from "@/lib/disputes";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

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

interface ApprovedPayoutItem {
  booking_id: string;
  listing_title: string;
  amount: number;
  completed_at: string;
  other_user_name: string;
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

const TX_CATEGORY_FILTERS: { key: TransactionCategoryFilter; labelKey: string }[] = [
  { key: "all",             labelKey: "wallet.txFilterAll" },
  { key: "deposit",         labelKey: "wallet.txFilterDeposit" },
  { key: "balance",         labelKey: "wallet.txFilterBalance" },
  { key: "full",            labelKey: "wallet.txFilterFull" },
  { key: "received",        labelKey: "wallet.txFilterReceived" },
  { key: "cancellation",    labelKey: "wallet.txFilterCancellation" },
  { key: "deposit_retained", labelKey: "wallet.txFilterDepositRetained" },
  { key: "refund",          labelKey: "wallet.txFilterRefund" },
  { key: "payout",          labelKey: "wallet.txFilterPayout" },
  { key: "other",           labelKey: "wallet.txFilterOther" },
];

interface SummaryTransactionItem {
  id: string;
  booking_id: string | null;
  type: "credit" | "debit";
  amount: number;
  description: string;
  other_user_name: string | null;
  listing_title: string | null;
  created_at: string;
}

function WalletSummaryModal({
  open,
  onClose,
  title,
  hint,
  total,
  variant,
  view,
  items,
  loading,
  page,
  totalPages,
  slideDir,
  onPageChange,
  onItemClick,
  itemLoadingId,
  detailBooking,
  detailLoading,
  onBack,
  accessToken,
  onBookingUpdated,
  onMessage,
  lang,
  t,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hint: string;
  total: number;
  variant: "earned" | "spent";
  view: "list" | "detail";
  items: DisplayWalletTransaction[];
  loading: boolean;
  page: number;
  totalPages: number;
  slideDir: "prev" | "next";
  onPageChange: (page: number) => void;
  onItemClick: (tx: DisplayWalletTransaction) => void;
  itemLoadingId: string | null;
  detailBooking: { booking: BookingDetail; role: "worker" | "client" } | null;
  detailLoading: boolean;
  onBack: () => void;
  accessToken?: string;
  onBookingUpdated: (id: string, updates: Partial<BookingDetail>) => void;
  onMessage: (userId: string) => void;
  lang: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (!open || typeof document === "undefined") return null;

  const isEarned = variant === "earned";
  const toneClass = isEarned ? "text-green-700" : "text-red-600";
  const sign = isEarned ? "+" : "−";
  const isDetail = view === "detail";

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4 min-h-[100dvh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={walletModalShellClass(isDetail)}>
        <div
          className={cn(
            "flex min-h-0 w-[200%] transition-transform",
            WALLET_MODAL_EASE,
            isDetail ? "-translate-x-1/2" : "translate-x-0",
          )}
        >
          {/* Panel — list */}
          <div
            className={cn(
              "w-1/2 shrink-0 grid min-h-0 max-h-[min(85dvh,calc(100dvh-2rem))]",
              "grid-rows-[auto_auto_minmax(0,1fr)_auto]",
              isDetail && "h-full",
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <button type="button" title={t("serviceDetail.close")} onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/80">
              <p className="text-xs text-gray-500 leading-snug">{hint}</p>
              <p className={cn("text-2xl font-bold mt-0.5 tabular-nums", toneClass)}>
                {sign}{fmt(total)}&nbsp;$
              </p>
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain">
              {loading ? (
                <WalletSummaryListSkeleton />
              ) : items.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">{t("wallet.noSummaryItems")}</p>
              ) : (
                <ul
                  key={page}
                  className={cn(
                    "divide-y divide-gray-100",
                    "animate-in fade-in-0 duration-300 ease-out",
                    slideDir === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
                  )}
                >
                  {items.map((tx) => {
                    const isCredit = isEarned || tx.type === "credit";
                    const isRefund = !isEarned && tx.type === "credit";
                    const showPartBreakdown = shouldShowSummaryPartBreakdown(
                      isEarned,
                      isCredit,
                      isRefund,
                      tx,
                    );
                    const partLine = tx.parts
                      .map((part) => `${part.label} ${fmt(part.amount)} $`)
                      .join(t("wallet.txPartsJoin"));
                    const clickable = !!tx.booking_id;
                    return (
                      <li key={tx.id}>
                        <button
                          type="button"
                          disabled={!clickable}
                          onClick={() => clickable && onItemClick(tx)}
                          className={cn(
                            "w-full flex items-start gap-3 px-5 py-3 text-left transition-colors",
                            clickable ? "hover:bg-gray-50 cursor-pointer" : "cursor-default",
                          )}
                        >
                          <div
                            className={cn(
                              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                              isCredit ? "bg-green-100" : "bg-red-100",
                            )}
                          >
                              {isCredit
                                ? <TrendingUp className="h-5 w-5 text-green-600" />
                                : <TrendingDown className="h-5 w-5 text-red-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {tx.listing_title ?? tx.description}
                              </p>
                              {showPartBreakdown && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{partLine}</p>
                              )}
                              {isRefund && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{tx.description}</p>
                              )}
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {tx.other_user_name && (
                                  <span className="text-xs text-gray-500 truncate">
                                    {isCredit ? t("wallet.from") : t("wallet.to")}&nbsp;{tx.other_user_name}
                                  </span>
                                )}
                                {tx.other_user_name && <span className="text-xs text-gray-300">·</span>}
                                <span className="text-xs text-gray-400">{formatDate(tx.created_at, lang)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 self-center">
                              <span
                                className={cn(
                                  "text-sm font-bold tabular-nums",
                                  isCredit ? "text-green-700" : "text-red-600",
                                )}
                              >
                                {isCredit ? "+" : "−"}{fmt(tx.amount)}&nbsp;$
                              </span>
                              {clickable && (
                                itemLoadingId === tx.id
                                  ? <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                                  : <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>

            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("wallet.txPrevPage")}
                </button>
                <span className="text-xs text-gray-500 tabular-nums">
                  {t("wallet.txPageOf", { page, total: totalPages })}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("wallet.txNextPage")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Panel — booking detail (slide in) */}
          <div className="w-1/2 shrink-0 flex flex-col min-h-0 h-full max-h-[min(85dvh,calc(100dvh-2rem))]">
            {isDetail && (
              detailLoading ? (
                <WalletDetailLoadingPanel onBack={onBack} backLabel={title} />
              ) : detailBooking && accessToken ? (
                <BookingDetailModal
                  embedded
                  embeddedBackLabel={title}
                  booking={detailBooking.booking}
                  userRole={detailBooking.role}
                  accessToken={accessToken}
                  onClose={onClose}
                  onBack={onBack}
                  onUpdated={onBookingUpdated}
                  onMessage={onMessage}
                />
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
const TX_PAGE_SIZE = 6;
const SUMMARY_MODAL_PAGE_SIZE = 6;

const WALLET_MODAL_EASE = "duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";

const WALLET_FILTER_TRIGGER_CLASS =
  "h-9 w-full border border-gray-300 rounded-lg cursor-pointer text-xs sm:text-sm px-3 flex items-center justify-between bg-white text-left hover:border-gray-400 transition-colors";

function walletModalShellClass(isDetail: boolean) {
  return cn(
    "relative bg-white rounded-2xl shadow-xl w-full overflow-hidden flex flex-col z-10",
    "max-w-lg max-h-[min(85dvh,calc(100dvh-2rem))]",
    "transition-[min-height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
    isDetail && "min-h-[min(72dvh,calc(100dvh-3rem))]",
  );
}

function shouldShowSummaryPartBreakdown(
  isEarned: boolean,
  isCredit: boolean,
  isRefund: boolean,
  tx: DisplayWalletTransaction,
): boolean {
  if (isRefund || isCredit) return false;
  if (isEarned) {
    return tx.isGrouped || tx.parts.some((p) => p.category === "deposit_retained");
  }
  return (
    tx.isGrouped ||
    tx.parts.some((p) =>
      ["deposit", "balance", "full", "cancellation"].includes(p.category),
    )
  );
}

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

function WalletDetailLoadingPanel({
  onBack,
  backLabel,
}: {
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col h-full min-h-[min(72dvh,calc(100dvh-3rem))] animate-in fade-in-0 duration-300">
      <div className="px-5 py-4 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="rounded-xl border border-gray-100 p-4 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="rounded-xl border border-gray-100 p-4 space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const lang = getLanguageCode(i18n.language);
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("2weeks");
  const [txCategoryFilter, setTxCategoryFilter] = useState<TransactionCategoryFilter>("all");
  const [txPage, setTxPage] = useState(1);
  const [txSlideDir, setTxSlideDir] = useState<"prev" | "next">("next");
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
  const [detailBooking, setDetailBooking] = useState<{ booking: BookingDetail; role: "worker" | "client" } | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [payoutModal, setPayoutModal] = useState<{ date: string; items: { booking_id: string; title: string; base_price: number; worker_amount: number }[]; total: number } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
  const [payoutItemLoading, setPayoutItemLoading] = useState<string | null>(null);
  const [payoutView, setPayoutView] = useState<"list" | "detail">("list");
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingModalView, setPendingModalView] = useState<"list" | "detail">("list");
  const [pendingDetailBooking, setPendingDetailBooking] = useState<{
    booking: BookingDetail;
    role: "worker" | "client";
  } | null>(null);
  const [pendingDetailsLoading, setPendingDetailsLoading] = useState(false);
  const [workerHolds, setWorkerHolds] = useState<PendingHoldItem[]>([]);
  const [disputeEligible, setDisputeEligible] = useState<DisputeEligibleItem[]>([]);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [approvedModalView, setApprovedModalView] = useState<"list" | "detail">("list");
  const [approvedDetailBooking, setApprovedDetailBooking] = useState<{
    booking: BookingDetail;
    role: "worker" | "client";
  } | null>(null);
  const [approvedDetailsLoading, setApprovedDetailsLoading] = useState(false);
  const [approvedItems, setApprovedItems] = useState<ApprovedPayoutItem[]>([]);
  const [approvedDetailLoading, setApprovedDetailLoading] = useState(false);
  const [pendingDetailLoading, setPendingDetailLoading] = useState(false);
  const [earnedModalOpen, setEarnedModalOpen] = useState(false);
  const [earnedModalView, setEarnedModalView] = useState<"list" | "detail">("list");
  const [earnedDetailBooking, setEarnedDetailBooking] = useState<{
    booking: BookingDetail;
    role: "worker" | "client";
  } | null>(null);
  const [earnedDetailLoading, setEarnedDetailLoading] = useState(false);
  const [earnedItems, setEarnedItems] = useState<SummaryTransactionItem[]>([]);
  const [earnedDetailsLoading, setEarnedDetailsLoading] = useState(false);
  const [earnedPage, setEarnedPage] = useState(1);
  const [earnedSlideDir, setEarnedSlideDir] = useState<"prev" | "next">("next");
  const [earnedRowLoading, setEarnedRowLoading] = useState<string | null>(null);
  const [spentModalOpen, setSpentModalOpen] = useState(false);
  const [spentModalView, setSpentModalView] = useState<"list" | "detail">("list");
  const [spentDetailBooking, setSpentDetailBooking] = useState<{
    booking: BookingDetail;
    role: "worker" | "client";
  } | null>(null);
  const [spentDetailLoading, setSpentDetailLoading] = useState(false);
  const [spentItems, setSpentItems] = useState<SummaryTransactionItem[]>([]);
  const [spentDetailsLoading, setSpentDetailsLoading] = useState(false);
  const [spentPage, setSpentPage] = useState(1);
  const [spentSlideDir, setSpentSlideDir] = useState<"prev" | "next">("next");
  const [spentRowLoading, setSpentRowLoading] = useState<string | null>(null);
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
    ])
      .then(([walletData, txData]) => {
        setWallet(walletData);
        setTransactions(Array.isArray(txData) ? txData : []);
        try {
          sessionStorage.setItem(`wallet-${user.id}`, JSON.stringify(walletData));
          sessionStorage.setItem(`wallet-tx-${user.id}-2weeks`, JSON.stringify(txData));
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, session?.user?.id, session?.access_token, router, authLoading]);

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

  const fetchApprovedDetails = useCallback(async () => {
    if (!session?.access_token) return;
    setApprovedDetailsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/approved-details`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setApprovedItems(Array.isArray(data.items) ? data.items : []);
    } catch {
    } finally {
      setApprovedDetailsLoading(false);
    }
  }, [session?.access_token]);

  const fetchEarnedDetails = useCallback(async () => {
    if (!session?.access_token) return;
    setEarnedDetailsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/earned-details`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setEarnedItems(Array.isArray(data.items) ? data.items : []);
    } catch {
    } finally {
      setEarnedDetailsLoading(false);
    }
  }, [session?.access_token]);

  const fetchSpentDetails = useCallback(async () => {
    if (!session?.access_token) return;
    setSpentDetailsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/spent-details`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSpentItems(Array.isArray(data.items) ? data.items : []);
    } catch {
    } finally {
      setSpentDetailsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !user) return;
    fetchPendingDetails();
    fetchApprovedDetails();
  }, [session?.access_token, user, fetchPendingDetails, fetchApprovedDetails]);

  const closePendingModal = () => {
    setPendingModalOpen(false);
    setPendingModalView("list");
    setPendingDetailBooking(null);
    setPendingDetailLoading(false);
  };

  const openPendingModal = () => {
    setPendingModalView("list");
    setPendingDetailBooking(null);
    setPendingModalOpen(true);
    fetchPendingDetails();
  };

  const backToPendingList = () => {
    setPendingModalView("list");
    setPendingDetailBooking(null);
    setPendingDetailLoading(false);
  };

  const closeApprovedModal = () => {
    setApprovedModalOpen(false);
    setApprovedModalView("list");
    setApprovedDetailBooking(null);
    setApprovedDetailLoading(false);
  };

  const openApprovedModal = () => {
    setApprovedModalView("list");
    setApprovedDetailBooking(null);
    setApprovedModalOpen(true);
    fetchApprovedDetails();
  };

  const backToApprovedList = () => {
    setApprovedModalView("list");
    setApprovedDetailBooking(null);
    setApprovedDetailLoading(false);
  };

  const closeEarnedModal = () => {
    setEarnedModalOpen(false);
    setEarnedModalView("list");
    setEarnedDetailBooking(null);
    setEarnedDetailLoading(false);
    setEarnedRowLoading(null);
    setEarnedPage(1);
    setEarnedSlideDir("next");
  };

  const openEarnedModal = () => {
    setEarnedModalView("list");
    setEarnedDetailBooking(null);
    setEarnedPage(1);
    setEarnedSlideDir("next");
    setEarnedModalOpen(true);
    fetchEarnedDetails();
  };

  const backToEarnedList = () => {
    setEarnedModalView("list");
    setEarnedDetailBooking(null);
    setEarnedDetailLoading(false);
    setEarnedRowLoading(null);
  };

  const closeSpentModal = () => {
    setSpentModalOpen(false);
    setSpentModalView("list");
    setSpentDetailBooking(null);
    setSpentDetailLoading(false);
    setSpentRowLoading(null);
    setSpentPage(1);
    setSpentSlideDir("next");
  };

  const openSpentModal = () => {
    setSpentModalView("list");
    setSpentDetailBooking(null);
    setSpentPage(1);
    setSpentSlideDir("next");
    setSpentModalOpen(true);
    fetchSpentDetails();
  };

  const backToSpentList = () => {
    setSpentModalView("list");
    setSpentDetailBooking(null);
    setSpentDetailLoading(false);
    setSpentRowLoading(null);
  };

  const changeEarnedPage = (next: number) => {
    setEarnedPage((current) => {
      if (next === current) return current;
      setEarnedSlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

  const changeSpentPage = (next: number) => {
    setSpentPage((current) => {
      if (next === current) return current;
      setSpentSlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

  const handleOpenApprovedBooking = async (bookingId: string) => {
    if (!session?.access_token) return;
    setDetailLoading(bookingId);
    setApprovedDetailLoading(true);
    setApprovedModalView("detail");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setApprovedModalView("list");
        return;
      }
      const data = await res.json();
      setApprovedDetailBooking({ booking: data as BookingDetail, role: "worker" });
    } catch {
      setApprovedModalView("list");
    } finally {
      setDetailLoading(null);
      setApprovedDetailLoading(false);
    }
  };

  const formatCompletedDate = (completedAt: string) =>
    new Date(completedAt).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

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
    setPendingDetailLoading(true);
    setPendingModalView("detail");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setPendingModalView("list");
        return;
      }
      const data = await res.json();
      setPendingDetailBooking({ booking: data as BookingDetail, role });
    } catch {
      setPendingModalView("list");
    } finally {
      setDetailLoading(null);
      setPendingDetailLoading(false);
    }
  };

  const hasPendingModalContent =
    (wallet?.pending_amount ?? 0) > 0 || workerHolds.length > 0 || disputeEligible.length > 0;

  const hasApprovedModalContent =
    (wallet?.available_for_payout ?? 0) > 0 || approvedItems.length > 0;

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

  useScrollLock(pendingModalOpen || approvedModalOpen || earnedModalOpen || spentModalOpen);

  const groupedTransactions = useMemo(
    () => groupWalletTransactions(transactions, t),
    [transactions, t],
  );
  const displayTransactions = useMemo(
    () => groupedTransactions.filter((tx) => transactionMatchesCategory(tx, txCategoryFilter)),
    [groupedTransactions, txCategoryFilter],
  );
  const filteredSelectionAmount = useMemo(
    () =>
      displayTransactions.reduce((sum, tx) => {
        const signed = tx.type === "credit" ? Number(tx.amount) : -Number(tx.amount);
        return sum + signed;
      }, 0),
    [displayTransactions],
  );
  const txTotalPages = Math.max(1, Math.ceil(displayTransactions.length / TX_PAGE_SIZE));
  const pagedTransactions = useMemo(() => {
    const start = (txPage - 1) * TX_PAGE_SIZE;
    return displayTransactions.slice(start, start + TX_PAGE_SIZE);
  }, [displayTransactions, txPage]);

  const earnedDisplayItems = useMemo(() => {
    const withType = earnedItems.map((item) => ({
      ...item,
      type: item.type ?? ("credit" as const),
    }));
    return groupWalletTransactions(withType, t);
  }, [earnedItems, t]);
  const earnedTotalPages = Math.max(1, Math.ceil(earnedDisplayItems.length / SUMMARY_MODAL_PAGE_SIZE));
  const pagedEarnedItems = useMemo(() => {
    const start = (earnedPage - 1) * SUMMARY_MODAL_PAGE_SIZE;
    return earnedDisplayItems.slice(start, start + SUMMARY_MODAL_PAGE_SIZE);
  }, [earnedDisplayItems, earnedPage]);

  const spentDisplayItems = useMemo(() => {
    const debits = spentItems.filter((item) => item.type === "debit");
    const refunds = spentItems.filter((item) => item.type === "credit");
    const groupedDebits = groupWalletTransactions(debits, t);
    const refundRows: DisplayWalletTransaction[] = refunds.map((tx) => ({
      ...tx,
      groupedIds: [tx.id],
      isGrouped: false,
      parts: [
        {
          label: tx.description,
          amount: Number(tx.amount),
          sortOrder: 0,
          category: "refund" as const,
        },
      ],
      categories: ["refund" as const],
    }));
    return [...groupedDebits, ...refundRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [spentItems, t]);
  const spentTotalPages = Math.max(1, Math.ceil(spentDisplayItems.length / SUMMARY_MODAL_PAGE_SIZE));
  const pagedSpentItems = useMemo(() => {
    const start = (spentPage - 1) * SUMMARY_MODAL_PAGE_SIZE;
    return spentDisplayItems.slice(start, start + SUMMARY_MODAL_PAGE_SIZE);
  }, [spentDisplayItems, spentPage]);

  useEffect(() => {
    setTxSlideDir("next");
    setTxPage(1);
  }, [period, txCategoryFilter]);

  const changeTxPage = (next: number) => {
    setTxPage((current) => {
      if (next === current) return current;
      setTxSlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

  const handleOpenEarnedBooking = async (tx: DisplayWalletTransaction) => {
    if (!tx.booking_id || !session?.access_token) return;
    setEarnedRowLoading(tx.id);
    setEarnedModalView("detail");
    setEarnedDetailLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${tx.booking_id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setEarnedModalView("list");
        return;
      }
      const data = await res.json();
      setEarnedDetailBooking({ booking: data as BookingDetail, role: "worker" });
    } catch {
      setEarnedModalView("list");
    } finally {
      setEarnedRowLoading(null);
      setEarnedDetailLoading(false);
    }
  };

  const handleOpenSpentBooking = async (tx: DisplayWalletTransaction) => {
    if (!tx.booking_id || !session?.access_token) return;
    setSpentRowLoading(tx.id);
    setSpentModalView("detail");
    setSpentDetailLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${tx.booking_id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setSpentModalView("list");
        return;
      }
      const data = await res.json();
      setSpentDetailBooking({ booking: data as BookingDetail, role: "client" });
    } catch {
      setSpentModalView("list");
    } finally {
      setSpentRowLoading(null);
      setSpentDetailLoading(false);
    }
  };

  useEffect(() => {
    if (txPage > txTotalPages) setTxPage(txTotalPages);
  }, [txPage, txTotalPages]);

  useEffect(() => {
    if (earnedPage > earnedTotalPages) setEarnedPage(earnedTotalPages);
  }, [earnedPage, earnedTotalPages]);

  useEffect(() => {
    if (spentPage > spentTotalPages) setSpentPage(spentTotalPages);
  }, [spentPage, spentTotalPages]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <WalletSkeleton />
        </main>
      </div>
    );
  }

  const currentPeriodLabel = t(PERIODS.find((p) => p.key === period)?.labelKey ?? "wallet.last2weeks");
  const currentCategoryLabel = t(
    TX_CATEGORY_FILTERS.find((c) => c.key === txCategoryFilter)?.labelKey ?? "wallet.txFilterAll",
  );

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10 space-y-5">

        {/* Page title */}
        <h1 className="text-2xl font-bold text-gray-900">{t("wallet.title")}</h1>

        {/* Payout setup / bank account management */}
        {session?.access_token && (
          <StripePayoutSetup
            accessToken={session.access_token}
            initialStatus={connectStatus}
            title={connectStatus?.charges_enabled ? t("wallet.managePayoutAccount") : t("wallet.receivePayments")}
            subtitle={connectStatus?.charges_enabled ? t("wallet.managePayoutAccountDesc") : t("wallet.connectBankDesc")}
            onStatusChange={(status) => {
              setConnectStatus(status);
              if (user?.id) {
                try {
                  sessionStorage.setItem(`wallet-connect-${user.id}`, JSON.stringify(status));
                } catch {}
              }
            }}
          />
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
                <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                  <p className="text-xl font-bold text-green-700">{fmt(wallet?.available_for_payout ?? 0)}&nbsp;$</p>
                  {hasApprovedModalContent && (
                    <button
                      type="button"
                      onClick={openApprovedModal}
                      className="text-xs text-green-700 hover:text-green-900 hover:underline cursor-pointer font-medium whitespace-nowrap"
                    >
                      {t("wallet.viewApprovedDetail")} →
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{t("wallet.approvedAmountDesc")}</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wallet.pendingAmountLabel")}</p>
                </div>
                <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                  <p className="text-xl font-bold text-amber-600">{fmt(wallet?.pending_amount ?? 0)}&nbsp;$</p>
                  {hasPendingModalContent && (
                    <button
                      type="button"
                      onClick={openPendingModal}
                      className="text-xs text-amber-700 hover:text-amber-900 hover:underline cursor-pointer font-medium whitespace-nowrap"
                    >
                      {t("wallet.viewPendingDetail")} →
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{t("wallet.pendingAmountDesc")}</p>
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
                <button
                  type="button"
                  onClick={openEarnedModal}
                  className="text-xs text-green-700 hover:text-green-900 hover:underline mt-1 font-medium cursor-pointer"
                >
                  {t("wallet.viewPendingDetail")} →
                </button>
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
                <button
                  type="button"
                  onClick={openSpentModal}
                  className="text-xs text-red-700 hover:text-red-900 hover:underline mt-1 font-medium cursor-pointer"
                >
                  {t("wallet.viewPendingDetail")} →
                </button>
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
        <Card id="wallet-transaction-history" className="shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5 space-y-2.5">
            <CardTitle className="text-base font-semibold text-gray-900">
              {t("wallet.transactionHistory")}
            </CardTitle>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="wallet-period-filter" className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {t("wallet.periodFilterLabel")}
                </Label>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" id="wallet-period-filter" className={WALLET_FILTER_TRIGGER_CLASS}>
                      <span className="truncate">{currentPeriodLabel}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem]"
                  >
                    {PERIODS.map((p) => (
                      <DropdownMenuItem
                        key={p.key}
                        className="cursor-pointer text-sm"
                        onClick={() => setPeriod(p.key)}
                      >
                        {t(p.labelKey)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="wallet-tx-type-filter" className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {t("wallet.txFilterLabel")}
                </Label>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" id="wallet-tx-type-filter" className={WALLET_FILTER_TRIGGER_CLASS}>
                      <span className="truncate">{currentCategoryLabel}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem]"
                  >
                    {TX_CATEGORY_FILTERS.map((c) => (
                      <DropdownMenuItem
                        key={c.key}
                        className="cursor-pointer text-sm"
                        onClick={() => setTxCategoryFilter(c.key)}
                      >
                        {t(c.labelKey)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                {t("wallet.txSelectionTotalLabel", {
                  period: currentPeriodLabel,
                  category: currentCategoryLabel,
                })}
              </p>
              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    filteredSelectionAmount >= 0 ? "text-green-700" : "text-red-600",
                  )}
                >
                  {filteredSelectionAmount >= 0 ? "+" : "−"}
                  {fmt(Math.abs(filteredSelectionAmount))}&nbsp;$
                </p>
                <p className="text-[11px] text-gray-400">
                  {t("wallet.txSelectionCount", { count: displayTransactions.length })}
                </p>
              </div>
            </div>
          </CardHeader>

          <Separator />

          {txLoading ? (
            <WalletTransactionListSkeleton rows={3} />
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
          ) : displayTransactions.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Clock className="h-7 w-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">
                {t("wallet.noTransactionsInCategory", { category: currentCategoryLabel })}
              </p>
              <button
                type="button"
                onClick={() => setTxCategoryFilter("all")}
                className="text-sm text-green-700 hover:underline mt-3"
              >
                {t("wallet.txFilterShowAll")}
              </button>
            </CardContent>
          ) : (
            <div className="overflow-hidden">
              <ul
                key={txPage}
                className={cn(
                  "divide-y divide-gray-100",
                  "animate-in fade-in-0 duration-300 ease-out",
                  txSlideDir === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
                )}
              >
              {pagedTransactions.map((tx) => {
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
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "credit" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {isPayout
                      ? <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                      : tx.type === "credit"
                        ? <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        : <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
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
                        ? <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </li>
                );
              })}
              </ul>
            </div>
          )}

          {!txLoading && displayTransactions.length > 0 && txTotalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
              <button
                type="button"
                disabled={txPage <= 1}
                onClick={() => changeTxPage(Math.max(1, txPage - 1))}
                aria-label={t("wallet.txPrevPage")}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("wallet.txPrevPage")}
              </button>
              <span className="text-xs text-gray-500 tabular-nums">
                {t("wallet.txPageOf", { page: txPage, total: txTotalPages })}
              </span>
              <button
                type="button"
                disabled={txPage >= txTotalPages}
                onClick={() => changeTxPage(Math.min(txTotalPages, txPage + 1))}
                aria-label={t("wallet.txNextPage")}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("wallet.txNextPage")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </Card>

      </main>

      {/* Pending / dispute detail modal — portaled for reliable mobile centering */}
      {pendingModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center p-4 min-h-[100dvh]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePendingModal}
            aria-hidden
          />
          <div className={walletModalShellClass(pendingModalView === "detail")}>
            <div
              className={cn(
                "flex min-h-0 w-[200%] transition-transform",
                WALLET_MODAL_EASE,
                pendingModalView === "detail" ? "-translate-x-1/2" : "translate-x-0",
              )}
            >
              {/* Panel — list */}
              <div className="w-1/2 shrink-0 flex flex-col min-h-0 h-full max-h-[min(85dvh,calc(100dvh-2rem))]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                  <h2 className="text-base font-semibold text-gray-900">{t("wallet.pendingModalTitle")}</h2>
                  <button
                    type="button"
                    title={t("serviceDetail.close")}
                    onClick={closePendingModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                  {pendingDetailsLoading ? (
                    <WalletModalListSkeleton />
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
                                    ? <Skeleton className="h-4 w-4 rounded-full shrink-0" />
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
                                    ? <Skeleton className="h-4 w-4 rounded-full shrink-0" />
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

              {/* Panel — booking detail (slide in) */}
              <div className="w-1/2 shrink-0 flex flex-col min-h-0 h-full max-h-[min(85dvh,calc(100dvh-2rem))]">
                {pendingModalView === "detail" && (
                  pendingDetailLoading ? (
                    <WalletDetailLoadingPanel
                      onBack={backToPendingList}
                      backLabel={t("wallet.pendingModalTitle")}
                    />
                  ) : pendingDetailBooking && session?.access_token ? (
                    <BookingDetailModal
                      embedded
                      embeddedBackLabel={t("wallet.pendingModalTitle")}
                      booking={pendingDetailBooking.booking}
                      userRole={pendingDetailBooking.role}
                      accessToken={session.access_token}
                      onClose={closePendingModal}
                      onBack={backToPendingList}
                      onUpdated={(id, updates) => {
                        setPendingDetailBooking((prev) =>
                          prev ? { ...prev, booking: { ...prev.booking, ...updates } } : prev,
                        );
                        fetchPendingDetails();
                      }}
                      onMessage={(userId) => {
                        closePendingModal();
                        startConversation(userId);
                      }}
                    />
                  ) : null
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Approved payout detail modal */}
      {approvedModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center p-4 min-h-[100dvh]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeApprovedModal}
            aria-hidden
          />
          <div className={walletModalShellClass(approvedModalView === "detail")}>
            <div
              className={cn(
                "flex min-h-0 w-[200%] transition-transform",
                WALLET_MODAL_EASE,
                approvedModalView === "detail" ? "-translate-x-1/2" : "translate-x-0",
              )}
            >
              <div className="w-1/2 shrink-0 flex flex-col min-h-0 h-full max-h-[min(85dvh,calc(100dvh-2rem))]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                  <h2 className="text-base font-semibold text-gray-900">{t("wallet.approvedModalTitle")}</h2>
                  <button
                    type="button"
                    title={t("serviceDetail.close")}
                    onClick={closeApprovedModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                  {approvedDetailsLoading ? (
                    <WalletModalListSkeleton />
                  ) : approvedItems.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-gray-400">{t("wallet.noApprovedItems")}</p>
                  ) : (
                    <div className="px-5 py-4">
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">{t("wallet.approvedSectionHint")}</p>
                      <ul className="space-y-2">
                        {approvedItems.map((item) => (
                          <li key={item.booking_id}>
                            <button
                              type="button"
                              onClick={() => handleOpenApprovedBooking(item.booking_id)}
                              className="w-full flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.listing_title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {t("wallet.from")} {item.other_user_name}
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">
                                  {t("wallet.completedOn", { date: formatCompletedDate(item.completed_at) })}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-green-700 shrink-0">+{fmt(item.amount)} $</span>
                              {detailLoading === item.booking_id
                                ? <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                              }
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-1/2 shrink-0 flex flex-col min-h-0 h-full max-h-[min(85dvh,calc(100dvh-2rem))]">
                {approvedModalView === "detail" && (
                  approvedDetailLoading ? (
                    <WalletDetailLoadingPanel
                      onBack={backToApprovedList}
                      backLabel={t("wallet.approvedModalTitle")}
                    />
                  ) : approvedDetailBooking && session?.access_token ? (
                    <BookingDetailModal
                      embedded
                      embeddedBackLabel={t("wallet.approvedModalTitle")}
                      booking={approvedDetailBooking.booking}
                      userRole={approvedDetailBooking.role}
                      accessToken={session.access_token}
                      onClose={closeApprovedModal}
                      onBack={backToApprovedList}
                      onUpdated={(id, updates) => {
                        setApprovedDetailBooking((prev) =>
                          prev ? { ...prev, booking: { ...prev.booking, ...updates } } : prev,
                        );
                        fetchApprovedDetails();
                      }}
                      onMessage={(userId) => {
                        closeApprovedModal();
                        startConversation(userId);
                      }}
                    />
                  ) : null
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <WalletSummaryModal
        open={earnedModalOpen}
        onClose={closeEarnedModal}
        title={t("wallet.earnedModalTitle")}
        hint={t("wallet.earnedModalHint")}
        total={wallet?.total_earned ?? 0}
        variant="earned"
        view={earnedModalView}
        items={pagedEarnedItems}
        loading={earnedDetailsLoading}
        page={earnedPage}
        totalPages={earnedTotalPages}
        slideDir={earnedSlideDir}
        onPageChange={changeEarnedPage}
        onItemClick={handleOpenEarnedBooking}
        itemLoadingId={earnedRowLoading}
        detailBooking={earnedDetailBooking}
        detailLoading={earnedDetailLoading}
        onBack={backToEarnedList}
        accessToken={session?.access_token}
        onBookingUpdated={(id, updates) => {
          setEarnedDetailBooking((prev) =>
            prev ? { ...prev, booking: { ...prev.booking, ...updates } } : prev,
          );
          fetchEarnedDetails();
        }}
        onMessage={(userId) => {
          closeEarnedModal();
          startConversation(userId);
        }}
        lang={lang}
        t={t}
      />

      <WalletSummaryModal
        open={spentModalOpen}
        onClose={closeSpentModal}
        title={t("wallet.spentModalTitle")}
        hint={t("wallet.spentModalHint")}
        total={wallet?.total_spent ?? 0}
        variant="spent"
        view={spentModalView}
        items={pagedSpentItems}
        loading={spentDetailsLoading}
        page={spentPage}
        totalPages={spentTotalPages}
        slideDir={spentSlideDir}
        onPageChange={changeSpentPage}
        onItemClick={handleOpenSpentBooking}
        itemLoadingId={spentRowLoading}
        detailBooking={spentDetailBooking}
        detailLoading={spentDetailLoading}
        onBack={backToSpentList}
        accessToken={session?.access_token}
        onBookingUpdated={(id, updates) => {
          setSpentDetailBooking((prev) =>
            prev ? { ...prev, booking: { ...prev.booking, ...updates } } : prev,
          );
          fetchSpentDetails();
        }}
        onMessage={(userId) => {
          closeSpentModal();
          startConversation(userId);
        }}
        lang={lang}
        t={t}
      />

      {/* Payout detail modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">{t("wallet.payoutDetails")}</h2>
              <button
                type="button"
                title={t("serviceDetail.close")}
                onClick={() => setPayoutModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
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
                    ? <Skeleton className="h-4 w-4 rounded-full shrink-0" />
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
