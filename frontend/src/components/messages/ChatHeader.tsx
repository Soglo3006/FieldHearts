"use client";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Info, Phone, Video } from "lucide-react";

interface OtherUser {
  id: string;
  full_name?: string;
  company_name?: string;
  account_type?: string;
  avatar_url?: string | null;
}

interface Props {
  otherUser: OtherUser | undefined;
  isOtherOnline: boolean;
  showSettings: boolean;
  showMobileSidebar: boolean;
  isLargeScreen: boolean;
  onBack: () => void;
  onToggleInfo: () => void;
  isSwitching?: boolean;
}

export function ChatHeader({
  otherUser, isOtherOnline, showSettings, showMobileSidebar, isLargeScreen, onBack, onToggleInfo, isSwitching,
}: Props) {
  const { t } = useTranslation();
  const displayName =
    otherUser?.account_type === "company"
      ? otherUser.company_name
      : otherUser?.full_name || "Unknown";

  return (
    <div className="shrink-0 p-4 border-b flex items-center justify-between bg-white shadow-sm h-18.25">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 cursor-pointer" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {isSwitching ? (
          /* Skeleton while switching chats */
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-3.5 bg-gray-200 animate-pulse rounded w-32" />
              <div className="h-3 bg-gray-100 animate-pulse rounded w-16" />
            </div>
          </div>
        ) : (
        <Link href={`/profile/${otherUser?.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
          <div className="relative">
            <Avatar key={otherUser?.id} className="h-10 w-10 shrink-0">
              {otherUser?.avatar_url ? <AvatarImage src={otherUser.avatar_url} /> : null}
              <AvatarFallback delayMs={0} className="bg-green-100 text-green-800 font-semibold">
                {(displayName || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOtherOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 truncate">{displayName}</h2>
            <p className="text-xs">
              {isOtherOnline ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                  <span className="text-green-500 font-medium">{t("messages.online")}</span>
                </span>
              ) : (
                <span className="text-gray-400">{t("messages.offline")}</span>
              )}
            </p>
          </div>
        </Link>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" disabled className="opacity-40 cursor-not-allowed">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" disabled className="opacity-40 cursor-not-allowed">
          <Video className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleInfo}
          className={`cursor-pointer ${showSettings || showMobileSidebar ? "bg-gray-100" : ""}`}
        >
          <Info className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
