"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, ChevronRight, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("fr-CA", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

function formatPayoutDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("fr-CA", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function fmt(n: number) {
  return Number(n).toFixed(2);
}

export default function WalletPage() {
  const { t } = useTranslation();
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("2weeks");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!session?.access_token) return;

    const headers = { Authorization: `Bearer ${session.access_token}` };
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/transactions?period=${period}`, { headers }).then((r) => r.json()),
    ])
      .then(([walletData, txData]) => {
        setWallet(walletData);
        setTransactions(Array.isArray(txData) ? txData : []);
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

  const currentPeriodLabel = t(PERIODS.find((p) => p.key === period)?.labelKey ?? "wallet.last2weeks");

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-3xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-40" />
            <div className="h-32 bg-gray-200 rounded-2xl" />
            <div className="h-64 bg-gray-100 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("wallet.title")}</h1>

        {/* Top summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:col-span-1 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <Wallet className="h-6 w-6 text-green-700" />
            </div>
            <p className="text-xs text-gray-500 mb-1">{t("wallet.availableBalance")}</p>
            <p className="text-3xl font-extrabold text-green-700">${fmt(wallet?.balance ?? 0)}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <ArrowDownCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t("wallet.totalEarned")}</p>
              <p className="text-xl font-bold text-gray-900">${fmt(wallet?.total_earned ?? 0)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <ArrowUpCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t("wallet.totalSpent")}</p>
              <p className="text-xl font-bold text-gray-900">${fmt(wallet?.total_spent ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Payout breakdown */}
        {(wallet?.available_for_payout ?? 0) > 0 || (wallet?.pending_amount ?? 0) > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-700" />
              <h2 className="text-base font-semibold text-gray-900">{t("wallet.nextPayout")}</h2>
            </div>
            <div className="px-6 py-4 space-y-3">

              {/* Available for payout */}
              {(wallet?.available_for_payout ?? 0) > 0 && (
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-900">{t("wallet.youWillReceive")}</span>
                  <span className="text-green-700">${fmt(wallet?.available_for_payout ?? 0)}</span>
                </div>
              )}

              {/* Pending */}
              {(wallet?.pending_amount ?? 0) > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 mt-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    {t("wallet.pendingInfo", { amount: fmt(wallet?.pending_amount ?? 0) })}
                  </p>
                </div>
              )}

              {/* Next payout date */}
              {wallet?.next_payout_date && (
                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="text-gray-500">{t("wallet.nextPayoutDate")}</span>
                  <span className="font-medium text-gray-800">{formatPayoutDate(wallet.next_payout_date)}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Transaction history */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 mb-3">{t("wallet.transactionHistory")}</h2>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={period === p.key ? "default" : "outline"}
                  onClick={() => setPeriod(p.key)}
                  className={`text-xs px-3 py-1 h-auto ${period === p.key ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                >
                  {t(p.labelKey)}
                </Button>
              ))}
            </div>
          </div>

          {txLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Clock className="h-10 w-10 mb-3 text-gray-300" />
              <p className="font-bold text-gray-700">
                {period === "all"
                  ? t("wallet.noTransactions")
                  : t("wallet.noTransactionsInPeriod", { period: currentPeriodLabel })}
              </p>
              <Link href="/listings" className="text-sm text-green-700 hover:underline mt-4">
                {t("wallet.browseListings")}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.type === "credit" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {tx.type === "credit"
                      ? <ArrowDownCircle className="h-5 w-5 text-green-600" />
                      : <ArrowUpCircle className="h-5 w-5 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.listing_title ?? tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {tx.other_user_name && (
                        <span className="text-xs text-gray-500">
                          {tx.type === "credit" ? t("wallet.from") : t("wallet.to")} {tx.other_user_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{formatDate(tx.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-base font-bold ${
                      tx.type === "credit" ? "text-green-700" : "text-red-600"
                    }`}>
                      {tx.type === "credit" ? "+" : "−"}${fmt(tx.amount)}
                    </span>
                    {tx.booking_id && (
                      <Link href="/bookings">
                        <ChevronRight className="h-4 w-4 text-gray-300 hover:text-gray-500" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
