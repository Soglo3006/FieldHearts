"use client";

import type { ReactNode } from "react";
import {
  MessageCircle,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AppImage from "@/components/ui/AppImage";
import type { AppNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  string,
  { icon: ReactNode; color: string; bg: string }
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

function getFallbackLabel(notif: AppNotification) {
  const senderName = notif.sender_name?.trim();
  if (senderName) return senderName;

  const title = notif.title?.trim() || "U";
  return title;
}

export default function NotificationVisual({
  notif,
  className,
}: {
  notif: AppNotification;
  className?: string;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.booking_request;
  const frameClass = cn("h-10 w-14 shrink-0", className);
  const centeredFrameClass = cn("h-10 w-14 shrink-0 flex items-center justify-center", className);

  if (notif.type === "message") {
    const fallbackLabel = getFallbackLabel(notif);
    return (
      <div className={centeredFrameClass}>
        <Avatar className="h-10 w-10">
          {notif.sender_avatar ? <AvatarImage src={notif.sender_avatar} alt={fallbackLabel} /> : null}
          <AvatarFallback className="bg-green-100 text-green-800 text-sm font-semibold">
            {fallbackLabel.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  if (notif.service_image_url) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100", frameClass)}>
        <AppImage
          src={notif.service_image_url}
          alt={notif.service_title ?? notif.title ?? "Notification"}
          fill
          sizes="56px"
          className="object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div className={centeredFrameClass}>
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          cfg.bg,
          cfg.color,
        )}
      >
        {cfg.icon}
      </div>
    </div>
  );
}
