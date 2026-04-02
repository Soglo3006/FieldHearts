"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { useTranslation } from 'react-i18next';

interface MessageActionsProps {
  messageKey: string;
  openMenuKey: string | null;
  setOpenMenuKey: (key: string | null) => void;
  onActionComplete?: () => void;
  isPinned?: boolean;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onEmojiOpenChange?: (open: boolean) => void;
}

export function MessageActions({
  messageKey,
  openMenuKey,
  setOpenMenuKey,
  onActionComplete,
  isPinned,
  onReact,
  onReply,
  onPin,
  onDelete,
  onEdit,
  onEmojiOpenChange,
}: MessageActionsProps) {
  const { t } = useTranslation();
  const [isReactTooltipOpen, setIsReactTooltipOpen] = useState(false);
  const [isReactPickerOpen, setIsReactPickerOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Bouton Réagir avec EmojiPicker + Tooltip contrôlé */}
      <Tooltip
        open={isReactPickerOpen ? false : isReactTooltipOpen}
        onOpenChange={setIsReactTooltipOpen}
      >
        <TooltipTrigger asChild>
          <div>
            <EmojiPickerPopover
              onEmojiSelect={(emoji) => {
                onReact?.(emoji);
                onActionComplete?.();
              }}
              onOpenChange={(open) => {
                if (open) {
                  setOpenMenuKey(null);
                  setIsReactTooltipOpen(false);
                }
                setIsReactPickerOpen(open);
                onEmojiOpenChange?.(open);
              }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("messages.react")}</p>
        </TooltipContent>
      </Tooltip>

      {/* Bouton Répondre */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full border border-green-100 bg-white shadow-sm cursor-pointer hover:border-green-200 hover:bg-green-50"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onReply?.();
              onActionComplete?.();
            }}
          >
            <MessageCircle className="h-3 w-3 text-green-700" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("messages.reply")}</p>
        </TooltipContent>
      </Tooltip>

      {/* Bouton Modifier */}
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full border border-green-100 bg-white shadow-sm cursor-pointer hover:border-green-200 hover:bg-green-50"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
                onActionComplete?.();
              }}
            >
              <Pencil className="h-3 w-3 text-green-700" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("messages.edit")}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Bouton Épingler / Désépingler */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full border border-green-100 bg-white shadow-sm cursor-pointer hover:border-green-200 hover:bg-green-50"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onPin?.();
              onActionComplete?.();
            }}
          >
            {isPinned ? (
              <PinOff className="h-3 w-3 text-green-700" />
            ) : (
              <Pin className="h-3 w-3 text-green-700" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isPinned ? t("messages.unpin") : t("messages.pin")}</p>
        </TooltipContent>
      </Tooltip>

      {/* Bouton Supprimer */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full border border-red-100 bg-white shadow-sm cursor-pointer hover:border-red-200 hover:bg-red-50"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
              onActionComplete?.();
            }}
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("messages.delete")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}