"use client";

import { useState } from "react";
import { MessageCircle, Pin, PinOff, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { QuickReactions } from "@/components/messages/QuickReactions";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";

interface MessageOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwn: boolean;
  isPinned: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onPin: () => void;
  onDelete?: () => void;
}

export function MessageOptionsSheet({
  open,
  onOpenChange,
  isOwn,
  isPinned,
  onReact,
  onReply,
  onPin,
  onDelete,
}: MessageOptionsSheetProps) {
  const { t } = useTranslation();
  useScrollLock(open);
  const [showFullPicker, setShowFullPicker] = useState(false);

  const close = () => {
    setShowFullPicker(false);
    onOpenChange(false);
  };

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer";

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setShowFullPicker(false);
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
        aria-describedby={undefined}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("messages.messageOptions", "Options du message")}</SheetTitle>
        </SheetHeader>

        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />

        <div className="mb-4 flex justify-center">
          <QuickReactions
            onEmojiSelect={(emoji) => {
              onReact(emoji);
              close();
            }}
            onShowPicker={() => setShowFullPicker(true)}
          />
        </div>

        {showFullPicker && (
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200">
            <EmojiPicker
              onEmojiClick={(data: EmojiClickData) => {
                onReact(data.emoji);
                close();
              }}
              width="100%"
              height={320}
            />
          </div>
        )}

        <div className="space-y-1">
          <button type="button" className={rowClass} onClick={() => { onReply(); close(); }}>
            <MessageCircle className="h-5 w-5 text-green-700" />
            {t("messages.reply")}
          </button>

          <button type="button" className={rowClass} onClick={() => { onPin(); close(); }}>
            {isPinned ? (
              <PinOff className="h-5 w-5 text-green-700" />
            ) : (
              <Pin className="h-5 w-5 text-green-700" />
            )}
            {isPinned ? t("messages.unpin") : t("messages.pin")}
          </button>

          {isOwn && onDelete && (
            <button
              type="button"
              className={`${rowClass} text-red-600 hover:bg-red-50`}
              onClick={() => { onDelete(); close(); }}
            >
              <Trash2 className="h-5 w-5" />
              {t("messages.delete")}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={close}
          className="mt-3 w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          {t("common.cancel")}
        </button>
      </SheetContent>
    </Sheet>
  );
}
