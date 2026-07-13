"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, MessageCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PinnedMessages } from "./PinnedMessages";
import { MessageItem } from "./MessageItem";
import { MessageOptionsSheet } from "./MessageOptionsSheet";
import { getIntlLocale } from "@/lib/locale";

function resolveMessageByKey(key: string | null, messages: Message[]): Message | undefined {
  if (!key) return undefined;
  return messages.find((m) => m.id === key || key.startsWith(`${m.id}-`));
}

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
  retryMessage, onReply, onReplyClick: _onReplyClick, onReactionToggle, onEdit, onPin, onDelete,
  isTyping, hasMore, loadingMore, loadMore,
}: MessageThreadProps) {
  const { t, i18n } = useTranslation();
  const SCROLL_TO_BOTTOM_THRESHOLD = 160;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
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
  const pendingJumpRef = useRef<string | null>(null);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [pinnedModalOpen, setPinnedModalOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => { hasMoreRef.current = hasMore ?? false; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore ?? false; }, [loadingMore]);
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  const pinnedMessages = messages
    .filter(msg => msg.pinned_at && !msg.deleted_at)
    .sort((a, b) => new Date(a.pinned_at!).getTime() - new Date(b.pinned_at!).getTime())
    .map(msg => ({
      id: msg.id, content: msg.content, created_at: msg.created_at,
      sender_name: msg.sender?.account_type === "company" ? msg.sender.company_name : msg.sender?.full_name,
    }));

  const prevPinnedLengthRef = useRef(pinnedMessages.length);
  const prevScrollHeightForPinRef = useRef(0);

  const clearJumpTimeouts = () => {
    jumpTimeoutRef.current.forEach(clearTimeout);
    jumpTimeoutRef.current = [];
  };

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
    if (behavior === "instant") {
      viewport.scrollTop = viewport.scrollHeight;
    } else {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
    requestAnimationFrame(() => updateScrollToBottomVisibility());
  };

  const scrollToMessageInThread = (messageId: string, behavior: ScrollBehavior = "smooth") => {
    const viewport = scrollViewportRef.current;
    const element =
      document.getElementById(`message-${messageId}`) ||
      viewport?.querySelector(`[data-message-id="${messageId}"]`);

    if (!element || !viewport) return false;

    const top = Math.max(
      0,
      viewport.scrollTop +
        element.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top -
        Math.max(24, viewport.clientHeight * 0.35) +
        element.clientHeight / 2,
    );

    viewport.scrollTo({ top, behavior });

    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current));
    }, 2200);

    return true;
  };

  const handleJumpToMessage = (messageId: string) => {
    pendingJumpRef.current = messageId;
    clearJumpTimeouts();

    const wasPinnedOpen = pinnedModalOpen;
    if (wasPinnedOpen) setPinnedModalOpen(false);

    const runSmoothScroll = () => {
      if (pendingJumpRef.current !== messageId) return;
      if (scrollToMessageInThread(messageId, "smooth")) {
        pendingJumpRef.current = null;
      }
    };

    // If the pinned panel was open, wait for it to close then glide.
    // Otherwise glide immediately.
    jumpTimeoutRef.current.push(setTimeout(runSmoothScroll, wasPinnedOpen ? 100 : 0));
    // One fallback if the element wasn't ready yet.
    jumpTimeoutRef.current.push(setTimeout(runSmoothScroll, wasPinnedOpen ? 280 : 120));
  };

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

  // Keep viewport stable when pin/unpin changes pinned section height.
  useLayoutEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const prevPinnedCount = prevPinnedLengthRef.current;
    const currPinnedCount = pinnedMessages.length;
    const prevScrollHeight = prevScrollHeightForPinRef.current;

    if (prevScrollHeight > 0 && prevPinnedCount !== currPinnedCount) {
      const scrollHeightDelta = viewport.scrollHeight - prevScrollHeight;
      if (scrollHeightDelta !== 0) {
        viewport.scrollTop += scrollHeightDelta;
      }
    }

    prevPinnedLengthRef.current = currPinnedCount;
    prevScrollHeightForPinRef.current = viewport.scrollHeight;
  }, [pinnedMessages.length, messages.length]);

  useLayoutEffect(() => {
    if (messages.length > 0 && isInitialLoad.current) {
      const tryScroll = () => {
        const viewport = scrollViewportRef.current;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
          isInitialLoad.current = false;
        }
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
  }, [otherUser?.id, loading]);

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

  useEffect(() => {
    return () => clearJumpTimeouts();
  }, []);

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
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

  const selectedMessage = resolveMessageByKey(selectedMessageKey, messages);
  const selectedIsOwn = selectedMessage?.user_id === currentUserId;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <PinnedMessages
        pinnedMessages={pinnedMessages}
        open={pinnedModalOpen}
        onOpenChange={setPinnedModalOpen}
        onMessageClick={handleJumpToMessage}
        onUnpin={(messageId) => onPin?.(messageId, true)}
      />

      <div
        ref={scrollViewportRef}
        data-message-thread-viewport
        className={`h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white ${pinnedModalOpen ? "pointer-events-none" : ""}`}
      >
        <div className="p-4">
          {loadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
          {loading ? (
            <div className="flex h-full flex-col justify-end space-y-4 px-2 py-4">
              {SKELETON_BUBBLES.map((s, i) => (
                <div key={i} className={`flex items-end gap-2 ${s.isOwn ? "justify-end" : "justify-start"}`}>
                  {!s.isOwn && <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />}
                  <Skeleton className={`h-10 rounded-2xl bg-gray-200 ${s.w}`} style={{ animationDelay: `${i * 60}ms` }} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              <p>{t("messages.startConversationEmpty")}</p>
            </div>
          ) : (
            <div className="space-y-4" onPointerDown={() => { setSelectedMessageKey(null); setOpenMenuKey(null); }}>
              {messages.map((message, index) => {
                const isOwn = message.user_id === currentUserId;
                const showDate = index === 0 || new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
                return (
                  <div key={message.id} data-message-id={message.id}>
                    <MessageItem
                      message={message}
                      isHighlighted={highlightedMessageId === message.id}
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
                      onReplyClick={handleJumpToMessage}
                      onReactionToggle={onReactionToggle}
                      onEdit={onEdit}
                      onPin={onPin}
                      onDelete={onDelete}
                    />
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="w-16 rounded-2xl rounded-bl-sm border bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {showScrollToBottom && !loading && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-2 left-1/2 z-50 flex h-11 w-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-green-700 text-white shadow-lg transition-all duration-300 animate-in fade-in zoom-in-95"
          title={t("messages.scrollToBottom", { defaultValue: "Go to latest messages" })}
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}

      <MessageOptionsSheet
        open={Boolean(selectedMessageKey && selectedMessage && !selectedMessage.deleted_at)}
        onOpenChange={(open) => {
          if (!open) setSelectedMessageKey(null);
        }}
        isOwn={!!selectedIsOwn}
        isPinned={!!selectedMessage?.pinned_at}
        onReact={(emoji) => {
          if (!selectedMessage) return;
          void onReactionToggle?.(selectedMessage.id, emoji, selectedMessage.reactions || []);
          setSelectedMessageKey(null);
        }}
        onReply={() => {
          if (!selectedMessage) return;
          onReply?.(selectedMessage);
          setSelectedMessageKey(null);
        }}
        onPin={() => {
          if (!selectedMessage) return;
          onPin?.(selectedMessage.id, !!selectedMessage.pinned_at);
          setSelectedMessageKey(null);
        }}
        onDelete={
          selectedIsOwn && selectedMessage
            ? () => {
                void onDelete?.(selectedMessage.id);
              }
            : undefined
        }
      />
    </div>
  );
}
