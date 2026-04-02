"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, MessageCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PinnedMessages } from "./PinnedMessages";
import { MessageItem } from "./MessageItem";
import { getIntlLocale } from "@/lib/locale";

function getDateLabel(dateStr: string, t: (k: string) => string, lng: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const intlLocale = getIntlLocale(lng, { fr: 'fr-CA', en: 'en-CA' });

  if (date.toDateString() === today.toDateString()) return t("messages.today");
  if (date.toDateString() === yesterday.toDateString()) return t("messages.yesterday");

  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    const day = date.toLocaleDateString(intlLocale, { weekday: "long" });
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString(intlLocale, {
    day: "numeric", month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

const SKELETON_BUBBLES = [
  { isOwn: false, w: "w-48" },
  { isOwn: true,  w: "w-36" },
  { isOwn: false, w: "w-64" },
  { isOwn: true,  w: "w-52" },
  { isOwn: false, w: "w-40" },
  { isOwn: true,  w: "w-44" },
  { isOwn: false, w: "w-56" },
  { isOwn: true,  w: "w-32" },
  { isOwn: false, w: "w-60" },
  { isOwn: true,  w: "w-48" },
  { isOwn: false, w: "w-44" },
  { isOwn: true,  w: "w-56" },
] as const;

interface MessageReaction { emoji: string; user_ids: string[]; }
interface Message {
  id: string; content: string; user_id: string; created_at: string;
  status?: "sending" | "sent" | "failed";
  pinned_at?: string | null; edited_at?: string | null; read_at?: string | null; deleted_at?: string | null;
  reactions?: MessageReaction[];
  replied_to?: { id: string; content: string; user_id: string; sender_name?: string; deleted_at?: string | null } | null;
  replied_to_message_id?: string | null;
  sender?: { account_type?: string; company_name?: string; full_name?: string; avatar_url?: string | null } | null;
  client_temp_id?: string;
}

interface MessageThreadProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  otherUser?: { id?: string; full_name?: string; company_name?: string; account_type?: string; avatar_url?: string | null } | null;
  hoveredMessageId: string | null;
  setHoveredMessageId: (key: string | null) => void;
  openMenuKey: string | null;
  setOpenMenuKey: (key: string | null) => void;
  selectedMessageKey: string | null;
  setSelectedMessageKey: (key: string | null) => void;
  retryMessage?: (tempId: string) => Promise<void>;
  onReply?: (message: Message) => void;
  onReplyClick?: (messageId: string) => void;
  onReactionToggle?: (messageId: string, emoji: string, currentReactions: MessageReaction[]) => Promise<void>;
  onEdit?: (messageId: string, newContent: string) => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onDelete?: (messageId: string) => Promise<void>;
  isTyping?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMore?: () => Promise<number>;
}

export function MessageThread({
  messages, loading, currentUserId, otherUser,
  hoveredMessageId, setHoveredMessageId, openMenuKey, setOpenMenuKey,
  selectedMessageKey, setSelectedMessageKey,
  retryMessage, onReply, onReplyClick, onReactionToggle, onEdit, onPin, onDelete,
  isTyping, hasMore, loadingMore, loadMore,
}: MessageThreadProps) {
  const { t, i18n } = useTranslation();
  const SCROLL_TO_BOTTOM_THRESHOLD = 160;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);
  const isInitialLoad = useRef(true);
  const hoverTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevScrollHeightRef = useRef(0);
  const prevFirstMsgIdRef = useRef("");
  const isPrependingRef = useRef(false);
  const hasMoreRef = useRef(hasMore ?? false);
  const loadingMoreRef = useRef(loadingMore ?? false);
  const loadMoreRef = useRef(loadMore);
  const prevLoadingRef = useRef(loading);

  useEffect(() => { hasMoreRef.current = hasMore ?? false; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore ?? false; }, [loadingMore]);
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  // Scroll to bottom when skeleton disappears (loading: true → false)
  useLayoutEffect(() => {
    if (prevLoadingRef.current && !loading && messages.length > 0) {
      const tryScroll = () => {
        const viewport = scrollViewportRef.current;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
        messagesEndRef.current?.scrollIntoView({ block: "end" });
      };
      tryScroll();
      setTimeout(tryScroll, 100);
      setTimeout(tryScroll, 300);
      isInitialLoad.current = false;
    }
    prevLoadingRef.current = loading;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const pinnedMessages = messages
    .filter(msg => msg.pinned_at && !msg.deleted_at)
    .sort((a, b) => new Date(a.pinned_at!).getTime() - new Date(b.pinned_at!).getTime())
    .map(msg => ({
      id: msg.id, content: msg.content, created_at: msg.created_at,
      sender_name: msg.sender?.account_type === "company" ? msg.sender.company_name : msg.sender?.full_name,
    }));

  const prevPinnedLengthRef = useRef(pinnedMessages.length);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [pinnedModalOpen, setPinnedModalOpen] = useState(false);

  // Scroll compensation when pinned banner appears/disappears
  useLayoutEffect(() => {
    const prev = prevPinnedLengthRef.current;
    const curr = pinnedMessages.length;
    prevPinnedLengthRef.current = curr;
    if (prev === curr) return;
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < SCROLL_TO_BOTTOM_THRESHOLD;
    if (atBottom) {
      requestAnimationFrame(() => { viewport.scrollTop = viewport.scrollHeight; });
    }
  }, [pinnedMessages.length]);

  const updateScrollToBottomVisibility = () => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      setShowScrollToBottom(false);
      return;
    }

    const remainingDistance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const hasEnoughScrollableContent = viewport.scrollHeight - viewport.clientHeight > SCROLL_TO_BOTTOM_THRESHOLD;

    setShowScrollToBottom(hasEnoughScrollableContent && remainingDistance > SCROLL_TO_BOTTOM_THRESHOLD);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    if (behavior === "instant") { viewport.scrollTop = viewport.scrollHeight; }
    else { viewport.scrollTo({ top: viewport.scrollHeight, behavior }); }
    requestAnimationFrame(() => updateScrollToBottomVisibility());
  };

  useLayoutEffect(() => {
    if (messages.length > 0 && isInitialLoad.current) {
      const tryScroll = () => {
        const viewport = scrollViewportRef.current;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
          isInitialLoad.current = false;
        }
        // iOS fallback: use scrollIntoView on the end element
        messagesEndRef.current?.scrollIntoView({ block: "end" });
      };
      tryScroll();
      setTimeout(tryScroll, 150);
    }
  }, [messages]);

  useEffect(() => {
    isInitialLoad.current = true;
    prevMessagesLength.current = 0;
    prevScrollHeightRef.current = 0;
    prevFirstMsgIdRef.current = "";
  }, [otherUser?.id]);

  useEffect(() => {
    if (isTyping) scrollToBottom("smooth");
  }, [isTyping]);

  useLayoutEffect(() => {
    if (!prevScrollHeightRef.current) return;
    const firstId = messages[0]?.id ?? "";
    if (firstId === prevFirstMsgIdRef.current) return;
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop += viewport.scrollHeight - prevScrollHeightRef.current;
    prevScrollHeightRef.current = 0;
    prevFirstMsgIdRef.current = "";
  }, [messages]);

  useEffect(() => {
    const el = scrollViewportRef.current;
    if (!el) return;
    const onScroll = () => {
      updateScrollToBottomVisibility();
      if (el.scrollTop < 80 && hasMoreRef.current && !loadingMoreRef.current) {
        isPrependingRef.current = true;
        prevScrollHeightRef.current = el.scrollHeight;
        prevFirstMsgIdRef.current = el.querySelector('[id^="message-"]')?.id?.replace("message-", "") ?? "";
        loadMoreRef.current?.();
      }
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    updateScrollToBottomVisibility();
  }, [messages.length, loading]);

  useEffect(() => {
    const prevLen = prevMessagesLength.current;
    const hasNew = messages.length > prevLen && prevLen > 0;
    if (hasNew) {
      if (isPrependingRef.current) {
        isPrependingRef.current = false;
        prevMessagesLength.current = messages.length;
        return;
      }
      const lastMessage = messages[messages.length - 1];
      const isMine = lastMessage?.user_id === currentUserId;
      if (isMine) { scrollToBottom("smooth"); setShowScrollToBottom(false); }
      else if (!showScrollToBottom) { scrollToBottom("smooth"); }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, showScrollToBottom, currentUserId]);

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <MessageCircle className="h-12 w-12" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("messages.selectConversationTitle")}</h3>
          <p className="text-gray-600">{t("messages.selectConversationStart")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      <PinnedMessages
        pinnedMessages={pinnedMessages}
        open={pinnedModalOpen}
        onOpenChange={setPinnedModalOpen}
        onMessageClick={onReplyClick || (() => {})}
        onUnpin={(messageId) => onPin?.(messageId, true)}
      />

      <ScrollArea className="flex-1 min-h-0" ref={(node: { querySelector?: (s: string) => Element | null } | null) => {
        if (!node) return;
        const viewport = node.querySelector?.("[data-radix-scroll-area-viewport]");
        if (viewport) scrollViewportRef.current = viewport as HTMLDivElement;
      }}>
        <div className="p-4 bg-gray-50">
          {loadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
          {loading ? (
            <div className="flex flex-col justify-end space-y-4 h-full py-4 px-2">
              {SKELETON_BUBBLES.map((s, i) => (
                <div key={i} className={`flex items-end gap-2 ${s.isOwn ? "justify-end" : "justify-start"}`}>
                  {!s.isOwn && <Skeleton className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />}
                  <Skeleton className={`h-10 rounded-2xl bg-gray-200 ${s.w}`} style={{ animationDelay: `${i * 60}ms` }} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>{t("messages.startConversationEmpty")}</p>
            </div>
          ) : (
            <div className="space-y-4" onPointerDown={() => { setSelectedMessageKey(null); setOpenMenuKey(null); }}>
              {messages.map((message, index) => {
                const isOwn = message.user_id === currentUserId;
                const showDate = index === 0 || new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    showDate={showDate}
                    dateLabel={showDate ? getDateLabel(message.created_at, t, i18n.language) : ""}
                    isOwn={isOwn}
                    currentUserId={currentUserId}
                    otherUser={otherUser}
                    hoveredMessageId={hoveredMessageId}
                    openMenuKey={openMenuKey}
                    selectedMessageKey={selectedMessageKey}
                    hoverTimeoutRef={hoverTimeoutRef}
                    setHoveredMessageId={setHoveredMessageId}
                    setOpenMenuKey={setOpenMenuKey}
                    setSelectedMessageKey={setSelectedMessageKey}
                    retryMessage={retryMessage}
                    onReply={onReply}
                    onReplyClick={onReplyClick}
                    onReactionToggle={onReactionToggle}
                    onEdit={onEdit}
                    onPin={onPin}
                    onDelete={onDelete}
                  />
                );
              })}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm w-16">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {showScrollToBottom && !loading && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-2 left-1/2 z-50 -translate-x-1/2 h-11 w-11 rounded-full bg-green-700 cursor-pointer text-white shadow-lg flex items-center justify-center transition-all duration-300 animate-in fade-in zoom-in-95"
          title={t("messages.scrollToBottom", { defaultValue: "Go to latest messages" })}
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
