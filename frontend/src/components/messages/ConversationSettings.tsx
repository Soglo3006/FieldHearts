"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, BellOff, Bell, Trash2, Ban, Flag, X, Archive, ArchiveRestore, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

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
  const [confirmAction, setConfirmAction] = useState<'delete' | 'block' | 'unblock' | 'report' | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = otherUser?.account_type === 'company'
    ? otherUser.company_name
    : otherUser?.full_name || t("common.unknown", { defaultValue: "Unknown" });

  // Filtrer les messages selon la recherche
  const searchResults = searchQuery.trim().length >= 2
    ? messages.filter(m =>
        m.content &&
        !m.content.startsWith('[FILE:') &&
        !m.content.startsWith('[AUDIO:') &&
        !m.deleted_at &&
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (confirmAction === 'delete') await onDeleteConversation();
      if (confirmAction === 'block') await onBlockUser();
      if (confirmAction === 'unblock') await onUnblockUser?.();
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
      setReportReason('');
      setReportDetails('');
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
      color: 'bg-red-500 hover:bg-red-600',
    },
    block: {
      title: t("messages.blockUserTitle", { name: displayName }),
      description: t("messages.blockUserDesc", { name: displayName }),
      button: t("messages.block"),
      color: 'bg-red-500 hover:bg-red-600',
    },
    report: {
      title: t("messages.reportUserTitle", { name: displayName }),
      description: t("messages.reportUserDesc"),
      button: t("messages.report"),
      color: 'bg-red-500 hover:bg-red-600',
    },
    unblock: {
      title: t("messages.unblockUserTitle", { name: displayName }),
      description: t("messages.unblockUserDesc", { name: displayName }),
      button: t("messages.unblockUser", { name: displayName }),
      color: 'bg-green-700 hover:bg-green-800',
    },
  };

  const neutralRowClass = 'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-gray-50';
  const dangerRowClass = 'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer text-red-600 hover:bg-red-50';
  const successRowClass = 'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer text-green-700 hover:bg-green-50';

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 p-4 bg-white border-b flex items-center justify-between h-18.25">
        <Button variant="ghost" size="icon" onClick={onClose} className='cursor-pointer'>
          {backButton ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
        <h3 className="text-lg font-semibold flex-1 min-w-0 px-3">{t("messages.settings")}</h3>
        <div className="w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* RECHERCHE */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              {t("messages.searchInConversation")}
            </p>
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("messages.searchPlaceholder")}
                className="pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  type="button"
                  title={t("common.clear", { defaultValue: "Clear" })}
                  aria-label={t("common.clear", { defaultValue: "Clear" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Résultats */}
            {searchQuery.trim().length >= 2 && (
              <div className="mt-2">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">{t("messages.noResults")}</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    <p className="text-xs text-gray-400 mb-2">
                      {searchResults.length > 1 ? t("messages.resultCountPlural", { count: searchResults.length }) : t("messages.resultCount", { count: searchResults.length })}
                    </p>
                    {searchResults.map((msg) => {
                      const senderName = msg.sender?.account_type === 'company'
                        ? msg.sender.company_name
                        : msg.sender?.full_name || t("messages.me");
                      
                      // Highlight le mot recherché
                      const idx = msg.content.toLowerCase().indexOf(searchQuery.toLowerCase());
                      const before = msg.content.substring(0, idx);
                      const match = msg.content.substring(idx, idx + searchQuery.length);
                      const after = msg.content.substring(idx + searchQuery.length);
                      return (
                        <button
                          key={msg.id}
                          onClick={() => {
                            onMessageClick?.(msg.id);
                            onClose();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-medium text-gray-700">{senderName}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {before}
                            <span className="bg-yellow-200 text-yellow-900 rounded px-0.5">{match}</span>
                            {after.length > 30 ? after.substring(0, 30) + '...' : after}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(msg.created_at).toLocaleDateString(i18n.language, {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {searchQuery.trim().length === 1 && (
              <p className="text-xs text-gray-400 text-center py-2">{t("messages.minCharsRequired")}</p>
            )}
          </div>
        </div>

        {/* Notifications + Archive */}
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          <button
            onClick={onToggleMute}
            className={neutralRowClass}
          >
            {isMuted
              ? <Bell className="h-5 w-5 text-gray-500" />
              : <BellOff className="h-5 w-5 text-gray-500" />
            }
            <span className="text-sm text-gray-700 cursor-pointer">
              {isMuted ? t("messages.unmuteNotifications") : t("messages.muteNotifications")}
            </span>
          </button>

          {onArchive && (
            <button
              onClick={onArchive}
              className={neutralRowClass}
            >
              {isArchived
                ? <ArchiveRestore className="h-5 w-5 text-gray-500" />
                : <Archive className="h-5 w-5 text-gray-500" />
              }
              <span className="text-sm text-gray-700">
                {isArchived ? t("messages.unarchiveConversation") : t("messages.archiveConversation")}
              </span>
            </button>
          )}
        </div>

        {/* Actions dangereuses */}
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          <button
            onClick={() => setConfirmAction('delete')}
            className={dangerRowClass}
          >
            <Trash2 className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">{t("messages.deleteConversation")}</span>
          </button>

          {isBlocked ? (
            <button
              onClick={() => setConfirmAction('unblock')}
              className={successRowClass}
            >
              <Ban className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">{t("messages.unblockUser", { name: displayName })}</span>
            </button>
          ) : (
            <button
              onClick={() => setConfirmAction('block')}
              className={dangerRowClass}
            >
              <Ban className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-600">{t("messages.blockUser", { name: displayName })}</span>
            </button>
          )}

          <button
            onClick={() => setShowReportModal(true)}
            className={dangerRowClass}
          >
            <Flag className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">{t("messages.reportUser", { name: displayName })}</span>
          </button>
        </div>
      </div>

      {/* Modal confirmation */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction && confirmTexts[confirmAction].title}</DialogTitle>
            <DialogDescription>
              {confirmAction && confirmTexts[confirmAction].description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button className='cursor-pointer' variant="outline" onClick={() => setConfirmAction(null)}>{t("common.cancel")}</Button>
            <Button
              className={`text-white cursor-pointer ${confirmAction && confirmTexts[confirmAction].color}`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? t("messages.inProgress") : confirmAction && confirmTexts[confirmAction].button}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal signalement */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("messages.reportUserTitle", { name: displayName })}</DialogTitle>
            <DialogDescription>{t("messages.reportUserDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">{t("messages.reportReason")}</label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("messages.reportSelectReason")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inappropriate">{t("messages.reportInappropriate")}</SelectItem>
                  <SelectItem value="fraud">{t("messages.reportFraud")}</SelectItem>
                  <SelectItem value="harassment">{t("messages.reportHarassment")}</SelectItem>
                  <SelectItem value="spam">{t("messages.reportSpam")}</SelectItem>
                  <SelectItem value="fake">{t("messages.reportFake")}</SelectItem>
                  <SelectItem value="other">{t("messages.reportOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">{t("messages.reportDetails")}</label>
              <Textarea
                placeholder={t("messages.reportDetailsPlaceholder")}
                className="min-h-25 resize-none"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button className='cursor-pointer' variant="outline" onClick={() => setShowReportModal(false)}>{t("common.cancel")}</Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white cursor-pointer"
              onClick={handleReport}
              disabled={loading || !reportReason || !reportDetails.trim()}
            >
              {loading ? t("messages.sending") : t("messages.sendReport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal succès */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Flag className="h-8 w-8 text-green-700" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">{t("messages.reportSent")}</DialogTitle>
              <DialogDescription className="text-center">
                {t("messages.reportSentDesc")}
              </DialogDescription>
            </DialogHeader>
            <Button
              className="bg-green-700 hover:bg-green-800 text-white w-full cursor-pointer"
              onClick={() => { setShowSuccessModal(false); onClose(); }}
            >
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}