"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type WorkSession = {
  id: string;
  booking_id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  hours_worker: number | null;
  hours_client: number | null;
  hours_final: number | null;
  status: string;
  worker_note: string | null;
  client_note: string | null;
  my_role?: "worker" | "client";
};

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-700",
  pending_client: "bg-amber-100 text-amber-800",
  pending_worker: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
};

type Props = {
  bookingId: string;
  isHourly: boolean;
  userRole: "worker" | "client";
  canEdit: boolean;
  approvedHoursTotal?: number | string | null;
  onUpdated?: () => void;
};

export default function WorkSessionsPanel({
  bookingId,
  isHourly,
  userRole,
  canEdit,
  approvedHoursTotal,
  onUpdated,
}: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoursInput, setHoursInput] = useState("");
  const [modifyHours, setModifyHours] = useState("");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const approvedTotal = Number(approvedHoursTotal) || 0;

  const load = useCallback(async () => {
    if (!session?.access_token || !isHourly) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/work-sessions?booking_id=${bookingId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [bookingId, isHourly, session?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isHourly) return null;

  const apiPost = async (path: string, body: Record<string, unknown>) => {
    if (!session?.access_token) return false;
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/work-sessions${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || t("workSessions.error"));
        return false;
      }
      await load();
      onUpdated?.();
      setHoursInput("");
      setModifyHours("");
      setActiveSession(null);
      return true;
    } finally {
      setSaving(false);
    }
  };

  const parseHours = (raw: string) => {
    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      toast.error(t("workSessions.invalidHours"));
      return null;
    }
    return hours;
  };

  const handleCreate = () => apiPost("/", { booking_id: bookingId, title: t("workSessions.defaultTitle") });

  const handleCreateAndSubmit = async () => {
    if (!session?.access_token || userRole !== "worker" || !canEdit) return;
    const hours = parseHours(hoursInput);
    if (hours == null) return;

    setSaving(true);
    try {
      const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/work-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ booking_id: bookingId, title: t("workSessions.defaultTitle") }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        toast.error(err.message || t("workSessions.error"));
        return;
      }
      const created = await createRes.json();
      const submitRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/work-sessions/${created.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ hours }),
        },
      );
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        toast.error(err.message || t("workSessions.error"));
        return;
      }
      toast.success(t("workSessions.submittedSuccess"));
      await load();
      onUpdated?.();
      setHoursInput("");
    } finally {
      setSaving(false);
    }
  };

  const workerCanSubmitOnSession = (status: string) =>
    canEdit && userRole === "worker" && ["scheduled", "pending_worker"].includes(status);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t("workSessions.title")}</h3>
          {approvedTotal > 0 && (
            <p className="text-xs text-green-700 mt-0.5 font-medium">
              {t("workSessions.totalApproved", { hours: approvedTotal })}
            </p>
          )}
        </div>
        {canEdit && userRole === "worker" && sessions.length > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={handleCreate} disabled={saving}>
            {t("workSessions.addSession")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {userRole === "worker" ? t("workSessions.emptyWorker") : t("workSessions.emptyClient")}
          </p>
          {canEdit && userRole === "worker" && (
            <div className="flex gap-2 items-end rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t("workSessions.hoursLabel")}</Label>
                <Input
                  type="number"
                  min={0.25}
                  max={24}
                  step={0.25}
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  placeholder="5"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-green-700 hover:bg-green-800 shrink-0"
                disabled={saving || !hoursInput}
                onClick={handleCreateAndSubmit}
              >
                {t("workSessions.submitHours")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{s.title}</p>
                  {s.hours_final != null && (
                    <p className="text-sm text-green-700">
                      {t("workSessions.approvedHours", { hours: s.hours_final })}
                    </p>
                  )}
                  {s.hours_worker != null && s.status !== "approved" && (
                    <p className="text-xs text-gray-500">
                      {t("workSessions.submittedHours", { hours: s.hours_worker })}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    STATUS_CLASS[s.status] ?? STATUS_CLASS.scheduled,
                  )}
                >
                  {t(`workSessions.status.${s.status}`, s.status)}
                </span>
              </div>

              {workerCanSubmitOnSession(s.status) && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">{t("workSessions.hoursLabel")}</Label>
                    <Input
                      type="number"
                      min={0.25}
                      max={24}
                      step={0.25}
                      value={activeSession === s.id ? hoursInput : String(s.hours_worker ?? "")}
                      onChange={(e) => {
                        setActiveSession(s.id);
                        setHoursInput(e.target.value);
                      }}
                      placeholder="2"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-700 hover:bg-green-800 shrink-0"
                    disabled={saving}
                    onClick={() => {
                      const hours = parseHours(hoursInput || String(s.hours_worker ?? ""));
                      if (hours != null) apiPost(`/${s.id}/submit`, { hours });
                    }}
                  >
                    {t("workSessions.submitHours")}
                  </Button>
                </div>
              )}

              {canEdit && userRole === "client" && s.status === "pending_client" && (
                <div className="space-y-2 border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-600">{t("workSessions.clientReviewHint")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-700 hover:bg-green-800"
                      disabled={saving}
                      onClick={() => apiPost(`/${s.id}/client-respond`, { action: "approve" })}
                    >
                      {t("workSessions.approve")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => apiPost(`/${s.id}/client-respond`, { action: "contest" })}
                    >
                      {t("workSessions.contest")}
                    </Button>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">{t("workSessions.modifyHours")}</Label>
                      <Input
                        type="number"
                        min={0.25}
                        max={24}
                        step={0.25}
                        value={modifyHours}
                        onChange={(e) => setModifyHours(e.target.value)}
                        placeholder={String(s.hours_worker ?? "")}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={saving || !modifyHours}
                      onClick={() => {
                        const hours = parseHours(modifyHours);
                        if (hours != null) {
                          apiPost(`/${s.id}/client-respond`, { action: "modify", hours });
                        }
                      }}
                    >
                      {t("workSessions.proposeChange")}
                    </Button>
                  </div>
                </div>
              )}

              {canEdit && userRole === "worker" && s.status === "pending_worker" && (
                <div className="space-y-2 border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-600">
                    {t("workSessions.workerReviewHint", { hours: s.hours_client ?? s.hours_worker })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-700 hover:bg-green-800"
                      disabled={saving}
                      onClick={() => apiPost(`/${s.id}/worker-respond`, { action: "approve" })}
                    >
                      {t("workSessions.acceptModification")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => apiPost(`/${s.id}/worker-respond`, { action: "dispute" })}
                    >
                      {t("workSessions.dispute")}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
