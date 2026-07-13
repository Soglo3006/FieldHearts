"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { MessageThread } from "@/components/messages/MessageThread";
import { ChatInputArea } from "@/components/messages/ChatInputArea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/Spinner";
import { findExistingChat, getOrCreateDirectChat } from "@/lib/chatUtils";
import { prepareDraftMessageTarget, DraftMessagePreparationError } from "@/lib/draftMessage";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export type ConversationModalUser = {
  id: string;
  full_name?: string | null;
  company_name?: string | null;
  account_type?: string | null;
  avatar_url?: string | null;
};

type Props = {
  otherUserId: string;
  otherUser?: ConversationModalUser | null;
  onClose: () => void;
};

export default function ConversationModal({ otherUserId, otherUser: otherUserProp, onClose }: Props) {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  useScrollLock(true);

  const [chatId, setChatId] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [otherUser, setOtherUser] = useState<ConversationModalUser | null>(otherUserProp ?? null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [blockCheckLoading, setBlockCheckLoading] = useState(true);

  const [messageInput, setMessageInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    user_id: string;
    sender_name?: string;
  } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [selectedMessageKey, setSelectedMessageKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    messages,
    loading: messagesLoading,
    sending,
    sendMessage,
    retryMessage,
    hasMore,
    loadingMore,
    loadMore,
  } = useMessages(chatId);

  const displayName =
    otherUser?.account_type === "company"
      ? otherUser.company_name || otherUser.full_name || t("messages.unknownUser", "Utilisateur")
      : otherUser?.full_name || t("messages.unknownUser", "Utilisateur");

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!user?.id || !otherUserId) return;
    if (user.id === otherUserId) {
      toast.error(t("messages.cannotMessageSelf", "You cannot message yourself!"));
      onCloseRef.current();
      return;
    }

    let cancelled = false;

    (async () => {
      setBooting(true);
      setBlockCheckLoading(true);

      try {
        const [{ data: iBlocked }, { data: theyBlocked }] = await Promise.all([
          supabase
            .from("blocked_users")
            .select("id")
            .eq("blocker_id", user.id)
            .eq("blocked_user_id", otherUserId)
            .maybeSingle(),
          supabase
            .from("blocked_users")
            .select("id")
            .eq("blocker_id", otherUserId)
            .eq("blocked_user_id", user.id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        if (iBlocked || theyBlocked) {
          setIsBlocked(!!iBlocked);
          setIsBlockedByOther(!!theyBlocked);
          setBlockCheckLoading(false);
          toast.error(t("messages.cannotStartChatBlocked"));
          onCloseRef.current();
          return;
        }

        setIsBlocked(false);
        setIsBlockedByOther(false);
        setBlockCheckLoading(false);

        if (otherUserProp) {
          if (!cancelled) setOtherUser({ ...otherUserProp, id: otherUserId });
        } else {
          const headers: HeadersInit = {};
          if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
          }
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${otherUserId}`, {
            headers,
          });
          if (res.ok) {
            const profile = await res.json();
            if (!cancelled) {
              setOtherUser({
                id: otherUserId,
                full_name: profile?.full_name ?? null,
                company_name: profile?.company_name ?? null,
                account_type: profile?.account_type ?? null,
                avatar_url: profile?.avatar_url ?? profile?.avatar ?? null,
              });
            }
          } else if (!cancelled) {
            setOtherUser({ id: otherUserId });
          }
        }

        const existing = await findExistingChat(user.id, otherUserId);
        if (cancelled) return;
        setChatId(existing);
      } catch {
        if (!cancelled) toast.error(t("messages.failedToSend"));
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // otherUserProp is initial seed only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, otherUserId, session?.access_token, t]);

  const removeAttachment = useCallback(() => {
    setAttachedFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error(t("messages.invalidFileType"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("messages.fileTooLarge"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setAttachedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const ensureChat = useCallback(async () => {
    if (chatId) return chatId;
    if (isBlocked || isBlockedByOther) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return null;
    }
    const id = await getOrCreateDirectChat(otherUserId);
    if (id) setChatId(id);
    return id;
  }, [chatId, isBlocked, isBlockedByOther, otherUserId, t]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !attachedFile) return;
    if (isBlocked || isBlockedByOther) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return;
    }

    let uploadedFilePath: string | null = null;
    let fileSent = false;

    try {
      const prepared = await prepareDraftMessageTarget<File>({
        attachment: attachedFile,
        createUploadPath: attachedFile
          ? () => {
              const fileExt = attachedFile.name.split(".").pop();
              return `${user?.id}/${Date.now()}.${fileExt}`;
            }
          : undefined,
        uploadAttachment: attachedFile
          ? async (fileName, file) => {
              const { error: uploadError } = await supabase.storage
                .from("chat-attachments")
                .upload(fileName, file);
              if (uploadError) throw uploadError;
              const { data } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
              return data.publicUrl;
            }
          : undefined,
        ensureChat,
        removeUploadedAttachment: async (fileName) => {
          await supabase.storage.from("chat-attachments").remove([fileName]);
        },
      });

      uploadedFilePath = prepared.uploadedFilePath;
      const targetChatId = prepared.chatId;
      const fileUrl = prepared.fileUrl;

      if (messageInput.trim() && fileUrl) {
        await sendMessage(messageInput.trim(), replyingTo?.id || null, targetChatId);
        await sendMessage(`[FILE:${fileUrl}]`, null, targetChatId);
        fileSent = true;
      } else if (fileUrl) {
        await sendMessage(`[FILE:${fileUrl}]`, replyingTo?.id || null, targetChatId);
        fileSent = true;
      } else {
        await sendMessage(messageInput.trim(), replyingTo?.id || null, targetChatId);
      }

      setMessageInput("");
      if (fileSent) removeAttachment();
      setReplyingTo(null);
    } catch (error) {
      if (error instanceof DraftMessagePreparationError) {
        toast.error(t(error.code === "upload" ? "messages.failedToUpload" : "messages.failedToSend"));
        return;
      }
      if (uploadedFilePath && !fileSent) {
        supabase.storage.from("chat-attachments").remove([uploadedFilePath]).catch(() => {});
      }
      toast.error(t("messages.failedToSend"));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (isBlocked || isBlockedByOther) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return;
    }

    let uploadedFilePath: string | null = null;
    try {
      const prepared = await prepareDraftMessageTarget<Blob>({
        attachment: audioBlob,
        createUploadPath: () => `${user?.id}/${Date.now()}.webm`,
        uploadAttachment: async (fileName, blob) => {
          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(fileName, blob);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
          return data.publicUrl;
        },
        ensureChat,
        removeUploadedAttachment: async (fileName) => {
          await supabase.storage.from("chat-attachments").remove([fileName]);
        },
      });

      uploadedFilePath = prepared.uploadedFilePath;
      const audioContent = `[AUDIO:${prepared.fileUrl}|${duration}]`;
      await sendMessage(audioContent, null, prepared.chatId);
    } catch (error) {
      if (error instanceof DraftMessagePreparationError) {
        toast.error(t(error.code === "upload" ? "messages.failedToUpload" : "messages.failedToSend"));
        return;
      }
      if (uploadedFilePath) {
        supabase.storage.from("chat-attachments").remove([uploadedFilePath]).catch(() => {});
      }
      toast.error(t("messages.failedToSend"));
    }
  };

  const handleUnblock = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_user_id", otherUserId);
    if (!error) setIsBlocked(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 flex h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden",
          "rounded-3xl bg-white shadow-xl",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t("serviceDetail.contactPerson", { name: displayName })}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {otherUser?.avatar_url ? <AvatarImage src={otherUser.avatar_url} /> : null}
              <AvatarFallback delayMs={0} className="bg-green-100 font-semibold text-green-800">
                {(displayName || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-gray-900">{displayName}</h3>
              <p className="text-xs text-gray-500">{t("messages.title")}</p>
            </div>
          </div>
          <button
            type="button"
            title={t("serviceDetail.close")}
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {booting || !user ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <MessageThread
              messages={messages}
              loading={messagesLoading && !!chatId}
              currentUserId={user.id}
              otherUser={otherUser}
              hoveredMessageId={hoveredMessageId}
              setHoveredMessageId={setHoveredMessageId}
              openMenuKey={openMenuKey}
              setOpenMenuKey={setOpenMenuKey}
              selectedMessageKey={selectedMessageKey}
              setSelectedMessageKey={setSelectedMessageKey}
              retryMessage={retryMessage}
              onReply={(message) => {
                const senderName =
                  message.sender?.account_type === "company"
                    ? message.sender.company_name
                    : message.sender?.full_name;
                setReplyingTo({
                  id: message.id,
                  content: message.content,
                  user_id: message.user_id,
                  sender_name: senderName,
                });
              }}
              hasMore={hasMore}
              loadingMore={loadingMore}
              loadMore={loadMore}
            />

            <ChatInputArea
              blockCheckLoading={blockCheckLoading}
              isBlocked={isBlocked}
              isBlockedByOther={isBlockedByOther}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              otherUserName={displayName}
              onUnblock={() => void handleUnblock()}
              messageInput={messageInput}
              onMessageChange={setMessageInput}
              onSend={() => void handleSendMessage()}
              onKeyPress={handleKeyPress}
              onVoiceMessage={handleVoiceMessage}
              sending={sending}
              attachedFile={attachedFile}
              attachmentPreview={attachmentPreview}
              onFileSelect={handleFileSelect}
              onRemoveAttachment={removeAttachment}
              fileInputRef={fileInputRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}
