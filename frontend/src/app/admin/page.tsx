"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, HeadphonesIcon, ArrowRight, Download } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminDashboard() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
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
    if (!isAdminUser(user)) { router.replace("/"); return; }
    Promise.resolve().then(() => setAllowed(true));
  }, [user, loading, router]);

  useEffect(() => {
    if (!allowed || !session?.access_token) return;

    const headers = { Authorization: `Bearer ${session.access_token}` };

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
        { headers: { Authorization: `Bearer ${session.access_token}` } }
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
    if (!window.confirm("Déclencher le versement bi-mensuel pour tous les utilisateurs éligibles ?")) return;
    setPayoutLoading(true);
    setPayoutMessage("");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/payout/trigger`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setPayoutMessage("Versements traités avec succès.");
    } catch {
      setPayoutMessage("Erreur lors du traitement des versements.");
    } finally {
      setPayoutLoading(false);
    }
  };

  const EXPORT_PERIODS = [
    { value: "2weeks",  label: "2 dernières semaines" },
    { value: "1month",  label: "Dernier mois" },
    { value: "3months", label: "3 derniers mois" },
    { value: "6months", label: "6 derniers mois" },
    { value: "1year",   label: "Dernière année" },
    { value: "all",     label: "Toutes" },
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
      label: "Disputes",
      description: "Manage booking disputes between clients and workers.",
      icon: Scale,
      count: openDisputes,
      countLabel: "open",
      color: "amber",
    },
    {
      href: "/admin/support",
      label: "Support",
      description: "View and respond to user support tickets.",
      icon: HeadphonesIcon,
      count: openTickets,
      countLabel: "open",
      color: "blue",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of pending actions.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map(({ href, label, description, icon: Icon, count, countLabel, color }) => (
          <Link key={href} href={href}>
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border hover:border-green-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${color === "amber" ? "bg-amber-50" : "bg-blue-50"}`}>
                  <Icon className={`h-5 w-5 ${color === "amber" ? "text-amber-600" : "text-blue-600"}`} />
                </div>
                {count !== null && count > 0 && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    color === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {count} {countLabel}
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-gray-900 mb-1">{label}</h2>
              <p className="text-sm text-gray-500 mb-4">{description}</p>
              <div className="flex items-center gap-1 text-sm text-green-700 font-medium group-hover:gap-2 transition-all">
                Go to {label} <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Manual Payout Trigger */}
      <div className="mt-4">
        <Card className="p-6 border">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-50">
              <Download className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Versements bi-mensuels</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Déclencher manuellement le versement pour tous les utilisateurs éligibles (5+ jours ouvrables).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleTriggerPayout}
              disabled={payoutLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {payoutLoading ? "Traitement..." : "Déclencher les versements"}
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
            <div className="p-2 rounded-lg bg-green-50">
              <Download className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Export des transactions</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Téléchargez l'historique de toutes les transactions en CSV (pour les taxes et la comptabilité).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={exportPeriod}
              onChange={(e) => setExportPeriod(e.target.value)}
              title="Période d'export"
              aria-label="Période d'export"
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
              {exportLoading ? "Génération..." : "Télécharger CSV"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Waitlist export */}
      <div className="mt-4">
        <Card className="p-6 border">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Liste d&apos;attente (Coming Soon)</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Téléchargez les adresses courriel collectées pendant la période &quot;Coming Soon&quot;.
              </p>
            </div>
          </div>
          <Button
            onClick={async () => {
              if (!session?.access_token) return;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/waitlist/export`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
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
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Download className="h-4 w-4" />
            Télécharger la liste d&apos;attente
          </Button>
        </Card>
      </div>
    </div>
  );
}
