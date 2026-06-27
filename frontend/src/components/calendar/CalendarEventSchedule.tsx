"use client";

import { useTranslation } from "react-i18next";
import { getIntlLocale } from "@/lib/locale";
import {
  formatCalendarDateTime,
  formatCalendarTime,
  isSameCalendarDay,
} from "@/lib/formatCalendarEvent";

type CalendarEventScheduleProps = {
  startsAt: string;
  endsAt: string;
  statusBadge?: { label: string; className?: string } | null;
  className?: string;
};

export default function CalendarEventSchedule({
  startsAt,
  endsAt,
  statusBadge,
  className,
}: CalendarEventScheduleProps) {
  const { t, i18n } = useTranslation();
  const locale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay =
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    isSameCalendarDay(start, end);

  const endLabel = sameDay
    ? `${start.toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })}, ${formatCalendarTime(endsAt, locale)}`
    : formatCalendarDateTime(endsAt, locale);

  return (
    <div className={className ?? "mt-1 space-y-1 rounded-lg bg-gray-50 px-2.5 py-2 text-xs"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="shrink-0 font-semibold text-green-800">{t("calendar.startsAt")}</span>
            <span className="text-gray-800">{formatCalendarDateTime(startsAt, locale)}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="shrink-0 font-semibold text-green-800">{t("calendar.endsAt")}</span>
            <span className="text-gray-800">{endLabel}</span>
          </div>
        </div>
        {statusBadge ? (
          <span
            className={
              statusBadge.className ??
              "shrink-0 rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-gray-700 border border-gray-200"
            }
          >
            {statusBadge.label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
