"use client";

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';
import { QuickReactions } from './QuickReactions';

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export function EmojiPickerPopover({ onEmojiSelect, onOpenChange }: EmojiPickerPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setOpen(false);
    onOpenChange?.(false);
    setShowFullPicker(false);
  };

  const handleQuickEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
    onOpenChange?.(false);
    setShowFullPicker(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
        if (!newOpen) setShowFullPicker(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full border border-green-100 bg-white shadow-sm cursor-pointer hover:border-green-200 hover:bg-green-50"
          onClick={(e) => e.stopPropagation()}
        >
          <Smile className="h-3 w-3 text-green-700" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="top"
        sideOffset={8}
        className="z-[100] w-auto rounded-none border-0 bg-transparent p-0 shadow-none"
        onPointerDownOutside={() => {
          setOpen(false);
          onOpenChange?.(false);
          setShowFullPicker(false);
        }}
        onEscapeKeyDown={() => {
          setOpen(false);
          onOpenChange?.(false);
          setShowFullPicker(false);
        }}
      >
        {!showFullPicker ? (
          <QuickReactions
            onEmojiSelect={handleQuickEmojiSelect}
            onShowPicker={() => setShowFullPicker(true)}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={340}
              height={420}
              searchPlaceHolder={t("common.search")}
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}