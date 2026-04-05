import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatUnreadMessagePreview } from '@/lib/messagePreview';
import { getLanguageCode } from '@/lib/locale';

export interface UnreadChat {
  id: string;
  chat_room_id: string;
  last_message: string;
  last_message_time: string;
  sender_name: string;
  sender_avatar: string | null;
  sender_id: string;
  is_read: boolean;
  account_type: string | null;
}

function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // silently ignore
  }
}

export function useUnreadMessages() {
  const { user, session } = useAuth();
  const { t, i18n } = useTranslation();
  const [unreadChats, setUnreadChats] = useState<UnreadChat[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevUnreadCountRef = useRef(0);
  const languageCode = getLanguageCode(i18n.language);

  const formatMessagePreview = useCallback((content: string, isOwnMessage: boolean, senderName?: string, deletedAt?: string | null) => {
    return formatUnreadMessagePreview(content, {
      isOwnMessage,
      senderName,
      deletedAt,
      labels: {
        ownPrefix: `${t('messages.youPrefix')}: `,
        photo: t('messages.photo'),
        file: t('messages.file'),
        voiceMessage: t('messages.voiceMessage'),
        deleted: t('messages.deleted'),
        fallbackSenderName: t('messages.someone'),
        formatVoiceFromOther: (name: string) => t('messages.sentVoiceMessageOther', { name }),
      },
    });
  }, [t]);

  useEffect(() => {
    if (!user || !session) return;

    /**
     * Single backend call replacing N×3 Supabase REST calls.
     * Zero Supabase egress — goes through pool (direct DB).
     */
    const fetchSummary = async (playSound = false) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/unread-summary`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const rows: {
          chat_room_id: string;
          last_message_id: string;
          last_message_content: string;
          last_message_time: string;
          last_message_user_id: string;
          last_message_deleted_at: string | null;
          unread_count: number;
          other_user_id: string;
          other_user_name: string;
          avatar_url: string | null;
          account_type: string | null;
        }[] = await res.json();

        const chats: UnreadChat[] = rows.map(r => {
          const isOwnMessage = r.last_message_user_id === user.id;
          const senderName = r.other_user_name || t('common.unknown');
          const preview = formatMessagePreview(
            r.last_message_content,
            isOwnMessage,
            senderName,
            r.last_message_deleted_at
          );
          return {
            id:                r.last_message_id,
            chat_room_id:      r.chat_room_id,
            last_message:      preview,
            last_message_time: r.last_message_time,
            sender_name:       senderName,
            sender_avatar:     r.avatar_url,
            sender_id:         r.other_user_id,
            is_read:           r.unread_count === 0,
            account_type:      r.account_type,
          };
        }).sort((a, b) => {
          if (!a.is_read && b.is_read) return -1;
          if (a.is_read && !b.is_read) return 1;
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        });

        const newUnreadCount = chats.filter(c => !c.is_read).length;
        if (playSound && newUnreadCount > prevUnreadCountRef.current) {
          playNotificationSound();
        }
        prevUnreadCountRef.current = newUnreadCount;
        setUnreadChats(chats);
        setUnreadCount(newUnreadCount);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    };

    fetchSummary(false);

    // Realtime: re-fetch on message changes relevant to this user.
    // RLS on messages table ensures only the user's events are received.
    const channel = supabase
      .channel('unread-summary-notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const isOwnMessage = payload.new.user_id === user.id;
        fetchSummary(!isOwnMessage);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        fetchSummary(false);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_room_member' }, (payload) => {
        if (payload.new.user_id === user.id) fetchSummary(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, session, formatMessagePreview, languageCode]);

  const markAsRead = async (chatRoomId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('chat_room_id', chatRoomId)
      .neq('user_id', user.id)
      .is('read_at', null);

    setUnreadChats(prev =>
      prev.map(c => c.chat_room_id === chatRoomId ? { ...c, is_read: true } : c)
    );
    setUnreadCount(prev => {
      const newCount = Math.max(0, prev - 1);
      prevUnreadCountRef.current = newCount;
      return newCount;
    });
  };

  return { unreadChats, unreadCount, loading, markAsRead };
}
