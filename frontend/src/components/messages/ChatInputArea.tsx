"use client";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReplyPreview } from "@/components/messages/ReplyPreview";
import { MessageInput } from "@/components/messages/MessageInput";

interface ReplyingTo {
  id: string;
  content: string;
  user_id: string;
  sender_name?: string;
}

interface Props {
  blockCheckLoading: boolean;
  isBlocked: boolean;
  isBlockedByOther: boolean;
  replyingTo: ReplyingTo | null;
  onCancelReply: () => void;
  otherUserName: string;
  onUnblock: () => void;
  // MessageInput props
  messageInput: string;
  onMessageChange: (val: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onVoiceMessage: (blob: Blob, duration: number) => Promise<void>;
  sending: boolean;
  attachedFile: File | null;
  attachmentPreview: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInputArea({
  blockCheckLoading, isBlocked, isBlockedByOther,
  replyingTo, onCancelReply, otherUserName, onUnblock,
  messageInput, onMessageChange, onSend, onKeyPress, onVoiceMessage,
  sending, attachedFile, attachmentPreview, onFileSelect, onRemoveAttachment, fileInputRef,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
      <ReplyPreview repliedMessage={replyingTo} onCancel={onCancelReply} />

      {blockCheckLoading ? (
        <div className="border-t bg-white px-4 py-3">
          <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : isBlocked ? (
        <div className="border-t bg-white">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100">
            <Ban className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">
              {t("messages.blockedByYouNotice")}
            </p>
          </div>
          <div className="p-4 flex justify-center">
            <Button
              variant="outline"
              className="border-green-700 cursor-pointer text-green-700 hover:bg-green-50"
              onClick={onUnblock}
            >
              {t("messages.unblockUser", { name: otherUserName })}
            </Button>
          </div>
        </div>
      ) : isBlockedByOther ? (
        <div className="border-t bg-white">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
            <Ban className="h-4 w-4 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-500">
              {t("messages.blockedByOtherNotice")}
            </p>
          </div>
        </div>
      ) : (
        <MessageInput
          value={messageInput}
          onChange={onMessageChange}
          onSend={onSend}
          onKeyPress={onKeyPress}
          onVoiceMessage={onVoiceMessage}
          disabled={sending}
          attachedFile={attachedFile}
          attachmentPreview={attachmentPreview}
          onFileSelect={onFileSelect}
          onRemoveAttachment={onRemoveAttachment}
          fileInputRef={fileInputRef}
        />
      )}
    </div>
  );
}
