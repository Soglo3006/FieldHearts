"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { RefreshCw, Scale, ExternalLink } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/auth";
import { getIntlLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/Spinner";

type DisputeStatus = "open" | "resolved" | "rejected";

type DisputeSummary = {
  id: string;
  status: DisputeStatus;
  description: string;
  resolution: string | null;
  created_at: string;
  booking_id: string;
  service_title: string;
  service_price: number;
  client_name: string;
  client_email: string;
  worker_name: string;
  worker_email: string;
  raised_by_name: string;
  raised_by: string;
  booking_status: string;
  payment_status: string | null;
  message_count: number;
};

const STATUS_STYLES: Record<DisputeStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminDisputesPage() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });

  const [allowed, setAllowed] = useState(false);
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!isAdminUser(user)) { router.replace("/"); return; }
    setAllowed(true);
  }, [loading, router, user]);

  const fetchDisputes = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error();
      setDisputes(await res.json());
    } catch {
      setDisputes([]);
    } finally {
      setFetching(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (allowed) fetchDisputes();
  }, [allowed, fetchDisputes]);

  const filtered = useMemo(() => {
    let list = [...disputes];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((dispute) => (
        dispute.service_title.toLowerCase().includes(q)
        || dispute.client_name.toLowerCase().includes(q)
        || dispute.worker_name.toLowerCase().includes(q)
        || dispute.client_email.toLowerCase().includes(q)
        || dispute.worker_email.toLowerCase().includes(q)
        || dispute.description.toLowerCase().includes(q)
      ));
    }

    if (statusFilter !== "all") {
      list = list.filter((dispute) => dispute.status === statusFilter);
    }

    list.sort((left, right) => {
      const diff = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return sort === "newest" ? diff : -diff;
    });

    return list;
  }, [disputes, search, sort, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCount = disputes.filter((dispute) => dispute.status === "open").length;

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t("admin.disputes.title")}</h1>
              {openCount > 0 && (
                <Badge className="bg-green-600 text-white">{t("admin.disputes.openCount", { count: openCount })}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={t("admin.disputes.searchPlaceholder")}
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              className="w-56 bg-white"
            />
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-36 bg-white"><SelectValue placeholder={t("admin.disputes.statusPlaceholder")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.disputes.allStatuses")}</SelectItem>
                <SelectItem value="open">{t("admin.status.open")}</SelectItem>
                <SelectItem value="resolved">{t("admin.status.resolved")}</SelectItem>
                <SelectItem value="rejected">{t("admin.status.rejected")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-36 bg-white"><SelectValue placeholder={t("admin.disputes.sortPlaceholder")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("admin.disputes.newestFirst")}</SelectItem>
                <SelectItem value="oldest">{t("admin.disputes.oldestFirst")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 bg-white" onClick={fetchDisputes} disabled={fetching}>
              <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
              {t("admin.disputes.refresh")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t("admin.disputes.total"), count: disputes.length, style: "bg-white border" },
            { label: t("admin.status.open"), count: disputes.filter((d) => d.status === "open").length, style: "bg-amber-50 border border-amber-200" },
            { label: t("admin.status.resolved"), count: disputes.filter((d) => d.status === "resolved").length, style: "bg-green-50 border border-green-200" },
          ].map(({ label, count, style }) => (
            <Card key={label} className={`p-4 text-center ${style}`}>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </Card>
          ))}
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : paginated.length === 0 ? (
          <Card className="p-12 text-center">
            <Scale className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t("admin.disputes.noDisputes")}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginated.map((dispute) => (
              <Card key={dispute.id} className="p-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{dispute.service_title}</span>
                      <Badge className={STATUS_STYLES[dispute.status]}>{t(`admin.status.${dispute.status}`)}</Badge>
                      <Badge variant="outline">{t("admin.disputes.messageCount", { count: dispute.message_count })}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <p>
                        <span className="font-medium">{t("admin.disputes.clientLabel")}</span> {dispute.client_name} ({dispute.client_email})
                        &nbsp;·&nbsp;
                        <span className="font-medium">{t("admin.disputes.workerLabel")}</span> {dispute.worker_name} ({dispute.worker_email})
                      </p>
                      <p>
                        <span className="font-medium">{t("admin.disputes.raisedByLabel")}</span> {dispute.raised_by_name}
                        &nbsp;·&nbsp;
                        {new Date(dispute.created_at).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{dispute.description}</p>
                    {dispute.resolution && (
                      <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mt-2">
                        <span className="font-semibold">{t("admin.disputes.resolutionLabel")}</span> {dispute.resolution}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Link href={`/admin/bookings/${dispute.booking_id}`}>
                      <Button size="sm" className="gap-1 bg-green-700 hover:bg-green-800 text-white text-xs">
                        {t("admin.disputes.viewDisputeButton", { defaultValue: "Voir le litige" })}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>{t("admin.pagination.first")}</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((v) => v - 1)}>{t("admin.pagination.prev")}</Button>
              <span className="text-sm text-gray-600">{t("admin.pagination.pageOf", { page, total: totalPages })}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((v) => v + 1)}>{t("admin.pagination.next")}</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>{t("admin.pagination.last")}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
