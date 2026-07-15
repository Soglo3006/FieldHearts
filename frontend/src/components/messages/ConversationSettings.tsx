"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Search, BellOff, Bell, Trash2, Ban, Flag, X, Archive, ArchiveRestore, ArrowLeft, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  created_at: string;
  deleted_at?: string | null;
  sender?: {
    full_name?: string;
    company_name?: string;
    account_type?: string;
  } | null;
}

interface ConversationSettingsProps {
  otherUser?: {
    id?: string;
    full_name?: string;
    company_name?: string;
    account_type?: string;
  } | null;
  messages?: Message[];
  onClose: () => void;
  onDeleteConversation: () => Promise<void>;
  onBlockUser: () => Promise<void>;
  isMuted: boolean;
  onToggleMute: () => void;
  onReportUser: (reason: string, details: string) => Promise<void>;
  isBlocked?: boolean;
  onUnblockUser?: () => Promise<void>;
  onMessageClick?: (messageId: string) => void;
  isArchived?: boolean;
  onArchive?: () => Promise<void>;
  backButton?: boolean;
}

const REPORT_REASONS = [
  "inappropriate",
  "fraud",
  "harassment",
  "spam",
  "fake",
  "other",
] as const;

function SettingsModalShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(open);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-md rounded-xl border bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          aria-label={t("common.close", "Fermer")}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          ) : null}
        </div>

        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConversationSettings({
  otherUser,
  messages = [],
  onClose,
  onDeleteConversation,
  onBlockUser,
  onReportUser,
  onUnblockUser,
  isMuted,
  onToggleMute,
  isBlocked,
  onMessageClick,
  isArchived,
  onArchive,
  backButton,
}: ConversationSettingsProps) {
  const { t, i18n } = useTranslation();
  const [confirmAction, setConfirmAction] = useState<"delete" | "block" | "unblock" | "report" | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = otherUser?.account_type === "company"
    ? otherUser.company_name
    : otherUser?.full_name || t("common.unknown", { defaultValue: "Unknown" });

  const searchResults = searchQuery.trim().length >= 2
    ? messages.filter((m) =>
        m.content
        && !m.content.startsWith("[FILE:")
        && !m.content.startsWith("[AUDIO:")
        && !m.deleted_at
        && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (confirmAction === "delete") await onDeleteConversation();
      if (confirmAction === "block") await onBlockUser();
      if (confirmAction === "unblock") await onUnblockUser?.();
      setConfirmAction(null);
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason || !reportDetails.trim()) return;
    setLoading(true);
    try {
      await onReportUser(reportReason, reportDetails);
      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");
      setShowSuccessModal(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const confirmTexts = {
    delete: {
      title: t("messages.deleteConversationTitle"),
      description: t("messages.deleteConversationDesc"),
      button: t("common.delete"),
      color: "bg-red-500 hover:bg-red-600",
    },
    block: {
      title: t("messages.blockUserTitle", { name: displayName }),
      description: t("messages.blockUserDesc", { name: displayName }),
      button: t("messages.block"),
      color: "bg-red-500 hover:bg-red-600",
    },
    report: {
      title: t("messages.reportUserTitle", { name: displayName }),
      description: t("messages.reportUserDesc"),
      button: t("messages.report"),
      color: "bg-red-500 hover:bg-red-600",
    },
    unblock: {
      title: t("messages.unblockUserTitle", { name: displayName }),
      description: t("messages.unblockUserDesc", { name: displayName }),
      button: t("messages.unblockUser", { name: displayName }),
      color: "bg-green-700 hover:bg-green-800",
    },
  };

  const reasonLabels: Record<(typeof REPORT_REASONS)[number], string> = {
    inappropriate: t("messages.reportInappropriate"),
    fraud: t("messages.reportFraud"),
    harassment: t("messages.reportHarassment"),
    spam: t("messages.reportSpam"),
    fake: t("messages.reportFake"),
    other: t("messages.reportOther"),
  };

  const neutralRowClass = "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-gray-50";
  const dangerRowClass = "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer text-red-600 hover:bg-red-50";
  const successRowClass = "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer text-green-700 hover:bg-green-50";

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex h-18.25 shrink-0 items-center justify-between border-b bg-white p-4">
        <Button variant="ghost" size="icon" onClick={onClose} className="cursor-pointer">
          {backButton ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
        <h3 className="min-w-0 flex-1 px-3 text-lg font-semibold">{t("messages.settings")}</h3>
        <div className="w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Search className="h-4 w-4" />
              {t("messages.searchInConversation")}
            </p>
          </div>
          <div className="p-3">
            <Input
              placeholder={t("messages.searchInConversation")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          {searchQuery.trim().length >= 2 && (
            <div className="max-h-48 overflow-y-auto border-t">
              {searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">{t("messages.noResults")}</p>
              ) : (
                searchResults.map((message) => {
                  const senderName = message.sender?.account_type === "company"
                    ? message.sender.company_name
                    : message.sender?.full_name;
                  return (
                    <button
                      key={message.id}
                      type="button"
                      className="w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                      onClick={() => onMessageClick?.(message.id)}
                    >
                      <p className="truncate text-sm text-gray-900">{message.content}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {senderName}
                        {" · "}
                        {new Date(message.created_at).toLocaleString(i18n.language)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="divide-y overflow-hidden rounded-xl border bg-white">
          <button type="button" onClick={onToggleMute} className={neutralRowClass}>
            {isMuted
              ? <Bell className="h-5 w-5 text-gray-500" />
              : <BellOff className="h-5 w-5 text-gray-500" />}
            <span className="cursor-pointer text-sm text-gray-700">
              {isMuted ? t("messages.unmuteNotifications") : t("messages.muteNotifications")}
            </span>
          </button>

          {onArchive && (
            <button type="button" onClick={onArchive} className={neutralRowClass}>
              {isArchived
                ? <ArchiveRestore className="h-5 w-5 text-gray-500" />
                : <Archive className="h-5 w-5 text-gray-500" />}
              <span className="text-sm text-gray-700">
                {isArchived ? t("messages.unarchiveConversation") : t("messages.archiveConversation")}
              </span>
            </button>
          )}
        </div>

        <div className="divide-y overflow-hidden rounded-xl border bg-white">
          <button type="button" onClick={() => setConfirmAction("delete")} className={dangerRowClass}>
            <Trash2 className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">{t("messages.deleteConversation")}</span>
          </button>

          {isBlocked ? (
            <button type="button" onClick={() => setConfirmAction("unblock")} className={successRowClass}>
              <Ban className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                {t("messages.unblockUser", { name: displayName })}
              </span>
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmAction("block")} className={dangerRowClass}>
              <Ban className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-600">
                {t("messages.blockUser", { name: displayName })}
              </span>
            </button>
          )}

          <button type="button" onClick={() => setShowReportModal(true)} className={dangerRowClass}>
            <Flag className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">
              {t("messages.reportUser", { name: displayName })}
            </span>
          </button>
        </div>
      </div>

      <SettingsModalShell
        open={!!confirmAction && confirmAction !== "report"}
        onClose={() => setConfirmAction(null)}
        title={confirmAction && confirmAction !== "report" ? confirmTexts[confirmAction].title : ""}
        description={confirmAction && confirmAction !== "report" ? confirmTexts[confirmAction].description : undefined}
        footer={(
          <>
            <Button className="cursor-pointer" variant="outline" onClick={() => setConfirmAction(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              className={`cursor-pointer text-white ${confirmAction && confirmAction !== "report" ? confirmTexts[confirmAction].color : ""}`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading
                ? t("messages.inProgress")
                : confirmAction && confirmAction !== "report"
                  ? confirmTexts[confirmAction].button
                  : null}
            </Button>
          </>
        )}
      />

      <SettingsModalShell
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={t("messages.reportUserTitle", { name: displayName })}
        description={t("messages.reportUserDesc")}
        footer={(
          <>
            <Button className="cursor-pointer" variant="outline" onClick={() => setShowReportModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="cursor-pointer bg-red-500 text-white hover:bg-red-600"
              onClick={handleReport}
              disabled={loading || !reportReason || !reportDetails.trim()}
            >
              {loading ? t("messages.sending") : t("messages.sendReport")}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("messages.reportReason")}
            </label>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm"
                >
                  <span className={cn("truncate", !reportReason && "text-muted-foreground")}>
                    {reportReason
                      ? reasonLabels[reportReason as (typeof REPORT_REASONS)[number]]
                      : t("messages.reportSelectReason")}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                {REPORT_REASONS.map((reason) => (
                  <DropdownMenuItem
                    key={reason}
                    className={cn("cursor-pointer", reportReason === reason && "bg-accent")}
                    onClick={() => setReportReason(reason)}
                  >
                    {reasonLabels[reason]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("messages.reportDetails")}
            </label>
            <Textarea
              placeholder={t("messages.reportDetailsPlaceholder")}
              className="min-h-25 resize-none"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </div>
        </div>
      </SettingsModalShell>

      <SettingsModalShell
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={t("messages.reportSent")}
        description={t("messages.reportSentDesc")}
        className="text-center"
        footer={(
          <Button
            className="w-full cursor-pointer bg-green-700 text-white hover:bg-green-800"
            onClick={() => {
              setShowSuccessModal(false);
              onClose();
            }}
          >
            {t("common.close")}
          </Button>
        )}
      >
        <div className="flex justify-center py-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Flag className="h-8 w-8 text-green-700" />
          </div>
        </div>
      </SettingsModalShell>
    </div>
  );
}
