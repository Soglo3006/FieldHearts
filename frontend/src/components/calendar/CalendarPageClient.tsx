"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getIntlLocale } from "@/lib/locale";
import { googleCalendarUrl } from "@/lib/calendarSync";
import { toast } from "sonner";
import DateTimeField from "@/components/ui/DateTimeField";
import CalendarEventSchedule from "@/components/calendar/CalendarEventSchedule";
import ScheduleConfirmStatus, { ScheduleOutcomeBanner } from "@/components/calendar/ScheduleConfirmStatus";
import CalendarSkeleton, { CalendarPanelListSkeleton } from "@/components/calendar/CalendarSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import BookingDetailModal, { type BookingDetail } from "@/components/bookings/BookingDetailModal";
import { useStartConversation } from "@/hooks/useStartConversation";

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
  confirmed_by_client?: boolean;
  confirmed_by_worker?: boolean;
  created_by?: string;
  proposer_name?: string | null;
  service_title?: string;
  booking_status?: string;
  my_role?: "worker" | "client";
};

function bookingStatusBadge(
  statusRaw: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const status = (statusRaw ?? "").toLowerCase();
  const labelKey = [
    "pending",
    "negotiating",
    "accepted",
    "active",
    "completed",
    "cancelled",
    "rejected",
    "refused",
    "confirmed",
    "disputed",
  ].includes(status)
    ? `bookings.${status}`
    : null;

  const label = labelKey ? t(labelKey) : statusRaw ?? "";

  const base = "shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold border";
  if (status === "completed")
    return { label, className: `${base} bg-gray-100 text-gray-700 border-gray-200` };
  if (status === "cancelled" || status === "rejected" || status === "refused")
    return { label, className: `${base} bg-red-50 text-red-700 border-red-100` };
  if (status === "disputed")
    return { label, className: `${base} bg-amber-50 text-amber-800 border-amber-100` };
  if (status === "accepted" || status === "pending" || status === "negotiating" || status === "confirmed")
    return { label, className: `${base} bg-blue-50 text-blue-800 border-blue-100` };
  if (status === "active")
    return { label, className: `${base} bg-green-50 text-green-800 border-green-100` };

  return label ? { label, className: `${base} bg-gray-50 text-gray-700 border-gray-200` } : null;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
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
  const locale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [slideDirection, setSlideDirection] = useState<"prev" | "next">("next");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [dayPage, setDayPage] = useState(0);
  const [detailBooking, setDetailBooking] = useState<{
    booking: BookingDetail;
    role: "worker" | "client";
  } | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const { startConversation } = useStartConversation();

  const EVENTS_PER_PAGE = 3;

  const openBookingModal = useCallback(
    async (event: CalendarEvent) => {
      if (!session?.access_token) return;
      setDetailLoadingId(event.booking_id);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings/${event.booking_id}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (!res.ok) return;
        const data = (await res.json()) as BookingDetail;
        const role: "worker" | "client" =
          event.my_role === "worker" || event.my_role === "client" ? event.my_role : "client";
        setDetailBooking({ booking: data, role });
      } finally {
        setDetailLoadingId(null);
      }
    },
    [session?.access_token],
  );

  const goToMonth = (delta: -1 | 1) => {
    setSlideDirection(delta === -1 ? "prev" : "next");
    setCursor((c) => addMonths(c, delta));
  };

  const loadEvents = useCallback(async () => {
    if (!session?.access_token) return;
    setEventsLoading(true);
    let from = startOfMonth(addMonths(cursor, -1));
    let to = endOfMonth(addMonths(cursor, 1));
    if (selectedDay) {
      const selFrom = startOfMonth(selectedDay);
      const selTo = endOfMonth(selectedDay);
      if (selFrom < from) from = selFrom;
      if (selTo > to) to = selTo;
    }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setEventsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [cursor, selectedDay, session?.access_token]);

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
  const totalDayPages = Math.max(1, Math.ceil(selectedEvents.length / EVENTS_PER_PAGE));

  useEffect(() => {
    setDayPage(0);
  }, [selectedDay?.getTime()]);

  useEffect(() => {
    if (dayPage > totalDayPages - 1) {
      setDayPage(Math.max(0, totalDayPages - 1));
    }
  }, [dayPage, totalDayPages]);

  const pagedSelectedEvents = selectedEvents.slice(
    dayPage * EVENTS_PER_PAGE,
    dayPage * EVENTS_PER_PAGE + EVENTS_PER_PAGE,
  );

  const selectedInCurrentMonth =
    selectedDay &&
    selectedDay.getMonth() === cursor.getMonth() &&
    selectedDay.getFullYear() === cursor.getFullYear();

  const monthLabel = cursor.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
  const monthSlideClass =
    slideDirection === "prev" ? "calendar-month-enter-prev" : "calendar-month-enter-next";

  // Full-page skeleton only on the very first load — month changes keep the title/layout.
  if (!hasLoadedOnce && eventsLoading) {
    return <CalendarSkeleton />;
  }

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label={t("common.previous")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2
              key={monthKey}
              className={cn("text-lg font-semibold capitalize text-gray-900", monthSlideClass)}
            >
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
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

          <div className="relative overflow-hidden">
            {eventsLoading ? (
              <div
                key={`${monthKey}-skeleton`}
                className={cn("grid grid-cols-7 gap-1", monthSlideClass)}
              >
                {Array.from({ length: 42 }).map((_, i) => (
                  <Skeleton key={i} className="min-h-[3.25rem] w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div
                key={monthKey}
                className={cn("grid grid-cols-7 gap-1", monthSlideClass)}
              >
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
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900">
              {selectedDay
                ? selectedDay.toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : t("calendar.pickDay")}
            </h3>
            {selectedDay && !selectedInCurrentMonth && (
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {t("calendar.selectedDayKept")}
              </span>
            )}
          </div>

          {eventsLoading ? (
            <div className="mt-4">
              <CalendarPanelListSkeleton />
            </div>
          ) : selectedEvents.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">{t("calendar.noEvents")}</p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {pagedSelectedEvents.map((event) => (
                  <li key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <button
                      type="button"
                      onClick={() => openBookingModal(event)}
                      disabled={detailLoadingId === event.booking_id}
                      className="w-full text-left rounded-lg transition-colors hover:bg-white/80 disabled:opacity-70"
                    >
                      <span className="font-medium text-gray-900 hover:text-green-700 line-clamp-2 block">
                        {event.title}
                      </span>
                      <CalendarEventSchedule
                        startsAt={event.starts_at}
                        endsAt={event.ends_at}
                        statusBadge={bookingStatusBadge(event.booking_status ?? event.status, t)}
                      />
                      {event.location && <p className="mt-1 text-xs text-gray-600">{event.location}</p>}
                      {event.notes && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{event.notes}</p>}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openBookingModal(event)}
                        disabled={detailLoadingId === event.booking_id}
                        className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline disabled:opacity-60"
                      >
                        {detailLoadingId === event.booking_id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{t("calendar.openBooking")}</span>
                          </>
                        ) : (
                          t("calendar.openBooking")
                        )}
                      </button>
                      <a
                        href={googleCalendarUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-green-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("calendar.addGoogle")}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
              {totalDayPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {Array.from({ length: totalDayPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDayPage(i)}
                      className={cn(
                        "min-w-[2rem] rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                        dayPage === i
                          ? "border-green-600 bg-green-700 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                      )}
                      aria-label={t("calendar.dayPage", { page: i + 1 })}
                      aria-current={dayPage === i ? "page" : undefined}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {detailBooking && session?.access_token && (
        <BookingDetailModal
          booking={detailBooking.booking}
          userRole={detailBooking.role}
          accessToken={session.access_token}
          onClose={() => setDetailBooking(null)}
          onUpdated={(bookingId, updates) => {
            setDetailBooking((prev) =>
              prev ? { ...prev, booking: { ...prev.booking, ...updates } } : prev,
            );
            loadEvents();
          }}
          onMessage={(userId) => {
            setDetailBooking(null);
            startConversation(userId);
          }}
        />
      )}
    </div>
  );
}

type BookingCalendarPanelProps = {
  bookingId: string;
  bookingTitle: string;
  serviceLocation?: string | null;
  bookingStatus: string;
  userRole: "client" | "worker";
  canEdit: boolean;
  isHourly?: boolean;
};

function isScheduleAgreed(event: CalendarEvent) {
  return !!event.confirmed_by_client && !!event.confirmed_by_worker;
}

export function BookingCalendarPanel({
  bookingId,
  bookingTitle,
  serviceLocation,
  bookingStatus,
  userRole,
  canEdit,
  isHourly = false,
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const scheduleRangeInvalid = useMemo(() => {
    if (!startsAt || !endsAt) return false;
    return new Date(endsAt).getTime() <= new Date(startsAt).getTime();
  }, [startsAt, endsAt]);

  const myConfirmed = (event: CalendarEvent) =>
    userRole === "client" ? !!event.confirmed_by_client : !!event.confirmed_by_worker;
  const otherConfirmed = (event: CalendarEvent) =>
    userRole === "client" ? !!event.confirmed_by_worker : !!event.confirmed_by_client;

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
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error(t("calendar.endBeforeStart"));
      return;
    }
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
        toast.success(t("calendar.scheduleProposed"));
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || t("common.error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!session?.access_token) return;
    setConfirmingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/events/${id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        toast.success(t("calendar.scheduleConfirmed"));
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || t("common.error"));
      }
    } finally {
      setConfirmingId(null);
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
      <div>
        <p className="text-xs text-gray-600 leading-relaxed">{t("calendar.scheduleAgreementHint")}</p>
        {isHourly && (
          <p className="text-xs text-red-600 leading-relaxed pt-2 mt-2 border-t border-gray-200">
            {t("calendar.hourlyScheduleBillingHint")}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">{t("calendar.addSession")}</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <DateTimeField
              id={`start-${bookingId}`}
              label={t("calendar.startsAt")}
              value={startsAt}
              onChange={setStartsAt}
            />
            <DateTimeField
              id={`end-${bookingId}`}
              label={t("calendar.endsAt")}
              value={endsAt}
              min={startsAt || undefined}
              invalid={scheduleRangeInvalid}
              onChange={setEndsAt}
            />
          </div>
          {scheduleRangeInvalid && (
            <p className="text-xs text-red-600 leading-relaxed">{t("calendar.endBeforeStart")}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`notes-${bookingId}`}>{t("calendar.notes")}</Label>
            <Textarea
              id={`notes-${bookingId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none min-h-[4.5rem] max-h-[4.5rem] field-sizing-fixed overflow-y-auto"
            />
          </div>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={saving || !startsAt || !endsAt || scheduleRangeInvalid}
            className="w-full bg-green-700 hover:bg-green-800"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("calendar.proposeSchedule")
            )}
          </Button>
        </div>
      )}

      {loading ? (
        <CalendarPanelListSkeleton />
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500">{t("calendar.noBookingEvents")}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const agreed = isScheduleAgreed(event);
            const needsMyConfirm = !myConfirmed(event);
            const waitingOther = myConfirmed(event) && !otherConfirmed(event);
            const onCalendar = agreed && ["active", "completed"].includes(bookingStatus);

            return (
            <li key={event.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{event.title}</p>
                {event.proposer_name && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t("calendar.proposedBy", { name: event.proposer_name })}
                  </p>
                )}
                <CalendarEventSchedule
                  startsAt={event.starts_at}
                  endsAt={event.ends_at}
                  statusBadge={bookingStatusBadge(event.booking_status ?? event.status, t)}
                />
                <ScheduleConfirmStatus
                  className="mt-2"
                  confirmedByClient={!!event.confirmed_by_client}
                  confirmedByWorker={!!event.confirmed_by_worker}
                  userRole={userRole}
                />
                {event.notes && <p className="mt-1 text-xs text-gray-500 whitespace-pre-line">{event.notes}</p>}
                {event.location && <p className="text-xs text-gray-600 mt-1">{event.location}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {needsMyConfirm && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-700 hover:bg-green-800 h-8"
                      disabled={confirmingId === event.id}
                      onClick={() => handleConfirm(event.id)}
                    >
                      {confirmingId === event.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        t("calendar.confirmSchedule")
                      )}
                    </Button>
                  )}
                  {waitingOther && (
                    <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {t("calendar.waitingOtherSchedule")}
                    </span>
                  )}
                  {agreed && !onCalendar && (
                    <ScheduleOutcomeBanner variant="afterPayment" className="w-full" />
                  )}
                  {onCalendar && (
                    <ScheduleOutcomeBanner variant="onCalendar" className="w-full" />
                  )}
                </div>
                {onCalendar && (
                  <a
                    href={googleCalendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-green-700 hover:underline mt-2 inline-block"
                  >
                    {t("calendar.addGoogle")}
                  </a>
                )}
              </div>
              {canEdit && event.status === "scheduled" && (
                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { toDateInputValue };
