"use client";

import { useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageBubble } from "./MessageBubble";
import { FileMessage } from "./FileMessage";
import { VoiceMessage } from "./VoiceMessage";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { getIntlLocale } from "@/lib/locale";

interface MessageReaction {
  emoji: string;
  user_ids: string[];
}

interface RepliedTo {
  id: string;
  content: string;
  user_id: string;
  sender_name?: string;
  deleted_at?: string | null;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  status?: "sending" | "sent" | "failed";
  pinned_at?: string | null;
  edited_at?: string | null;
  read_at?: string | null;
  deleted_at?: string | null;
  reactions?: MessageReaction[];
  replied_to?: RepliedTo | null;
  replied_to_message_id?: string | null;
  sender?: { account_type?: string; company_name?: string; full_name?: string; avatar_url?: string | null } | null;
  client_temp_id?: string;
}

interface OtherUser {
  id?: string;
  full_name?: string;
  company_name?: string;
  account_type?: string;
  avatar_url?: string | null;
}

interface Props {
  message: Message;
  showDate: boolean;
  dateLabel: string;
  isOwn: boolean;
  currentUserId: string;
  otherUser?: OtherUser | null;
  hoveredMessageId: string | null;
  openMenuKey: string | null;
  selectedMessageKey: string | null;
  hoverTimeoutRef: React.MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>;
  setHoveredMessageId: (id: string | null) => void;
  setOpenMenuKey: (id: string | null) => void;
  setSelectedMessageKey: (id: string | null) => void;
  retryMessage?: (tempId: string) => Promise<void>;
  onReply?: (message: Message) => void;
  onReplyClick?: (messageId: string) => void;
  onReactionToggle?: (messageId: string, emoji: string, reactions: MessageReaction[]) => Promise<void>;
  onEdit?: (messageId: string, content: string) => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onDelete?: (messageId: string) => Promise<void>;
}

export function MessageItem({
  message, showDate, dateLabel, isOwn, currentUserId, otherUser,
  hoveredMessageId, openMenuKey, selectedMessageKey, hoverTimeoutRef,
  setHoveredMessageId, setOpenMenuKey, setSelectedMessageKey,
  retryMessage, onReply, onReplyClick, onReactionToggle, onEdit, onPin, onDelete,
}: Props) {
  const { t, i18n } = useTranslation();
  const [suppressAudioActionsUntilLeave, setSuppressAudioActionsUntilLeave] = useState(false);
  const isDeleted = Boolean(message.deleted_at);
  const isAudio = !isDeleted && message.content.includes("[AUDIO:");
  const isFile = !isDeleted && !isAudio && message.content.includes("[FILE:");
  const timeLocale = getIntlLocale(i18n.language, { fr: 'fr-FR', en: 'en-CA' });

  const hoverHandlers = {
    onMouseEnter: () => {
      const existing = hoverTimeoutRef.current.get(message.id + '_hide');
      if (existing) { clearTimeout(existing); hoverTimeoutRef.current.delete(message.id + '_hide'); }
      // Delai d'apparition: n'affiche les actions que si le curseur reste 250ms
      const showT = setTimeout(() => {
        setSuppressAudioActionsUntilLeave(false);
        setHoveredMessageId(message.id);
        hoverTimeoutRef.current.delete(message.id + '_show');
      }, 150);
      hoverTimeoutRef.current.set(message.id + '_show', showT);
    },
    onMouseLeave: () => {
      // Annuler le delai d'apparition si la souris est deja partie
      const showT = hoverTimeoutRef.current.get(message.id + '_show');
      if (showT) { clearTimeout(showT); hoverTimeoutRef.current.delete(message.id + '_show'); }
      setSuppressAudioActionsUntilLeave(false);
      if (openMenuKey === message.id) return;
      const t = setTimeout(() => {
        setHoveredMessageId(null);
        hoverTimeoutRef.current.delete(message.id + '_hide');
      }, 150);
      hoverTimeoutRef.current.set(message.id + '_hide', t);
    },
  };

  const showActions = !suppressAudioActionsUntilLeave && (hoveredMessageId === message.id || openMenuKey === message.id || selectedMessageKey === message.id);
  const clearAudioInteractionState = () => {
    setSuppressAudioActionsUntilLeave(true);
    setHoveredMessageId(null);
    setOpenMenuKey(null);
    setSelectedMessageKey(null);
  };

  return (
    <div id={`message-${message.id}`}>
      {showDate && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium shrink-0">{dateLabel}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      <div className={`flex flex-col gap-2 ${isOwn ? "items-end" : "items-start"}`}>
        {isAudio ? (() => {
          const match = message.content.match(/\[AUDIO:(.*?):(\d+)\]/);
          const audioUrl = match ? match[1] : "";
          const dur = match ? parseInt(match[2]) : 0;
          return (
            <div {...hoverHandlers} className={`relative flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
              {!isOwn && (
                <Avatar className="h-8 w-8 shrink-0">
                  {otherUser?.avatar_url ? <AvatarImage src={otherUser.avatar_url} /> : null}
                  <AvatarFallback className="text-xs bg-green-100 text-green-800 font-semibold">
                    {(otherUser?.account_type === "company" ? otherUser?.company_name : otherUser?.full_name || "U")?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <VoiceMessage audioUrl={audioUrl} duration={dur} isOwn={isOwn} />
              {message.reactions && message.reactions.length > 0 && (
                <div className={`absolute -bottom-4 ${isOwn ? "-left-2" : "-right-2"}`}>
                  <MessageReactions
                    reactions={message.reactions} currentUserId={currentUserId}
                    onReactionClick={(emoji) => onReactionToggle?.(message.id, emoji, message.reactions || [])}
                    isOwn={isOwn}
                  />
                </div>
              )}
              {showActions && (
                <div
                  className={`absolute ${isOwn ? "right-full mr-2" : "left-full ml-2"} top-1/2 -translate-y-1/2`}
                  {...hoverHandlers}
                >
                  <MessageActions
                    messageKey={message.id} openMenuKey={openMenuKey} setOpenMenuKey={setOpenMenuKey}
                    onActionComplete={clearAudioInteractionState}
                    onReact={(emoji) => onReactionToggle?.(message.id, emoji, message.reactions || [])}
                    onReply={() => onReply?.(message)}
                    onDelete={() => onDelete?.(message.id)}
                    showDelete={isOwn}
                  />
                </div>
              )}
            </div>
          );
        })() : isFile ? (() => {
          const match = message.content.match(/\[FILE:(.*?)\]/);
          const fileUrl = match ? match[1] : "";
          const text = message.content.replace(/\[FILE:.*?\]/, "").trim();
          const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(fileUrl);
          return (
            <FileMessage
              messageId={message.id} text={text} fileUrl={fileUrl} isImage={isImage}
              isOwn={isOwn} currentUserId={currentUserId} status={message.status}
              repliedTo={message.replied_to} onReplyClick={onReplyClick}
              reactions={message.reactions} otherUser={otherUser}
              hoveredMessageId={hoveredMessageId} openMenuKey={openMenuKey} selectedMessageKey={selectedMessageKey}
              setHoveredMessageId={setHoveredMessageId} setOpenMenuKey={setOpenMenuKey} setSelectedMessageKey={setSelectedMessageKey}
              onReact={(emoji) => onReactionToggle?.(message.id, emoji, message.reactions || [])}
              onReactionToggle={(emoji) => onReactionToggle?.(message.id, emoji, message.reactions || [])}
              isPinned={!!message.pinned_at}
              onReply={() => onReply?.(message)}
              onPin={() => onPin?.(message.id, !!message.pinned_at)}
              onDelete={() => onDelete?.(message.id)}
            />
          );
        })() : (
          <MessageBubble
            messageId={message.id} content={message.content} isOwn={isOwn}
            currentUserId={currentUserId} status={message.status} createdAt={message.created_at} editedAt={message.edited_at}
            deletedAt={message.deleted_at}
            isPinned={!!message.pinned_at} repliedTo={message.replied_to} onReplyClick={onReplyClick}
            otherUser={otherUser} isHovered={hoveredMessageId === message.id}
            isMenuOpen={openMenuKey === message.id} isSelected={selectedMessageKey === message.id}
            openMenuKey={openMenuKey} reactions={message.reactions}
            setOpenMenuKey={setOpenMenuKey} setHoveredMessageId={setHoveredMessageId} setSelectedMessageKey={setSelectedMessageKey}
            onReply={() => onReply?.(message)}
            onDelete={() => onDelete?.(message.id)}
            onEdit={(newContent) => onEdit?.(message.id, newContent)}
            onPin={() => onPin?.(message.id, !!message.pinned_at)}
            onRetry={() => { if (message.status === "failed") retryMessage?.(message.id); }}
            onReact={(emoji) => onReactionToggle?.(message.id, emoji, message.reactions || [])}
            onReactionToggle={(emoji) => onReactionToggle?.(message.id, emoji, message.reactions || [])}
          />
        )}
      </div>

      <div className={`flex items-center gap-2 mt-1 px-1 ${isOwn ? "justify-end" : "justify-start"}`}>
        <span className="text-xs text-gray-500">
          {new Date(message.created_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })}
        </span>
        {isOwn && message.status !== "sending" && message.status !== "failed" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-xs cursor-help ${message.read_at ? "text-green-600" : "text-gray-400"}`}>
                {message.read_at ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {message.read_at
                  ? t('messages.readAt', { time: new Date(message.read_at).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' }) })
                  : t('messages.sent')}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
