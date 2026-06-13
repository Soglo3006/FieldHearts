"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getIntlLocale } from "@/lib/locale";
import { googleCalendarUrl } from "@/lib/calendarSync";
import { toast } from "sonner";

export type CalendarEvent = {
  id: string;
  booking_id: string;
  service_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  notes: string | null;
  status: "scheduled" | "completed" | "cancelled";
  service_title?: string;
  booking_status?: string;
  my_role?: "worker" | "client";
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarPageClient() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const locale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    const g = searchParams.get("google");
    if (g === "connected") toast.success(t("calendar.googleConnected"));
    if (g === "error") toast.error(t("calendar.googleConnectError"));
  }, [searchParams, t]);

  const loadGoogleStatus = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/google/status`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setGoogleConnected(!!data.connected);
    setGoogleConfigured(!!data.configured);
  }, [session?.access_token]);

  useEffect(() => {
    loadGoogleStatus();
  }, [loadGoogleStatus]);

  const connectGoogle = async () => {
    if (!session?.access_token) return;
    setGoogleBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/google/connect`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.message || t("calendar.googleConnectError"));
    } finally {
      setGoogleBusy(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!session?.access_token) return;
    setGoogleBusy(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/google/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setGoogleConnected(false);
      toast.success(t("calendar.googleDisconnected"));
    } finally {
      setGoogleBusy(false);
    }
  };

  const syncGoogle = async () => {
    if (!session?.access_token) return;
    setGoogleBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/google/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || t("calendar.googleSyncError"));
        return;
      }
      toast.success(t("calendar.googleSyncDone", { pulled: data.pulled ?? 0, pushed: data.pushed ?? 0 }));
      await loadEvents();
    } finally {
      setGoogleBusy(false);
    }
  };

  const loadFeedToken = useCallback(async () => {
    if (!session?.access_token) return;
    setFeedLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/feed-token`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.webcal_url) setFeedUrl(data.webcal_url);
    } finally {
      setFeedLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadFeedToken();
  }, [loadFeedToken]);

  const loadEvents = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    const from = startOfMonth(cursor);
    const to = addMonths(cursor, 1);
    to.setMilliseconds(to.getMilliseconds() - 1);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [cursor, session?.access_token]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = (first.getDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const eventsForDay = (day: Date) =>
    events.filter((e) => e.status === "scheduled" && sameDay(new Date(e.starts_at), day));

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const monthLabel = cursor.toLocaleDateString(locale, { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("calendar.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("calendar.subtitle")}</p>
        </div>
        <Link href="/bookings">
          <Button variant="outline" className="rounded-lg">
            {t("calendar.viewBookings")}
          </Button>
        </Link>
      </div>

      {(feedUrl || googleConfigured) && (
        <div className="mb-6 rounded-xl border border-green-100 bg-green-50/60 p-4 text-sm space-y-4">
          {feedUrl && (
            <div>
              <p className="font-medium text-gray-900">{t("calendar.syncTitle")}</p>
              <p className="mt-1 text-gray-600">{t("calendar.syncHint")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={feedUrl}>
                  <Button type="button" variant="outline" size="sm" disabled={feedLoading}>
                    {t("calendar.subscribeIcal")}
                  </Button>
                </a>
              </div>
            </div>
          )}
          {googleConfigured && (
            <div className="border-t border-green-100 pt-4">
              <p className="font-medium text-gray-900">{t("calendar.googleSyncTitle")}</p>
              <p className="mt-1 text-gray-600">{t("calendar.googleSyncHint")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {googleConnected ? (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={syncGoogle} disabled={googleBusy}>
                      {t("calendar.googleSyncNow")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={disconnectGoogle} disabled={googleBusy}>
                      {t("calendar.googleDisconnect")}
                    </Button>
                  </>
                ) : (
                  <Button type="button" size="sm" className="bg-green-700 hover:bg-green-800" onClick={connectGoogle} disabled={googleBusy}>
                    {t("calendar.googleConnect")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              className="rounded-full p-2 hover:bg-gray-100"
              aria-label={t("common.previous")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold capitalize text-gray-900">{monthLabel}</h2>
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              className="rounded-full p-2 hover:bg-gray-100"
              aria-label={t("common.next")}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                {new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" })}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const count = eventsForDay(day).length;
                const isSelected = selectedDay && sameDay(day, selectedDay);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative flex min-h-[3.25rem] flex-col items-center justify-start rounded-lg border px-1 py-1.5 text-sm transition-colors",
                      inMonth ? "border-gray-100 bg-white text-gray-900" : "border-transparent bg-gray-50 text-gray-400",
                      isSelected && "border-green-600 bg-green-50 ring-1 ring-green-200",
                    )}
                  >
                    <span>{day.getDate()}</span>
                    {count > 0 && (
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-semibold text-gray-900">
            {selectedDay
              ? selectedDay.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
              : t("calendar.pickDay")}
          </h3>

          {selectedEvents.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">{t("calendar.noEvents")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedEvents.map((event) => (
                <li key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(event.starts_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(event.ends_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {event.location && <p className="mt-1 text-xs text-gray-600">{event.location}</p>}
                  {event.notes && <p className="mt-1 text-xs text-gray-500">{event.notes}</p>}
                  <div className="mt-2 flex flex-wrap gap-3">
                    <Link href="/bookings" className="text-xs font-medium text-green-700 hover:underline">
                      {t("calendar.openBooking")}
                    </Link>
                    <a
                      href={googleCalendarUrl(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-green-700 hover:underline"
                    >
                      {t("calendar.addGoogle")}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

type BookingCalendarPanelProps = {
  bookingId: string;
  bookingTitle: string;
  serviceLocation?: string | null;
  canEdit: boolean;
};

export function BookingCalendarPanel({
  bookingId,
  bookingTitle,
  serviceLocation,
  canEdit,
}: BookingCalendarPanelProps) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const locale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/calendar/events?booking_id=${bookingId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [bookingId, session?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!session?.access_token || !startsAt || !endsAt) return;
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          title: bookingTitle,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          location: serviceLocation ?? null,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        setStartsAt("");
        setEndsAt("");
        setNotes("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!session?.access_token) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/events/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await load();
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">{t("calendar.addSession")}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`start-${bookingId}`}>{t("calendar.startsAt")}</Label>
              <Input
                id={`start-${bookingId}`}
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`end-${bookingId}`}>{t("calendar.endsAt")}</Label>
              <Input
                id={`end-${bookingId}`}
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`notes-${bookingId}`}>{t("calendar.notes")}</Label>
            <Textarea
              id={`notes-${bookingId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={saving || !startsAt || !endsAt}
            className="bg-green-700 hover:bg-green-800"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-2">{t("calendar.addEvent")}</span>
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500">{t("calendar.noBookingEvents")}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-3">
              <div>
                <p className="font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(event.starts_at).toLocaleString(locale)}
                  {" → "}
                  {new Date(event.ends_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                </p>
                {event.location && <p className="text-xs text-gray-600 mt-1">{event.location}</p>}
                <a
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-green-700 hover:underline mt-1 inline-block"
                >
                  {t("calendar.addGoogle")}
                </a>
              </div>
              {canEdit && event.status === "scheduled" && (
                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { toDateInputValue };
