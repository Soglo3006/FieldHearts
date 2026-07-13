"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Pin, ChevronDown, Mic, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/useScrollLock";

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
  onUnpin,
}: PinnedMessagesProps) {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const [railHeight, setRailHeight] = useState(0);

  useScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pinnedMessages.length === 0 && open) {
      onOpenChange(false);
    }
  }, [pinnedMessages.length, open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Keep the dedicated scrollbar rail the same scrollable height as the list.
  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;

    const update = () => setRailHeight(list.scrollHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(list);
    for (const child of Array.from(list.children)) {
      ro.observe(child);
    }
    return () => ro.disconnect();
  }, [open, pinnedMessages]);

  const syncFromList = () => {
    const list = listRef.current;
    const rail = railRef.current;
    if (!list || !rail || syncingRef.current) return;
    syncingRef.current = true;
    rail.scrollTop = list.scrollTop;
    syncingRef.current = false;
  };

  const syncFromRail = () => {
    const list = listRef.current;
    const rail = railRef.current;
    if (!list || !rail || syncingRef.current) return;
    syncingRef.current = true;
    list.scrollTop = rail.scrollTop;
    syncingRef.current = false;
  };

  if (pinnedMessages.length === 0) return null;

  const lastPinned = pinnedMessages[pinnedMessages.length - 1];

  const getPreview = (content: string) => {
    if (content.includes("[AUDIO:")) return t("messages.voiceMessage");
    if (content.includes("[FILE:")) {
      const match = content.match(/\[FILE:(.*?)\]/);
      const url = match ? match[1] : "";
      const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
      return isImage ? t("messages.photo") : t("messages.file");
    }
    return content.replace(/\[FILE:.*?\]/g, "").trim();
  };

  const renderModalPreview = (content: string) => {
    if (content.includes("[AUDIO:")) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mic className="h-4 w-4 shrink-0 text-green-700" />
          <span>{t("messages.voiceMessage")}</span>
        </div>
      );
    }
    if (content.includes("[FILE:")) {
      const match = content.match(/\[FILE:(.*?)\]/);
      const url = match ? match[1] : "";
      const text = content.replace(/\[FILE:.*?\]/, "").trim();
      const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
      if (isImage) {
        return (
          <div className="flex flex-col gap-1">
            <div className="inline-flex max-w-full overflow-hidden rounded-lg border border-gray-100 bg-transparent">
              <Image
                src={url}
                alt={t("messages.pinnedImageAlt")}
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
      return <p className="line-clamp-2 text-sm text-gray-600">{text || t("messages.file")}</p>;
    }
    return <p className="line-clamp-2 text-sm text-gray-600">{content}</p>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language || undefined, {
      day: "numeric",
      month: "short",
    });
  };

  const modal =
    open &&
    mounted &&
    createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden overscroll-none p-4">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          data-pinned-messages-panel
          aria-label={`${t("messages.pinnedMessages")} (${pinnedMessages.length})`}
          className="relative z-10 flex w-full max-w-md max-h-[min(80vh,640px)] flex-col overflow-hidden rounded-lg border bg-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold leading-none">
              {t("messages.pinnedMessages")} ({pinnedMessages.length})
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded-xs p-1 text-gray-500 opacity-70 transition-opacity hover:opacity-100"
              aria-label={t("common.close", "Fermer")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Deux sections distinctes : liste | barre de scroll */}
          <div className="flex min-h-0 max-h-[min(60vh,520px)] flex-1 overflow-hidden">
            <div
              ref={listRef}
              onScroll={syncFromList}
              className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="divide-y">
                {[...pinnedMessages].reverse().map((message) => (
                  <div key={message.id} className="group py-3">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">
                        {message.sender_name || t("messages.user")}
                      </span>
                      <span className="shrink-0 pt-0.5 text-xs text-gray-400 tabular-nums">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                    {renderModalPreview(message.content)}

                    <div className="mt-2 flex items-center gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onMessageClick(message.id);
                        }}
                        className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900"
                      >
                        {t("messages.viewInConversation")}
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        type="button"
                        onClick={() => onUnpin(message.id)}
                        className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Désépingler
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={railRef}
              onScroll={syncFromRail}
              className="w-3.5 shrink-0 overflow-y-auto overscroll-contain border-l border-gray-200 bg-gray-50"
              aria-hidden
            >
              <div style={{ height: Math.max(railHeight, 1) }} />
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-green-50 px-4 py-2">
        <Pin className="h-4 w-4 shrink-0 text-green-700" />

        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => {
            onMessageClick(lastPinned.id);
          }}
        >
          <p className="text-xs font-semibold text-green-800">
            {lastPinned.sender_name || t("messages.user")}
          </p>
          <p className="truncate text-sm text-gray-600">{getPreview(lastPinned.content)}</p>
        </div>

        {pinnedMessages.length > 1 && (
          <span className="shrink-0 text-xs font-medium text-green-700">
            {pinnedMessages.length}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 cursor-pointer text-green-700 hover:bg-green-100"
          onClick={() => onOpenChange(true)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {modal}
    </>
  );
}
