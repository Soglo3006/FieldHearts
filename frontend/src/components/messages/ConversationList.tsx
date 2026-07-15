"use client";

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, SquarePen, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sanitizeMessage } from '@/lib/sanitize';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Chat {
  id: string;
  name?: string | null;
  last_message?: {
    content: string;
    created_at: string;
    user_id?: string;
  };
  last_reaction?: {
    emoji: string;
    reactor_id: string;
    message_owner_id: string;
    at: string;
  } | null;
  other_user?: {
    id?: string;
    full_name?: string;
    company_name?: string;
    account_type?: string;
    avatar_url?: string | null;
  };
  unread_count?: number;
  is_archived?: boolean;
}

interface ConversationListProps {
  chats: Chat[];
  activeChatId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onChatSelect: (chatId: string) => void;
  currentUserId: string | null;
  loading?: boolean;
  onNewConversation?: () => void;
  newConversationMode?: boolean;
  pendingUser?: { id: string; full_name?: string; company_name?: string; account_type?: string; avatar_url?: string | null } | null;
  /** Controlled list filter (all / unread / archived). */
  filter: string;
  onFilterChange: (filter: string) => void;
}

/** Shared filter used by list + page (so the open chat stays in sync). */
export function filterConversations(
  chats: Chat[],
  filter: string,
  searchQuery: string,
  pendingUserId?: string | null,
): Chat[] {
  return chats.filter((chat) => {
    if (pendingUserId && chat.other_user?.id === pendingUserId) {
      return false;
    }

    if (searchQuery.trim()) {
      const isPerson = chat.other_user?.account_type === "person";
      const isCompany = chat.other_user?.account_type === "company";

      const name = isPerson
        ? chat.other_user?.full_name
        : isCompany
          ? chat.other_user?.company_name
          : chat.other_user?.full_name || chat.name || "";

      if (!name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    switch (filter) {
      case "unread":
        return !!chat.unread_count && chat.unread_count > 0;
      case "archived":
        return chat.is_archived === true;
      case "all":
      default:
        return !chat.is_archived;
    }
  });
}

function ConversationItem({
  chat,
  isActive,
  currentUserId,
  onSelect,
  now,
}: {
  chat: Chat;
  isActive: boolean;
  currentUserId: string | null;
  onSelect: () => void;
  now: number;
}) {
  const { t } = useTranslation();

  const unreadCount = chat.unread_count ?? 0;

  const isPerson = chat.other_user?.account_type === 'person';
  const isCompany = chat.other_user?.account_type === 'company';

  const displayName = isPerson
    ? chat.other_user?.full_name || chat.name || 'Unknown'
    : isCompany
    ? chat.other_user?.company_name || chat.name || 'Unknown'
    : chat.other_user?.full_name || chat.name || 'Unknown';

  const lastMessagePreview = (() => {
    // Show reaction preview if there is one and it's more recent than the last message
    if (chat.last_reaction) {
      const reactionTime = new Date(chat.last_reaction.at).getTime();
      const messageTime = chat.last_message?.created_at
        ? new Date(chat.last_message.created_at).getTime() : 0;

      if (reactionTime >= messageTime) {
        const isOwnReaction = chat.last_reaction.reactor_id === currentUserId;
        const otherName = displayName;
        if (isOwnReaction) {
          return t("messages.youReacted", { emoji: chat.last_reaction.emoji });
        } else {
          return t("messages.otherReacted", { name: otherName, emoji: chat.last_reaction.emoji });
        }
      }
    }

    if (!chat.last_message?.content) return t("messages.noMessagesYet");

    const content = chat.last_message.content;

    if (content.includes('[AUDIO:')) {
      const isOwn = chat.last_message.user_id === currentUserId;
      const senderName = chat.other_user?.account_type === 'company'
        ? chat.other_user?.company_name
        : chat.other_user?.full_name;
      return isOwn
        ? t("messages.sentVoiceMessage")
        : t("messages.sentVoiceMessageOther", { name: senderName });
    }

    if (content.includes('[FILE:')) {
      const match = content.match(/\[FILE:(.*?)\]/);
      const fileUrl = match ? match[1] : '';
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
      return isImage ? t("messages.photo") : t("messages.file");
    }

    return content;
  })();

  const timeDisplay = (() => {
    if (!chat.last_message?.created_at) return '';

    const messageDate = new Date(chat.last_message.created_at).getTime();
    const diffMs = now - messageDate;

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return diffMs < 30_000 ? t("messages.justNow") : t("messages.minutesAgo", { count: 1 });
    if (diffMins < 60) return t("messages.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("messages.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("messages.daysAgoShort", { count: diffDays });
    if (diffWeeks < 4) return t("messages.weeksAgoShort", { count: diffWeeks });
    if (diffMonths < 12) return t("messages.monthsAgoShort", { count: diffMonths });
    return t("messages.yearsAgoShort", { count: diffYears });
  })();


  return (
    <div
      onClick={onSelect}
      className={`p-4 border-b cursor-pointer transition-colors ${
        isActive
          ? 'bg-green-50 border-l-4 border-l-green-700'
          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12 border-4 border-white shadow-lg">
            {chat.other_user?.avatar_url ? (
              <AvatarImage src={chat.other_user.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-lg bg-green-100 text-green-800 font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Badge unread count */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-700 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-gray-900 truncate ${
            unreadCount > 0 ? 'font-bold' : ''
          }`}>
            {displayName}
          </h3>
          <div className={`flex items-center gap-1 text-sm mt-1 ${
            unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'
          }`}>
            <span className="truncate min-w-0 flex-1 block max-w-40">
              <span dangerouslySetInnerHTML={{ __html: sanitizeMessage(lastMessagePreview) }} />
            </span>
            {timeDisplay && (
              <span className="text-xs text-gray-400 shrink-0">· {timeDisplay}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationList({
  chats,
  activeChatId,
  searchQuery,
  onSearchChange,
  onChatSelect,
  currentUserId,
  loading,
  onNewConversation,
  newConversationMode,
  pendingUser,
  filter,
  onFilterChange,
}: ConversationListProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const filteredChats = filterConversations(
    chats,
    filter,
    searchQuery,
    pendingUser?.id,
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r bg-white">
      {/* Search bar sticky */}
      <div className="sticky top-0 z-10 flex h-18.25 items-center border-b bg-white px-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t("messages.searchConversations")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Title + Filter Select sticky — same height as pinned banner */}
      <div className="sticky top-18 z-10 flex h-14 items-center border-b bg-white px-4">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 whitespace-nowrap">{t("messages.title")}</h2>
            {onNewConversation && (
              <button
                type="button"
                onClick={onNewConversation}
                className="cursor-pointer p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                title={t("messages.newConversation")}
              >
                <SquarePen className="h-4 w-4" />
              </button>
            )}
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-35 shrink-0 cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm"
              >
                <span className="truncate">
                  {filter === "unread"
                    ? t("messages.filterUnread")
                    : filter === "archived"
                      ? t("messages.filterArchived")
                      : t("messages.filterAll")}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className={cn("cursor-pointer", filter === "all" && "bg-accent")}
                onClick={() => onFilterChange("all")}
              >
                {t("messages.filterAll")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn("cursor-pointer", filter === "unread" && "bg-accent")}
                onClick={() => onFilterChange("unread")}
              >
                {t("messages.filterUnread")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn("cursor-pointer", filter === "archived" && "bg-accent")}
                onClick={() => onFilterChange("archived")}
              >
                {t("messages.filterArchived")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1 min-h-0">
        {/* "Nouveau message" item pinned at top when composing */}
        {newConversationMode && !pendingUser && (
          <div className="p-4 border-b bg-green-50 border-l-4 border-l-green-700">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-700 flex items-center justify-center shrink-0">
                <SquarePen className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800">{t("messages.newConversation")}</p>
                <p className="text-xs text-green-600">{t("messages.searchPeople")}</p>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-gray-200 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-1/2" />
                </div>
                <div className="h-3 w-8 bg-gray-100 animate-pulse rounded mt-1" />
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>
              {filter === 'unread'
                ? t("messages.noUnread")
                : filter === 'archived'
                ? t("messages.noArchived")
                : t("messages.noConversations")}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ConversationItem
              key={chat.id}
              chat={chat}
              isActive={!newConversationMode && !pendingUser && chat.id === activeChatId}
              currentUserId={currentUserId}
              onSelect={() => onChatSelect(chat.id)}
              now={now}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}