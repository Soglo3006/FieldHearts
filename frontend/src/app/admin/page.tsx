"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminPortal } from "@/lib/auth";
import { adminApiHeaders } from "@/lib/adminStepUp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const { t } = useTranslation();
  const [allowed, setAllowed] = useState(false);
  const [openDisputes, setOpenDisputes] = useState<number | null>(null);
  const [openTickets, setOpenTickets] = useState<number | null>(null);
  const [exportPeriod, setExportPeriod] = useState("all");
  const [exportLoading, setExportLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!canAccessAdminPortal(user)) { router.replace("/"); return; }
    Promise.resolve().then(() => setAllowed(true));
  }, [user, loading, router]);

  useEffect(() => {
    if (!allowed || !session?.access_token) return;

    const headers = adminApiHeaders(session.access_token);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes`, { headers })
      .then((r) => r.json())
      .then((data) => setOpenDisputes(Array.isArray(data) ? data.filter((d: { status?: string }) => d.status === "open").length : 0))
      .catch(() => setOpenDisputes(0));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/support`, { headers })
      .then((r) => r.json())
      .then((data) => setOpenTickets(Array.isArray(data) ? data.filter((t: { status?: string }) => t.status === "open").length : 0))
      .catch(() => setOpenTickets(0));
  }, [allowed, session]);

  const handleExport = async () => {
    if (!session?.access_token) return;
    setExportLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/wallet/export?period=${exportPeriod}`,
        { headers: adminApiHeaders(session.access_token) }
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions_${exportPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setExportLoading(false);
    }
  };

  const handleTriggerPayout = async () => {
    if (!session?.access_token) return;
    if (!window.confirm(t("admin.dashboard.payout.confirm"))) return;
    setPayoutLoading(true);
    setPayoutMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/payout/trigger`, {
        method: "POST",
        headers: adminApiHeaders(session.access_token),
      });
      if (res.ok) {
        setPayoutMessage(t("admin.dashboard.payout.success"));
      } else {
        const data = await res.json().catch(() => ({}));
        setPayoutMessage(t("admin.dashboard.payout.errorWithReason", { reason: data.message ?? res.status }));
      }
    } catch {
      setPayoutMessage(t("admin.dashboard.payout.error"));
    } finally {
      setPayoutLoading(false);
    }
  };

  const EXPORT_PERIODS = [
    { value: "2weeks", label: t("admin.dashboard.export.periods.2weeks") },
    { value: "1month", label: t("admin.dashboard.export.periods.1month") },
    { value: "3months", label: t("admin.dashboard.export.periods.3months") },
    { value: "6months", label: t("admin.dashboard.export.periods.6months") },
    { value: "1year", label: t("admin.dashboard.export.periods.1year") },
    { value: "all", label: t("admin.dashboard.export.periods.all") },
  ];

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const sections = [
    {
      href: "/admin/disputes",
      label: t("admin.dashboard.sections.disputes.label"),
      description: t("admin.dashboard.sections.disputes.description"),
      count: openDisputes,
      countLabel: t("admin.status.openCount"),
      color: "green",
    },
    {
      href: "/admin/support",
      label: t("admin.dashboard.sections.support.label"),
      description: t("admin.dashboard.sections.support.description"),
      count: openTickets,
      countLabel: t("admin.status.openCount"),
      color: "green",
    },
    {
      href: "/admin/users",
      label: t("admin.dashboard.sections.users.label"),
      description: t("admin.dashboard.sections.users.description"),
      count: null,
      countLabel: "",
      color: "green",
    },
    {
      href: "/admin/emails",
      label: t("admin.dashboard.sections.emails.label"),
      description: t("admin.dashboard.sections.emails.description"),
      count: null,
      countLabel: "",
      color: "green",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("admin.dashboard.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("admin.dashboard.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map(({ href, label, description, count, countLabel }) => (
          <Link key={href} href={href}>
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border hover:border-green-200 group">
              <div className="flex items-start justify-between mb-4">
                {count !== null && count > 0 && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                    {count} {countLabel}
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-gray-900 mb-1">{label}</h2>
              <p className="text-sm text-gray-500 mb-4">{description}</p>
              <div className="flex items-center gap-1 text-sm text-green-700 font-medium group-hover:gap-2 transition-all">
                {t("admin.dashboard.goToSection", { label })} <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Manual Payout Trigger */}
      <div className="mt-4">
        <Card className="p-6 border">
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">{t("admin.dashboard.payout.title")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {t("admin.dashboard.payout.description")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleTriggerPayout}
              disabled={payoutLoading}
              className="bg-green-700 hover:bg-green-800 text-white gap-2"
            >
              {payoutLoading ? t("admin.dashboard.payout.processing") : t("admin.dashboard.payout.trigger")}
            </Button>
            {payoutMessage && (
              <span className="text-sm font-medium text-gray-700">{payoutMessage}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Transaction Export */}
      <div className="mt-6">
        <Card className="p-6 border">
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">{t("admin.dashboard.export.title")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {t("admin.dashboard.export.description")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={exportPeriod}
              onChange={(e) => setExportPeriod(e.target.value)}
              title={t("admin.dashboard.export.periodLabel")}
              aria-label={t("admin.dashboard.export.periodLabel")}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {EXPORT_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <Button
              onClick={handleExport}
              disabled={exportLoading}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Download className="h-4 w-4" />
              {exportLoading ? t("admin.dashboard.export.generating") : t("admin.dashboard.export.download")}
            </Button>
          </div>
        </Card>
      </div>

      {/* Waitlist export */}
      <div className="mt-4">
        <Card className="p-6 border">
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">{t("admin.dashboard.waitlist.title")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {t("admin.dashboard.waitlist.description")}
              </p>
            </div>
          </div>
          <Button
            onClick={async () => {
              if (!session?.access_token) return;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/waitlist/export`, {
                headers: adminApiHeaders(session.access_token),
              });
              if (!res.ok) return;
              const data: { email: string; lang: string; created_at: string }[] = await res.json();
              if (!Array.isArray(data) || data.length === 0) return;
              const csv = ["email,lang,date", ...data.map((r) => `"${r.email}","${r.lang}","${r.created_at}"`)].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `waitlist_${new Date().toISOString().slice(0, 10)}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="bg-green-700 hover:bg-green-800 text-white gap-2"
          >
            <Download className="h-4 w-4" />
            {t("admin.dashboard.waitlist.download")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
