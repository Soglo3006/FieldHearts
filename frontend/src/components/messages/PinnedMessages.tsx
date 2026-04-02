"use client";

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pin, ChevronDown, Mic } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

interface PinnedMessagesProps {
  pinnedMessages: Message[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageClick: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export function PinnedMessages({ 
  pinnedMessages, 
  open,
  onOpenChange,
  onMessageClick, 
  onUnpin 
}: PinnedMessagesProps) {
  const { t, i18n } = useTranslation();

  const lastPinned = pinnedMessages[pinnedMessages.length - 1];

  // Fermer le modal automatiquement si plus aucun message épinglé
  useEffect(() => {
    if (pinnedMessages.length === 0 && open) {
      onOpenChange(false);
    }
  }, [pinnedMessages.length, open, onOpenChange]);

  if (pinnedMessages.length === 0) return null;

  const getPreview = (content: string) => {
    if (content.includes('[AUDIO:')) return t('messages.voiceMessage');
    if (content.includes('[FILE:')) {
      const match = content.match(/\[FILE:(.*?)\]/);
      const url = match ? match[1] : '';
      const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
      return isImage ? t('messages.photo') : t('messages.file');
    }
    return content.replace(/\[FILE:.*?\]/g, '').trim();
  };

  const renderModalPreview = (content: string) => {
    if (content.includes('[AUDIO:')) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mic className="h-4 w-4 text-green-700 shrink-0" />
          <span>{t('messages.voiceMessage')}</span>
        </div>
      );
    }
    if (content.includes('[FILE:')) {
      const match = content.match(/\[FILE:(.*?)\]/);
      const url = match ? match[1] : '';
      const text = content.replace(/\[FILE:.*?\]/, '').trim();
      const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
      if (isImage) {
        return (
          <div className="flex flex-col gap-1">
            <div className="inline-flex max-w-full overflow-hidden rounded-lg border border-gray-100 bg-transparent">
              <Image
                src={url}
                alt={t('messages.pinnedImageAlt')}
                width={320}
                height={320}
                unoptimized
                className="block h-auto max-h-64 w-auto max-w-full object-contain"
                sizes="(max-width: 768px) 70vw, 320px"
              />
            </div>
            {text && <p className="text-sm text-gray-600">{text}</p>}
          </div>
        );
      }
      return <p className="text-sm text-gray-600 line-clamp-2">{text || t('messages.file')}</p>;
    }
    return <p className="text-sm text-gray-600 line-clamp-2">{content}</p>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language || undefined, {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <>
      {/* Barre compacte - dernier message épinglé */}
      <div className="border-b bg-green-50 px-4 py-2 flex items-center gap-3">
        <Pin className="h-4 w-4 text-green-700 shrink-0" />
        
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => {
            onMessageClick(lastPinned.id);
          }}
        >
          <p className="text-xs font-semibold text-green-800">
            {lastPinned.sender_name || t('messages.user')}
          </p>
          <p className="text-sm text-gray-600 truncate">
            {getPreview(lastPinned.content)}
          </p>
        </div>

        {pinnedMessages.length > 1 && (
          <span className="text-xs text-green-700 font-medium shrink-0">
            {pinnedMessages.length}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-700 hover:bg-green-100 shrink-0 cursor-pointer"
          onClick={() => onOpenChange(true)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Modal Messages épinglés */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t('messages.pinnedMessages')} ({pinnedMessages.length})
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-0 divide-y">
              {[...pinnedMessages].reverse().map((message) => (
                <div key={message.id} className="py-3 px-1 group">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {message.sender_name || t('messages.user')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      {renderModalPreview(message.content)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        onMessageClick(message.id);
                        onOpenChange(false);
                      }}
                      className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-900 cursor-pointer font-medium"
                    >
                      {t('messages.viewInConversation')}
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => onUnpin(message.id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 cursor-pointer font-medium"
                    >
                      Désépingler
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}