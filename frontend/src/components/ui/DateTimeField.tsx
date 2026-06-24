"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getIntlLocale } from "@/lib/locale";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function parseValue(value: string) {
  if (!value) {
    return { date: "", hour: "09", minute: "00" };
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const rawMinute = Number(match[3]);
    const snapped = Math.min(55, Math.round(rawMinute / 5) * 5);
    return {
      date: match[1],
      hour: match[2],
      minute: String(snapped).padStart(2, "0"),
    };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { date: "", hour: "09", minute: "00" };
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const snapped = Math.min(55, Math.round(d.getMinutes() / 5) * 5);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour: pad(d.getHours()),
    minute: String(snapped).padStart(2, "0"),
  };
}

function buildValue(date: string, hour: string, minute: string) {
  if (!date) return "";
  return `${date}T${hour}:${minute}`;
}

type DateTimeFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Earliest allowed datetime (`YYYY-MM-DDTHH:mm`) — used on the date input. */
  min?: string;
  className?: string;
  invalid?: boolean;
};

export default function DateTimeField({ id, label, value, onChange, min, className, invalid }: DateTimeFieldProps) {
  const { t, i18n } = useTranslation();
  const locale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });
  const { date, hour, minute } = parseValue(value);

  const preview = useMemo(() => {
    if (!date) return null;
    const iso = buildValue(date, hour, minute);
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [date, hour, minute, locale]);

  const update = (next: Partial<{ date: string; hour: string; minute: string }>) => {
    const d = next.date ?? date;
    const h = next.hour ?? hour;
    const m = next.minute ?? minute;
    onChange(buildValue(d, h, m));
  };

  const minDate = min?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3 shadow-xs",
        invalid ? "border-red-300 ring-1 ring-red-200" : "border-gray-200",
        className,
      )}
    >
      <Label htmlFor={`${id}-date`} className="text-sm font-semibold text-gray-900">
        {label}
      </Label>

      <div className="mt-2 space-y-3">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-gray-500">{t("calendar.date")}</span>
          <Input
              id={`${id}-date`}
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => update({ date: e.target.value })}
              className="[color-scheme:light]"
            />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-medium text-gray-500">{t("calendar.hour")}</span>
            <Select value={hour} onValueChange={(h) => update({ hour: h })}>
              <SelectTrigger id={`${id}-hour`} className="w-full">
                <SelectValue placeholder="09" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {HOURS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-medium text-gray-500">{t("calendar.minute")}</span>
            <Select value={minute} onValueChange={(m) => update({ minute: m })}>
              <SelectTrigger id={`${id}-minute`} className="w-full">
                <SelectValue placeholder="00" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {preview && (
          <p className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800">
            {preview}
          </p>
        )}
      </div>
    </div>
  );
}
