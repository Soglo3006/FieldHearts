"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ScheduleConfirmStatusProps = {
  confirmedByClient: boolean;
  confirmedByWorker: boolean;
  userRole: "client" | "worker";
  className?: string;
};

export default function ScheduleConfirmStatus({
  confirmedByClient,
  confirmedByWorker,
  userRole,
  className,
}: ScheduleConfirmStatusProps) {
  const { t } = useTranslation();

  const sides = [
    {
      key: "client",
      label: t("bookings.clientLabel"),
      confirmed: confirmedByClient,
      isMe: userRole === "client",
    },
    {
      key: "worker",
      label: t("bookings.providerLabel"),
      confirmed: confirmedByWorker,
      isMe: userRole === "worker",
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {sides.map((side) => (
        <div
          key={side.key}
          className={cn(
            "flex min-h-[3.25rem] flex-col justify-center gap-1.5 rounded-lg border bg-white px-2.5 py-2",
            side.isMe && !side.confirmed
              ? "border-green-200 bg-green-50/30"
              : "border-gray-100",
          )}
        >
          <span className="truncate text-xs font-medium text-gray-700">
            {side.label}
            {side.isMe && (
              <span className="font-normal text-gray-400"> · {t("calendar.you")}</span>
            )}
          </span>
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none",
              side.confirmed
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600",
            )}
          >
            {side.confirmed ? (
              <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" aria-hidden />
            )}
            {side.confirmed
              ? t("calendar.scheduleSideConfirmed")
              : t("calendar.scheduleSidePending")}
          </span>
        </div>
      ))}
    </div>
  );
}

type ScheduleOutcomeBannerProps = {
  variant: "afterPayment" | "onCalendar";
  className?: string;
};

export function ScheduleOutcomeBanner({ variant, className }: ScheduleOutcomeBannerProps) {
  const { t } = useTranslation();
  const isOnCalendar = variant === "onCalendar";

  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs leading-snug",
        isOnCalendar
          ? "border-green-200 bg-green-50"
          : "border-blue-100 bg-blue-50/80",
        className,
      )}
    >
      <p className={cn("font-semibold", isOnCalendar ? "text-green-900" : "text-blue-900")}>
        {isOnCalendar ? t("calendar.scheduleOnCalendarTitle") : t("calendar.scheduleAfterPaymentTitle")}
      </p>
      <p className={cn("mt-0.5", isOnCalendar ? "text-green-800" : "text-blue-800")}>
        {isOnCalendar ? t("calendar.scheduleOnCalendarHint") : t("calendar.scheduleAfterPaymentHint")}
      </p>
    </div>
  );
}
