"use client";

import { useState } from "react";
import {
  Bell,
  MessageCircle,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wallet,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  message: {
    icon: <MessageCircle className="h-4 w-4" />,
    color: "text-green-700",
    bg: "bg-green-100",
  },
  booking_request: {
    icon: <CalendarDays className="h-4 w-4" />,
    color: "text-green-700",
    bg: "bg-green-100",
  },
  booking_accepted: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-green-700",
    bg: "bg-green-100",
  },
  booking_rejected: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-gray-500",
    bg: "bg-gray-100",
  },
  booking_completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-green-700",
    bg: "bg-green-100",
  },
  dispute: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-gray-500",
    bg: "bg-gray-100",
  },
  payment: {
    icon: <Wallet className="h-4 w-4" />,
    color: "text-green-700",
    bg: "bg-green-100",
  },
};

function formatTime(dateString: string, t: (key: string, opts?: object) => string, lang: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  if (diff < 60_000) return t("notifications.justNow");
  if (diff < 3_600_000) return t("notifications.minutesAgo", { count: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t("notifications.hoursAgo", { count: Math.floor(diff / 3_600_000) });
  if (diff < 7 * 86_400_000) return t("notifications.daysAgo", { count: Math.floor(diff / 86_400_000) });
  return new Date(dateString).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" });
}

function NotifRow({
  notif,
  onRead,
  onDelete,
  onClick,
}: {
  notif: AppNotification;
  onRead: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.booking_request;
  const isUnread = !notif.read_at;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0",
        isUnread ? "bg-green-50/50 hover:bg-green-100/40" : "hover:bg-gray-50"
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          "shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center",
          cfg.bg,
          cfg.color
        )}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm truncate", isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
            {notif.title}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0">{formatTime(notif.created_at, t, lang)}</span>
        </div>
        <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        {isUnread && (
          <button
            onClick={onRead}
            className="cursor-pointer h-6 w-6 rounded-full flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-100 transition-colors"
            title={t("notifications.markAsRead")}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="cursor-pointer h-6 w-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title={t("common.delete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unreadCount, loading, markRead, markAllRead, deleteOne, clearAll } =
    useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleClick = (notif: AppNotification) => {
    if (!notif.read_at) markRead(notif.id);
    setOpen(false);
    if (notif.link) router.push(notif.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0 rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {t("notifications.title")}
            {unreadCount > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-500">{t("notifications.newCount", { count: unreadCount })}</span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="cursor-pointer text-xs text-green-700 hover:underline"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="cursor-pointer text-xs text-gray-400 hover:text-red-500 hover:underline"
              >
                {t("notifications.clearAll")}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">{t("notifications.noNotifications")}</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotifRow
                key={n.id}
                notif={n}
                onRead={() => markRead(n.id)}
                onDelete={() => deleteOne(n.id)}
                onClick={() => handleClick(n)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
