"use client";

import { X, Mic, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeMessage } from '@/lib/sanitize';

interface ReplyPreviewProps {
  repliedMessage: {
    id: string;
    content: string;
    user_id: string;
    sender_name?: string;
  } | null;
  onCancel: () => void;
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

export function ReplyPreview({ repliedMessage, onCancel }: ReplyPreviewProps) {
  if (!repliedMessage) return null;

  const preview = getReplyPreview(repliedMessage.content);

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 overflow-hidden">
      <div className="flex items-start gap-2 min-w-0">
        {/* Barre verticale verte */}
        <div className="w-1 bg-green-700 rounded-full self-stretch shrink-0" />

        {/* Miniature image si applicable */}
        {preview.type === 'image' && (
          <img
            src={preview.url}
            alt="Preview"
            className="w-12 h-12 rounded object-cover shrink-0"
          />
        )}

        {/* Contenu */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="text-xs font-semibold text-green-700 truncate">
            Répondre à {repliedMessage.sender_name || 'Utilisateur'}
          </p>
          <div className="flex items-center gap-1 overflow-hidden">
            {preview.type === 'audio' && (
              <><Mic className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="text-sm text-gray-600">Message vocal</span></>
            )}
            {preview.type === 'image' && (
              <span className="text-sm text-gray-600">Photo</span>
            )}
            {preview.type === 'file' && (
              <><FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="text-sm text-gray-600">Fichier</span></>
            )}
            {preview.type === 'text' && (
              <span
                className="text-sm text-gray-600 truncate block min-w-0"
                dangerouslySetInnerHTML={{ __html: sanitizeMessage(preview.text) }}
              />
            )}
          </div>
        </div>

        {/* Bouton fermer */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-6 w-6 text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}