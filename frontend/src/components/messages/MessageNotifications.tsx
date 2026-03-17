"use client";

import { MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Spinner } from "@/components/ui/Spinner";

export default function MessageNotifications() {
  const { t, i18n } = useTranslation();
  const { unreadChats, unreadCount, loading, markAsRead } = useUnreadMessages();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleMessageClick = (chatRoomId: string) => {
    markAsRead(chatRoomId);
    setOpen(false);
    router.push(`/messages?chat=${chatRoomId}`);
  };

  const handleMarkAsRead = (e: React.MouseEvent, chatRoomId: string) => {
    e.stopPropagation();
    markAsRead(chatRoomId);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return t("messages.justNow");
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h`;
    }
    return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer hover:bg-gray-100"
        >
          <MessageCircle className="h-6 w-6 text-gray-700" />
          {/* Red dot indicator — no number, just a dot */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 rounded-xl shadow-lg border border-gray-200"
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {t("messages.inbox")}
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs font-normal text-gray-500">
                  ({unreadCount})
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Conversations List — scrollable */}
        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="sm" />
            </div>
          ) : unreadChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <MessageCircle className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">{t("messages.noNewMessages")}</p>
            </div>
          ) : (
            <div>
              {unreadChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleMessageClick(chat.chat_room_id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0",
                    !chat.is_read
                      ? "bg-blue-50/70 hover:bg-blue-100/70"
                      : "bg-gray-50/50 hover:bg-gray-100/60"
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-11 w-11 shrink-0">
                    {chat.sender_avatar ? (
                      <AvatarImage src={chat.sender_avatar} alt={chat.sender_name} />
                    ) : null}
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-sm font-medium">
                      {chat.sender_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm truncate",
                          !chat.is_read
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-700"
                        )}
                      >
                        {chat.sender_name}
                      </p>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {formatTime(chat.last_message_time)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-[13px] line-clamp-2 mt-0.5",
                        !chat.is_read ? "text-gray-700" : "text-gray-500"
                      )}
                    >
                      {chat.last_message}
                    </p>
                  </div>

                  {/* Unread indicator dot + mark as read */}
                  {!chat.is_read ? (
                    <button
                      onClick={(e) => handleMarkAsRead(e, chat.chat_room_id)}
                      className="cursor-pointer shrink-0 group flex items-center justify-center h-8 w-8 rounded-full hover:bg-blue-100 transition-colors"
                      title={t("messages.markAsRead")}
                    >
                      {/* Blue dot that becomes a check on hover */}
                      <span className="block group-hover:hidden h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <Check className="hidden group-hover:block h-4 w-4 text-blue-600" />
                    </button>
                  ) : (
                    <div className="shrink-0 w-8" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — See All in Inbox */}
        <div className="border-t border-gray-200 px-4 py-3">
          <button
            onClick={() => { setOpen(false); router.push('/messages'); }}
            className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline w-full text-center transition-colors cursor-pointer"
          >
            {t("messages.seeAllInbox")}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
