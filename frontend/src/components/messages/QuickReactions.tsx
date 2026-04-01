"use client";

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface QuickReactionsProps {
  onEmojiSelect: (emoji: string) => void;
  onShowPicker: () => void;
}

const QUICK_EMOJIS = [
  { emoji: '❤️', code: '2764' },   
  { emoji: '😂', code: '1f602' },        
  { emoji: '😮', code: '1f62e' },       
  { emoji: '😢', code: '1f622' },        
  { emoji: '😡', code: '1f621' },       
  { emoji: '👍', code: '1f44d' },        
];

export function QuickReactions({ onEmojiSelect, onShowPicker }: QuickReactionsProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-white rounded-full shadow-lg border border-gray-200">
      {QUICK_EMOJIS.map((item) => (
        <button
          key={item.code}
          className="h-10 w-10 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer hover:bg-green-50"
          onClick={(e) => {
            e.stopPropagation();
            onEmojiSelect(item.emoji);
          }}
        >
          <img
            src={`https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${item.code}.svg`}
            alt={item.emoji}
            className="w-7 h-7"
          />
        </button>
      ))}
      
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0 rounded-full shrink-0 cursor-pointer hover:bg-green-50"
        onClick={(e) => {
          e.stopPropagation();
          onShowPicker();
        }}
      >
        <Plus className="h-5 w-5 text-green-700" />
      </Button>
    </div>
  );
}