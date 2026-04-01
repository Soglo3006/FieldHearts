"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "../../../lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RefreshCw, Scale, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "react-i18next";

type Dispute = {
  id: string;
  status: string;
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
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  resolved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminDisputesPage() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const [allowed, setAllowed] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [refundClient, setRefundClient] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!isAdminUser(user)) { router.replace("/"); return; }
    setAllowed(true);
  }, [user, loading, router]);

  const fetchDisputes = async () => {
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
  };

  useEffect(() => { if (allowed) fetchDisputes(); }, [allowed, session]);

  const filtered = useMemo(() => {
    let list = [...disputes];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.service_title.toLowerCase().includes(q) ||
          d.client_name.toLowerCase().includes(q) ||
          d.worker_name.toLowerCase().includes(q) ||
          d.client_email.toLowerCase().includes(q) ||
          d.worker_email.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((d) => d.status === statusFilter);
    list.sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sort === "newest" ? diff : -diff;
    });
    return list;
  }, [disputes, search, statusFilter, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = (d: Dispute) => {
    setSelected(d);
    setResolution(d.resolution || "");
    setNewStatus(d.status);
    setSaveError("");
    setRefundClient(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${selected.id}/admin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus, resolution, refund_client: refundClient }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setDisputes((prev) => prev.map((d) => (d.id === updated.id ? { ...d, status: updated.status, resolution: updated.resolution } : d)));
      setSelected(null);
    } catch {
      setSaveError(t("admin.disputes.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const openCount = disputes.filter((d) => d.status === "open").length;
  const locale = i18n.language?.startsWith("fr") ? "fr-CA" : "en-CA";
  const getStatusLabel = (status: string) => {
    const key = status === "resolved"
      ? "resolved"
      : status === "rejected"
        ? "rejected"
        : "open";

    return t(`admin.status.${key}`);
  };

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-5">
        {/* Header */}
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-56 bg-white"
            />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t("admin.disputes.total"), count: disputes.length, style: "bg-white border" },
            { label: t("admin.status.open"), count: disputes.filter((d) => d.status === "open").length, style: "bg-green-50 border border-green-200" },
            { label: t("admin.status.resolved"), count: disputes.filter((d) => d.status === "resolved").length, style: "bg-green-50 border border-green-200" },
          ].map(({ label, count, style }) => (
            <Card key={label} className={`p-4 text-center ${style}`}>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </Card>
          ))}
        </div>

        {/* Table */}
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
            {paginated.map((d) => (
              <Card key={d.id} className="p-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{d.service_title}</span>
                      <Badge className={STATUS_STYLES[d.status] || "bg-gray-100 text-gray-700"}>
                        {getStatusLabel(d.status)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <p>
                        <span className="font-medium">{t("admin.disputes.clientLabel")}</span> {d.client_name} ({d.client_email})
                        &nbsp;·&nbsp;
                        <span className="font-medium">{t("admin.disputes.workerLabel")}</span> {d.worker_name} ({d.worker_email})
                      </p>
                      <p>
                        <span className="font-medium">{t("admin.disputes.raisedByLabel")}</span> {d.raised_by_name}
                        &nbsp;·&nbsp;
                        {new Date(d.created_at).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{d.description}</p>
                    {d.resolution && (
                      <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mt-2">
                        <span className="font-semibold">{t("admin.disputes.resolutionLabel")}</span> {d.resolution}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/bookings?highlight=${d.booking_id}`} target="_blank">
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> {t("admin.disputes.bookingButton")}
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="bg-green-700 hover:bg-green-800 text-white"
                      onClick={() => openDetail(d)}
                    >
                      {d.status === "open" ? t("admin.disputes.resolveButton") : t("common.edit")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>{t("admin.pagination.first")}</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("admin.pagination.prev")}</Button>
              <span className="text-sm text-gray-600">{t("admin.pagination.pageOf", { page, total: totalPages })}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{t("admin.pagination.next")}</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>{t("admin.pagination.last")}</Button>
            </div>
          </div>
        )}
      </div>

      {/* Resolve dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.disputes.dialogTitle", { title: selected?.service_title ?? "" })}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div><span className="font-semibold">{t("admin.disputes.clientLabel")}</span> {selected.client_name}</div>
                <div><span className="font-semibold">{t("admin.disputes.workerLabel")}</span> {selected.worker_name}</div>
                <div><span className="font-semibold">{t("admin.disputes.raisedByLabel")}</span> {selected.raised_by_name}</div>
                <div><span className="font-semibold">{t("admin.disputes.dateLabel")}</span> {new Date(selected.created_at).toLocaleDateString(locale)}</div>
              </div>

              <div>
                <Label className="font-semibold text-gray-800">{t("admin.disputes.descriptionLabel")}</Label>
                <div className="mt-1 p-3 bg-gray-50 border rounded-lg text-gray-700 whitespace-pre-wrap">
                  {selected.description}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="font-semibold text-gray-800">{t("admin.disputes.decisionLabel")}</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t("admin.disputes.decisionOpen")}</SelectItem>
                    <SelectItem value="resolved">{t("admin.disputes.decisionResolved")}</SelectItem>
                    <SelectItem value="rejected">{t("admin.disputes.decisionRejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution" className="font-semibold text-gray-800">
                  {t("admin.disputes.resolutionNotes")} <span className="text-gray-400 font-normal">({t("admin.disputes.visibleToBoth")})</span>
                </Label>
                <Textarea
                  id="resolution"
                  placeholder={t("admin.disputes.explainDecision")}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              </div>

              {newStatus === "resolved" && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={refundClient}
                    onChange={(e) => setRefundClient(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-green-700"
                  />
                  <span className="text-sm font-medium text-gray-800">{t("admin.disputes.refundClient")}</span>
                </label>
              )}

              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{saveError}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>{t("common.cancel")}</Button>
            <Button
              className="bg-green-700 hover:bg-green-800 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("admin.disputes.saving") : t("admin.disputes.saveDecision")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
