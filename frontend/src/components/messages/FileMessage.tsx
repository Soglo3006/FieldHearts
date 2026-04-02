"use client";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageActions } from './MessageActions';
import { RepliedMessage } from './RepliedMessage';
import { MessageReactions } from './MessageReactions';
import { sanitizeAndFormatMessage } from '@/lib/sanitize';
import { ImageLightbox } from './ImageLightbox';
import AppImage from '@/components/ui/AppImage';
import { Pin, FileText, FileIcon, FileSpreadsheet, Archive, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <FileText className="h-6 w-6 text-red-500 shrink-0" />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="h-6 w-6 text-green-600 shrink-0" />;
  if (['zip', 'rar', '7z'].includes(ext)) return <Archive className="h-6 w-6 text-yellow-600 shrink-0" />;
  return <FileIcon className="h-6 w-6 text-blue-500 shrink-0" />;
}

function getFilename(url: string, fallbackLabel: string): string {
  try {
    const decoded = decodeURIComponent(url.split('?')[0]);
    return decoded.split('/').pop() || fallbackLabel;
  } catch {
    return fallbackLabel;
  }
}

interface Reaction {
  emoji: string;
  user_ids: string[];
}

interface FileMessageProps {
  messageId: string;
  text?: string;
  fileUrl: string;
  isImage: boolean;
  isOwn: boolean;
  currentUserId: string; 
  status?: 'sending' | 'sent' | 'failed';
  repliedTo?: {
    id: string;
    content: string;
    sender_name?: string;
    deleted_at?: string | null;
  } | null;
  onReplyClick?: (messageId: string) => void;
  reactions?: Reaction[]; 
  otherUser?: {
    avatar_url?: string | null;
    account_type?: string;
    company_name?: string;
    full_name?: string;
  } | null;
  hoveredMessageId: string | null;
  openMenuKey: string | null;
  selectedMessageKey: string | null;
  setHoveredMessageId: (key: string | null) => void;
  setOpenMenuKey: (key: string | null) => void;
  setSelectedMessageKey: (key: string | null) => void;
  isPinned?: boolean;
  onReact?: (emoji: string) => void;
  onReactionToggle?: (emoji: string) => void;
  onReply?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
}

interface ImageAttachmentProps {
  fileUrl: string;
  isSending: boolean;
  altText: string;
  sendingLabel: string;
  loadingLabel: string;
  failedLabel: string;
  onOpen: () => void;
}

function ImageAttachment({
  fileUrl,
  isSending,
  altText,
  sendingLabel,
  loadingLabel,
  failedLabel,
  onOpen,
}: ImageAttachmentProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      className="relative block max-w-xs max-h-64 overflow-hidden rounded-xl cursor-pointer shadow-md"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      {(!imageLoaded || isSending) && !imageFailed && (
        <div className="flex h-64 w-64 max-w-xs items-center justify-center rounded-xl bg-gray-100 text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-medium">
              {isSending ? sendingLabel : loadingLabel}
            </span>
          </div>
        </div>
      )}

      {imageFailed ? (
        <div className="flex h-64 w-64 max-w-xs items-center justify-center rounded-xl bg-gray-100 px-4 text-center text-sm text-gray-500">
          {failedLabel}
        </div>
      ) : (
        <AppImage
          src={fileUrl}
          alt={altText}
          width={256}
          height={256}
          className={`max-w-xs max-h-64 rounded-xl object-cover transition-opacity ${imageLoaded && !isSending ? 'opacity-100' : 'absolute inset-0 opacity-0'} hover:opacity-90`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      )}
    </button>
  );
}

export function FileMessage({
  messageId,
  text,
  fileUrl,
  isImage,
  isOwn,
  currentUserId,  
  status = 'sent',
  repliedTo,
  onReplyClick,
  reactions, 
  otherUser,
  hoveredMessageId,
  openMenuKey,
  selectedMessageKey,
  setHoveredMessageId,
  setOpenMenuKey,
  setSelectedMessageKey,
  isPinned,
  onReact,
  onReactionToggle,
  onReply,
  onPin,
  onDelete,
}: FileMessageProps) {
  const { t } = useTranslation();
  const keyText = `${messageId}-text`;
  const keyImage = `${messageId}-image`;
  const fileName = getFilename(fileUrl, t('messages.file'));

  const isSending = status === 'sending';
  const isFailed = status === 'failed';

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [suppressedActionKey, setSuppressedActionKey] = useState<string | null>(null);

  const clearImageInteractionState = () => {
    setHoveredMessageId(null);
    setOpenMenuKey(null);
    setSelectedMessageKey(null);
  };

  const suppressActionsForKey = (key: string) => {
    setSuppressedActionKey(key);
    clearImageInteractionState();
  };

  const actionsVisible = (key: string) =>
    !lightboxOpen && suppressedActionKey !== key && (hoveredMessageId === key || openMenuKey === key || selectedMessageKey === key);

  const closeLightbox = () => {
    setLightboxOpen(false);
    clearImageInteractionState();
  };

  return (
    <>
      {text && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseEnter={() => !isSending && setHoveredMessageId(keyText)}
          onMouseLeave={() => {
            if (suppressedActionKey === keyText) setSuppressedActionKey(null);
            if (openMenuKey !== keyText && selectedMessageKey !== keyText) {
              setHoveredMessageId(null);
            }
          }}
          onClick={() => !isSending && setSelectedMessageKey(selectedMessageKey === keyText ? null : keyText)}
          className={`flex gap-2 items-start ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}
        >
          {/* Actions */}
          {actionsVisible(keyText) && !isSending && !isFailed && (
            <MessageActions
              messageKey={keyText}
              openMenuKey={openMenuKey}
              setOpenMenuKey={setOpenMenuKey}
              onActionComplete={() => suppressActionsForKey(keyText)}
              onReact={onReact}  
              onReply={onReply}
              onDelete={onDelete} 
            />
          )}

          {/* Avatar + Bulle */}
          <div className="flex items-end gap-2">
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

            <div className="flex flex-col gap-1">
            {repliedTo && !repliedTo.deleted_at && text && (
              <RepliedMessage
                repliedTo={repliedTo}
                onMessageClick={onReplyClick || (() => {})}
              />
            )}

            {/* Bulle avec réaction en position absolue */}
            <div className="relative">
              <div
                className={`rounded-2xl px-4 py-2 ${
                  isOwn
                    ? 'bg-green-700 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <div 
                  className="text-sm wrap-break-word"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeAndFormatMessage(text || '') 
                  }} 
                />
              </div>

              {/* Réactions en position absolue */}
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
            </div>
          </div>
          </div>
        </div>
      )}

      {isImage && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseEnter={() => !isSending && setHoveredMessageId(keyImage)}
          onMouseLeave={() => {
            if (suppressedActionKey === keyImage) setSuppressedActionKey(null);
            if (openMenuKey !== keyImage && selectedMessageKey !== keyImage) {
              setHoveredMessageId(null);
            }
          }}
          onClick={() => !isSending && setSelectedMessageKey(selectedMessageKey === keyImage ? null : keyImage)}
          className={`flex gap-2 items-center ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}
        >
          {/* Actions */}
          {actionsVisible(keyImage) && !isSending && !isFailed && (
            <MessageActions
              messageKey={keyImage}
              openMenuKey={openMenuKey}
              setOpenMenuKey={setOpenMenuKey}
              onActionComplete={() => suppressActionsForKey(keyImage)}
              isPinned={isPinned}
              onReact={onReact}
              onReply={onReply}
              onPin={onPin}
              onDelete={onDelete}
            />
          )}

          {/* Avatar + Image */}
          <div className="flex items-end gap-2">
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

            <div className="flex flex-col gap-1">
            {repliedTo && !repliedTo.deleted_at && (
              <RepliedMessage
                repliedTo={repliedTo}
                onMessageClick={onReplyClick || (() => {})}
              />
            )}

            {/* Image avec réaction en position absolue */}
            <div className="relative">
              <ImageAttachment
                key={fileUrl}
                fileUrl={fileUrl}
                isSending={isSending}
                altText={t('messages.fileAttachment')}
                sendingLabel={t('messages.sendingImage')}
                loadingLabel={t('messages.loadingImage')}
                failedLabel={t('messages.unableToLoadImage')}
                onOpen={() => {
                  clearImageInteractionState();
                  setLightboxOpen(true);
                }}
              />
              {lightboxOpen && (
                <ImageLightbox
                  imageUrl={fileUrl}
                  onClose={closeLightbox}
                />
              )}
              {isPinned && (
                <div className="absolute -top-2 -right-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-100">
                  <Pin className="h-3 w-3 text-green-700" />
                </div>
              )}

              {/* Réactions en position absolue */}
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
            </div>
          </div>
          </div>
        </div>
      )}

      {!isImage && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-3 rounded-xl shadow-sm max-w-65 ${
            isOwn
              ? 'bg-green-50 hover:bg-green-100 border border-green-200'
              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          {getFileIcon(fileName)}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className={`text-xs mt-0.5 ${isOwn ? 'text-green-700' : 'text-gray-400'}`}>
              {(fileName.split('.').pop() ?? '').toUpperCase()} · {t('messages.openFile')}
            </p>
          </div>
        </a>
      )}
    </>
  );
}