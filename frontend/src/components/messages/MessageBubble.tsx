"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageActions } from './MessageActions';
import { AlertCircle, RefreshCw,Check, X, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RepliedMessage } from './RepliedMessage';
import { MessageReactions } from './MessageReactions';
import { sanitizeAndFormatMessage } from '@/lib/sanitize';
import { useTranslation } from 'react-i18next';

interface Reaction {  
  emoji: string;
  user_ids: string[];
}

interface MessageBubbleProps {
  messageId: string;
  content: string;
  isOwn: boolean;
  currentUserId: string;  
  status?: 'sending' | 'sent' | 'failed';
  editedAt?: string | null;
  deletedAt?: string | null;
  repliedTo?: {
    id: string;
    content: string;
    sender_name?: string;
    deleted_at?: string | null;
  } | null;
  onReplyClick?: (messageId: string) => void;
  otherUser?: {
    avatar_url?: string | null;
    account_type?: string;
    company_name?: string;
    full_name?: string;
  } | null;
  isHovered: boolean;
  isMenuOpen: boolean;
  isSelected: boolean;
  openMenuKey: string | null;
  reactions?: Reaction[];  
  setOpenMenuKey: (key: string | null) => void;
  setHoveredMessageId: (key: string | null) => void;
  setSelectedMessageKey: (key: string | null) => void;
  onReact?: (emoji: string) => void;  
  onReply?: () => void;
  onEdit?: (newContent: string) => void;
  isPinned?: boolean;
  onPin?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  onReactionToggle?: (emoji: string) => void;
}

export function MessageBubble({
  messageId,
  content,
  isOwn,
  currentUserId,  
  status = 'sent',
  editedAt,
  deletedAt,
  isPinned,
  repliedTo,
  onReplyClick,
  otherUser,
  isHovered,
  isMenuOpen,
  isSelected,
  openMenuKey,
  reactions,  
  setOpenMenuKey,
  setHoveredMessageId,
  setSelectedMessageKey,
  onReact,
  onReply,
  onEdit,
  onPin,
  onDelete,
  onRetry,
  onReactionToggle,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showActions = isHovered || isMenuOpen || isSelected || isEmojiOpen;
  const isSending = status === 'sending';
  const isFailed = status === 'failed';
  const isDeleted = Boolean(deletedAt);
  const rootRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const scheduleHide = useCallback(() => {
    if (openMenuKey === messageId || isSelected || isEmojiOpen) return;
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredMessageId(null);
    }, 150);
  }, [openMenuKey, messageId, isSelected, isEmojiOpen, setHoveredMessageId]);

  const cancelHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);


  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Placer le curseur à la fin
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);


  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() && editedContent.trim() !== content) {
      onEdit?.(editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleMouseLeave = () => {
    scheduleHide();
  };

  return (
    <div
      ref={rootRef}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={() => {
        cancelHide();
        if (!isSending) setHoveredMessageId(messageId);
      }}
      onMouseLeave={handleMouseLeave}
      onClick={() => !isSending && setSelectedMessageKey(isSelected ? null : messageId)}
      className={`flex gap-2 items-start ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}
    >
  {/* Avatar + Message */}
  <div className="flex items-end gap-2">
    {/* Avatar pour les messages de l'autre personne */}
    {!isOwn && (
      <Avatar className="h-8 w-8 shrink-0">
        {otherUser?.avatar_url ? (
          <AvatarImage src={otherUser.avatar_url} />
        ) : null}
        <AvatarFallback className="text-xs bg-green-100 text-green-800 font-semibold">
          {(() => {
            if (!otherUser) return 'U';
            const name = otherUser.account_type === 'company'
              ? otherUser.company_name
              : otherUser.full_name;
            return (name || 'U').charAt(0).toUpperCase();
          })()}
        </AvatarFallback>
      </Avatar>
    )}

    {/* Conteneur pour replied + bulle + reactions */}
    <div className="relative flex flex-col gap-1  w-fit">
      {/* Message cité */}
      {repliedTo && !repliedTo.deleted_at && !isDeleted && (
        <div className="max-w-xs md:max-w-md">
          <RepliedMessage
            repliedTo={repliedTo}
            onMessageClick={onReplyClick || (() => {})}
          />
        </div>
      )}

      {/* INDICATEUR "modifié" */}
      {editedAt && !isDeleted && (
        <p className={`text-xs mr-2 ${isOwn ? 'text-right text-gray-400' : 'text-left text-gray-400'}`}>
          {t('messages.edited')}
        </p>
      )}

      {/* Container pour bulle + actions (sur la même ligne) */}
      <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Bulle de message avec réaction en position absolue */}
        <div className="relative">
          <div
              className={`rounded-2xl px-4 py-2 max-w-xs md:max-w-md ${
                isOwn
                  ? isFailed
                    ? 'bg-red-100 border border-red-300 text-gray-900'
                    : 'bg-green-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              } ${isSending ? 'opacity-60' : ''}`}
            >
            {/* MODE ÉDITION */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`min-h-15 text-sm resize-none ${
                    isOwn ? 'bg-green-600 text-white placeholder:text-green-200' : 'bg-white'
                  }`}
                  placeholder={t('messages.editPlaceholder')}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 cursor-pointer ${isOwn ? 'text-white hover:bg-green-600' : ''}`}
                    onClick={handleSaveEdit}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t('common.save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 cursor-pointer ${isOwn ? 'text-white hover:bg-green-600' : ''}`}
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* MODE LECTURE */}
                <div className="text-sm wrap-break-word">
                  {isDeleted ? (
                    <span className="italic text-gray-400">{t('messages.deleted')}</span>
                  ) : (
                    <span 
                      dangerouslySetInnerHTML={{ 
                        __html: sanitizeAndFormatMessage(content) 
                      }} 
                    />
                  )}
                </div>

                {isPinned && !isDeleted && (
                  <div className="absolute -top-2 -right-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-100">
                    <Pin className="h-3 w-3 text-green-700" />
                  </div>
                )}

            

              </>
            )}
          </div>

          {/* Réactions en position absolue - en bas à droite */}
          {reactions && reactions.length > 0 && (
            <div className={`absolute -bottom-4 ${isOwn ? '-left-2' : '-right-2'}`}>
              <MessageReactions
                reactions={reactions}
                currentUserId={currentUserId}
                onReactionClick={onReactionToggle || (() => {})}
                isOwn={isOwn}
              />
            </div>
          )}

          {/* Boutons d'action - alignés avec la bulle */}
        {showActions && !isSending && !isFailed && !isDeleted && !isEditing && (
          <div
            ref={actionsRef}
            className={`absolute ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-0 bottom-0 flex items-center`}
            onMouseEnter={() => {
              cancelHide();
              if (!isSending) setHoveredMessageId(messageId);
            }}
            onMouseLeave={scheduleHide}
          >
            <MessageActions
              messageKey={messageId}
              openMenuKey={openMenuKey}
              onEmojiOpenChange={setIsEmojiOpen}
              setOpenMenuKey={setOpenMenuKey}
              isPinned={isPinned}
              onReact={(emoji) => {
                onReact?.(emoji);
                setIsEmojiOpen(false);
                setOpenMenuKey(null);
                setSelectedMessageKey(null);
                setHoveredMessageId(null);
              }}
              onReply={onReply}
              onEdit={isOwn ? handleStartEdit : undefined}
              onPin={onPin}
              onDelete={onDelete}
            />
          </div>
        )}

        </div>


        {/* Bouton Retry pour messages failed */}
        {isFailed && isOwn && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-red-50 border border-red-200 hover:bg-red-100 rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry?.();
                }}
              >
                <RefreshCw className="h-3 w-3 text-red-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('common.retry')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Indicateur failed */}
      {isFailed && isOwn && (
        <div className="absolute -bottom-1 -right-1">
          <AlertCircle className="h-4 w-4 text-red-600" />
        </div>
      )}

    </div>
  </div>
</div>
  );
}