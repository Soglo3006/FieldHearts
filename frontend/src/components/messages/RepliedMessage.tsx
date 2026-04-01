"use client";

import { Mic, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppImage from '@/components/ui/AppImage';
import { sanitizeMessage } from '@/lib/sanitize';

interface RepliedMessageProps {
  repliedTo: {
    id: string;
    content: string;
    sender_name?: string;
    deleted_at?: string | null;
  };
  onMessageClick: (messageId: string) => void;
}

function getReplyPreview(content: string) {
  if (content.includes('[AUDIO:')) return { type: 'audio' as const };
  const fileMatch = content.match(/\[FILE:(.*?)\]/);
  if (fileMatch) {
    const url = fileMatch[1];
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    return { type: isImage ? 'image' as const : 'file' as const, url };
  }
  return { type: 'text' as const, text: content };
}

export function RepliedMessage({ repliedTo, onMessageClick }: RepliedMessageProps) {
  const { t } = useTranslation();

  if (repliedTo.deleted_at) {
    return (
      <div className="border-l-4 border-green-700 bg-green-50/50 pl-3 py-2 mb-2 rounded">
        <p className="text-xs font-semibold text-green-700 mb-1">
          {repliedTo.sender_name || t('messages.user')}
        </p>
        <span className="text-sm italic text-gray-500">{t('messages.deleted')}</span>
      </div>
    );
  }

  const preview = getReplyPreview(repliedTo.content);

  return (
    <div
      onClick={() => onMessageClick(repliedTo.id)}
      className="border-l-4 border-green-700 bg-green-50/50 pl-3 py-2 mb-2 rounded cursor-pointer hover:bg-green-50 transition-colors"
    >
      <p className="text-xs font-semibold text-green-700 mb-1">
        {repliedTo.sender_name || t('messages.user')}
      </p>

      <div className="flex items-center gap-2">
        {preview.type === 'image' && (
          <AppImage src={preview.url} alt={t('common.preview')} width={40} height={40} className="h-10 w-10 rounded object-cover shrink-0" />
        )}

        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
          {preview.type === 'audio' && (
            <><Mic className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="text-sm text-gray-600">{t('messages.voiceMessage')}</span></>
          )}
          {preview.type === 'image' && (
            <span className="text-sm text-gray-600">{t('messages.photo')}</span>
          )}
          {preview.type === 'file' && (
            <><FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="text-sm text-gray-600">{t('messages.file')}</span></>
          )}
          {preview.type === 'text' && (
            <span
              className="text-sm text-gray-600 truncate block min-w-0"
              dangerouslySetInnerHTML={{ __html: sanitizeMessage(preview.text) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}