"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { RefreshCw, Scale, ExternalLink, MessageSquare, CreditCard, AlertTriangle } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/auth";
import { getIntlLocale } from "@/lib/locale";
import AppImage from "@/components/ui/AppImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/textarea";

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

type DisputeMessage = {
  id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_email: string;
  attachments: Array<{ url: string; name: string }>;
};

type DisputeDetail = {
  dispute: {
    id: string;
    status: DisputeStatus;
    description: string;
    resolution: string | null;
    created_at: string;
    booking_id: string;
    raised_by_name: string;
  };
  booking: {
    id: string;
    status: string;
    payment_status: string | null;
    completed_at: string | null;
    created_at: string;
    service_title: string;
    service_price: number;
    booking_price: number;
    service_image_url: string | null;
  };
  parties: {
    client: { id: string; name: string; email: string };
    worker: { id: string; name: string; email: string };
  };
  payment: {
    id: string;
    amount: number;
    platform_fee: number;
    status: string;
    currency: string;
    created_at: string;
  } | null;
  refund_summary: {
    total_cents: number;
    platform_fee_cents: number;
    max_refund_cents: number;
    default_refund_cents: number;
  } | null;
  messages: DisputeMessage[];
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
  const [selected, setSelected] = useState<DisputeSummary | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DisputeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState<DisputeStatus>("open");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [refundClient, setRefundClient] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isAdminUser(user)) {
      router.replace("/");
      return;
    }
    setAllowed(true);
  }, [loading, router, user]);

  const formatMoney = (amount: number) => new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);

  const formatCents = (amountCents: number) => formatMoney(amountCents / 100);

  const getStatusLabel = (status: DisputeStatus) => t(`admin.status.${status}`);

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

  const fetchDisputeDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${id}/admin`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedDetail(data);
      if (data.refund_summary?.default_refund_cents) {
        setRefundAmount((data.refund_summary.default_refund_cents / 100).toFixed(2));
      } else {
        setRefundAmount("");
      }
    } catch {
      setSelectedDetail(null);
      setSaveError(t("admin.disputes.loadDetailError"));
    } finally {
      setDetailLoading(false);
    }
  };

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

  const openDetail = async (dispute: DisputeSummary) => {
    setSelected(dispute);
    setSelectedDetail(null);
    setResolution(dispute.resolution || "");
    setNewStatus(dispute.status);
    setRefundClient(false);
    setRefundAmount("");
    setSaveError("");
    await fetchDisputeDetail(dispute.id);
  };

  const closeDetail = () => {
    setSelected(null);
    setSelectedDetail(null);
    setResolution("");
    setNewStatus("open");
    setRefundClient(false);
    setRefundAmount("");
    setSaveError("");
  };

  const handleRefundToggle = (checked: boolean) => {
    setRefundClient(checked);
    if (checked && !refundAmount.trim() && selectedDetail?.refund_summary?.default_refund_cents) {
      setRefundAmount((selectedDetail.refund_summary.default_refund_cents / 100).toFixed(2));
    }
  };

  const handleSave = async () => {
    if (!selected) return;

    setSaving(true);
    setSaveError("");

    try {
      const parsedRefundAmount = refundClient && refundAmount.trim()
        ? Math.round(Number(refundAmount.replace(",", ".")) * 100)
        : undefined;

      if (refundClient && refundAmount.trim() && (!Number.isFinite(parsedRefundAmount) || parsedRefundAmount <= 0)) {
        setSaveError(t("admin.disputes.invalidRefundAmount"));
        setSaving(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${selected.id}/admin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          resolution,
          refund_client: refundClient,
          ...(parsedRefundAmount ? { refund_amount_cents: parsedRefundAmount } : {}),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || t("admin.disputes.saveError"));
      }

      setDisputes((prev) => prev.map((dispute) => (
        dispute.id === payload.id
          ? { ...dispute, status: payload.status, resolution: payload.resolution }
          : dispute
      )));

      setSelected((prev) => prev ? { ...prev, status: payload.status, resolution: payload.resolution } : prev);
      await fetchDisputeDetail(selected.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t("admin.disputes.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const openCount = disputes.filter((dispute) => dispute.status === "open").length;

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
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
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
            { label: t("admin.status.open"), count: disputes.filter((dispute) => dispute.status === "open").length, style: "bg-amber-50 border border-amber-200" },
            { label: t("admin.status.resolved"), count: disputes.filter((dispute) => dispute.status === "resolved").length, style: "bg-green-50 border border-green-200" },
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
                      <Badge className={STATUS_STYLES[dispute.status]}>{getStatusLabel(dispute.status)}</Badge>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/bookings?highlight=${dispute.booking_id}`} target="_blank">
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> {t("admin.disputes.bookingButton")}
                      </Button>
                    </Link>
                    <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => openDetail(dispute)}>
                      {dispute.status === "open" ? t("admin.disputes.resolveButton") : t("common.edit")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>{t("admin.pagination.first")}</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t("admin.pagination.prev")}</Button>
              <span className="text-sm text-gray-600">{t("admin.pagination.pageOf", { page, total: totalPages })}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>{t("admin.pagination.next")}</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>{t("admin.pagination.last")}</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("admin.disputes.dialogTitle", { title: selected?.service_title ?? "" })}</DialogTitle>
          </DialogHeader>

          {!selected || detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : selectedDetail ? (
            <div className="space-y-5 overflow-y-auto pr-1 text-sm max-h-[72vh]">
              <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                <Card className="p-4 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="h-24 w-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {selectedDetail.booking.service_image_url ? (
                        <AppImage src={selectedDetail.booking.service_image_url} alt={selectedDetail.booking.service_title} width={96} height={96} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-300">
                          <Scale className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-gray-900 truncate">{selectedDetail.booking.service_title}</h2>
                        <Badge className={STATUS_STYLES[selectedDetail.dispute.status]}>{getStatusLabel(selectedDetail.dispute.status)}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>{t("admin.disputes.bookingStatusLabel")} {selectedDetail.booking.status}</p>
                        <p>{t("admin.disputes.paymentStatusLabel")} {selectedDetail.booking.payment_status || t("admin.support.notAvailable")}</p>
                        <p>{t("admin.disputes.dateLabel")} {new Date(selectedDetail.dispute.created_at).toLocaleDateString(locale)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("admin.disputes.clientLabel")}</p>
                      <p className="mt-1 font-medium text-gray-900">{selectedDetail.parties.client.name}</p>
                      <p className="text-xs text-gray-500">{selectedDetail.parties.client.email}</p>
                    </div>
                    <div className="rounded-xl border bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("admin.disputes.workerLabel")}</p>
                      <p className="mt-1 font-medium text-gray-900">{selectedDetail.parties.worker.name}</p>
                      <p className="text-xs text-gray-500">{selectedDetail.parties.worker.email}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold text-gray-800">{t("admin.disputes.descriptionLabel")}</Label>
                    <div className="mt-1 p-3 bg-gray-50 border rounded-lg text-gray-700 whitespace-pre-wrap">
                      {selectedDetail.dispute.description}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold">
                    <CreditCard className="h-4 w-4" />
                    {t("admin.disputes.paymentSummary")}
                  </div>
                  {selectedDetail.payment && selectedDetail.refund_summary ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t("admin.disputes.amountPaidLabel")}</span>
                        <span className="font-medium text-gray-900">{formatCents(selectedDetail.refund_summary.total_cents)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t("admin.disputes.feeKeptLabel")}</span>
                        <span className="font-medium text-gray-900">{formatCents(selectedDetail.refund_summary.platform_fee_cents)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t("admin.disputes.maxRefund")}</span>
                        <span className="font-semibold text-green-700">{formatCents(selectedDetail.refund_summary.max_refund_cents)}</span>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {t("admin.disputes.refundPolicy")}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed px-3 py-4 text-xs text-gray-500">
                      {t("admin.disputes.noPaymentData")}
                    </div>
                  )}
                </Card>
              </div>

              <Card className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  {t("admin.disputes.threadTitle")}
                </div>
                {selectedDetail.messages.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("admin.disputes.evidenceEmpty")}</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDetail.messages.map((message) => (
                      <div key={message.id} className="rounded-xl border bg-gray-50 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                          <div>
                            <span className="font-medium text-gray-800">{message.sender_name}</span>
                            {" · "}
                            {message.sender_email}
                          </div>
                          <span>{new Date(message.created_at).toLocaleString(locale)}</span>
                        </div>
                        {message.content && <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>}
                        {message.attachments?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {message.attachments.map((attachment, index) => (
                              <a
                                key={`${message.id}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                title={attachment.name}
                                aria-label={attachment.name}
                                className="block h-20 w-20 overflow-hidden rounded-lg border bg-white"
                              >
                                <AppImage src={attachment.url} alt={attachment.name} width={80} height={80} className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="font-semibold text-gray-800">{t("admin.disputes.decisionLabel")}</Label>
                  <Select value={newStatus} onValueChange={(value: DisputeStatus) => setNewStatus(value)}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
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
                    onChange={(event) => setResolution(event.target.value)}
                    rows={5}
                  />
                </div>

                {newStatus === "resolved" && selectedDetail.refund_summary && (
                  <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={refundClient}
                        onChange={(event) => handleRefundToggle(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-green-700"
                      />
                      <span className="text-sm font-medium text-gray-800">{t("admin.disputes.refundClient")}</span>
                    </label>

                    {refundClient && (
                      <div className="space-y-2">
                        <Label htmlFor="refund-amount" className="font-semibold text-gray-800">{t("admin.disputes.refundAmountLabel")}</Label>
                        <Input
                          id="refund-amount"
                          inputMode="decimal"
                          value={refundAmount}
                          onChange={(event) => setRefundAmount(event.target.value)}
                          placeholder={(selectedDetail.refund_summary.default_refund_cents / 100).toFixed(2)}
                        />
                        <p className="text-xs text-gray-600">
                          {t("admin.disputes.refundAmountHint", { max: formatCents(selectedDetail.refund_summary.max_refund_cents) })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {saveError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{saveError}</span>
                  </p>
                )}
              </Card>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeDetail}>{t("common.cancel")}</Button>
            <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={handleSave} disabled={saving || detailLoading || !selectedDetail}>
              {saving ? t("admin.disputes.saving") : t("admin.disputes.saveDecision")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
