"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, MoreVertical } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { useTranslation } from 'react-i18next';

interface MessageActionsProps {
  messageKey: string;
  openMenuKey: string | null;
  setOpenMenuKey: (key: string | null) => void;
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
              onEmojiSelect={(emoji) => onReact?.(emoji)}
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
            }}
          >
            <MessageCircle className="h-3 w-3 text-green-700" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("messages.reply")}</p>
        </TooltipContent>
      </Tooltip>

      {/* Bouton Plus (Dropdown) */}
      <DropdownMenu
        open={openMenuKey === messageKey}
        onOpenChange={(open) => {
          if (open) onEmojiOpenChange?.(false);
          setOpenMenuKey(open ? messageKey : null);
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full border border-green-100 bg-white shadow-sm cursor-pointer hover:border-green-200 hover:bg-green-50"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3 text-green-700" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("common.more", "More")}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="end"
          className="z-9999"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              setOpenMenuKey(null);
              onReply?.();
            }}
          >
            {t("messages.reply")}
          </DropdownMenuItem>

          {onEdit && (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => {
                setOpenMenuKey(null);
                onEdit?.();
              }}
            >
              {t("messages.edit")}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              setOpenMenuKey(null);
              onPin?.();
            }}
          >
            {isPinned ? t("messages.unpin") : t("messages.pin")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onSelect={() => {
              setOpenMenuKey(null);
              onDelete?.();
            }}
          >
            {t("messages.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}