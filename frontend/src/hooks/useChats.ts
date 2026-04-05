import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatRoom {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  other_user?: {
    id: string;
    email: string;
    full_name: string;
    company_name?: string;
    account_type?: string;
    avatar_url: string | null;
    bio?: string;
    created_at?: string;
  };
  unread_count?: number;
  is_archived?: boolean;
}

export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  // Stable ref so the INSERT listener always sees the current user id
  const userIdRef = useRef(user?.id);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  const fetchChats = useCallback(async (silent = false) => {
    if (!user?.id) {
      setChats([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const { data: chatRoomMembers, error: membersError } = await supabase
        .from('chat_room_member')
        .select('chat_room_id, is_archived, is_deleted')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (membersError) throw membersError;

      const chatRoomIds = (chatRoomMembers || []).map((m: { chat_room_id: string; is_archived?: boolean; is_deleted?: boolean }) => m.chat_room_id);

      const archivedByChat: Record<string, boolean> = {};
      (chatRoomMembers || []).forEach((m: { chat_room_id: string; is_archived?: boolean; is_deleted?: boolean }) => {
        if (m.is_archived) archivedByChat[m.chat_room_id] = true;
      });

      if (chatRoomIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Rooms + all unread counts in parallel — 2 queries instead of N+1
      const [
        { data: chatRooms, error: roomsError },
        { data: unreadMessages },
      ] = await Promise.all([
        supabase.from('chat_room').select('id, created_at, other_user_id, last_message, last_message_at').in('id', chatRoomIds),
        supabase
          .from('messages')
          .select('chat_room_id')
          .in('chat_room_id', chatRoomIds)
          .neq('user_id', user.id)
          .is('read_at', null),
      ]);

      if (roomsError) throw roomsError;

      // Build unread map in a single O(n) pass
      const unreadByChat: Record<string, number> = {};
      (unreadMessages || []).forEach((msg: { chat_room_id: string }) => {
        unreadByChat[msg.chat_room_id] = (unreadByChat[msg.chat_room_id] || 0) + 1;
      });

      const chatsWithDetails = await Promise.all(
        (chatRooms || []).map(async (room: { id: string; created_at: string }) => {
          const { data: members } = await supabase
            .from('chat_room_member')
            .select('user_id')
            .eq('chat_room_id', room.id)
            .neq('user_id', user.id);

          const otherUserId = (members as { user_id: string }[] | null)?.[0]?.user_id;

          const [{ data: otherUserProfile }, { data: lastMessage }] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, full_name, company_name, account_type, avatar_url, bio, created_at')
              .eq('id', otherUserId)
              .maybeSingle(),
            supabase
              .from('messages')
              .select('content, created_at, user_id')
              .eq('chat_room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          return {
            ...room,
            other_user: otherUserProfile,
            last_message: lastMessage,
            unread_count: unreadByChat[room.id] || 0,
            is_archived: archivedByChat[room.id] || false,
          };
        })
      );

      chatsWithDetails.sort((a, b) => {
        const timeA = a.last_message?.created_at
          ? new Date(a.last_message.created_at).getTime()
          : new Date(a.created_at).getTime();
        const timeB = b.last_message?.created_at
          ? new Date(b.last_message.created_at).getTime()
          : new Date(b.created_at).getTime();
        return timeB - timeA;
      });

      setChats(chatsWithDetails as unknown as ChatRoom[]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setChats([]);
      setLoading(false);
      return;
    }

    fetchChats();

    const channel = supabase
      .channel('chat-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { chat_room_id: string; content: string; created_at: string; user_id: string };
          const currentUserId = userIdRef.current;

          setChats((prev) => {
            const exists = prev.some(c => c.id === msg.chat_room_id);
            // New conversation not yet in state — refetch to add it
            if (!exists) {
              fetchChats(true);
              return prev;
            }
            return prev
              .map((chat) => {
                if (chat.id !== msg.chat_room_id) return chat;
                return {
                  ...chat,
                  last_message: { content: msg.content, created_at: msg.created_at, user_id: msg.user_id },
                  unread_count: msg.user_id !== currentUserId
                    ? (chat.unread_count || 0) + 1
                    : chat.unread_count,
                };
              })
              .sort((a, b) => {
                const timeA = a.last_message?.created_at
                  ? new Date(a.last_message.created_at).getTime()
                  : new Date(a.created_at).getTime();
                const timeB = b.last_message?.created_at
                  ? new Date(b.last_message.created_at).getTime()
                  : new Date(b.created_at).getTime();
                return timeB - timeA;
              });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          // Use the payload directly — no extra REST call needed
          const updated = payload.new as { chat_room_id: string; content: string; created_at: string; user_id: string; deleted_at?: string };
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === updated.chat_room_id
                ? { ...chat, last_message: { content: updated.content, created_at: updated.created_at, user_id: updated.user_id } }
                : chat
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_room_member' },
        (payload) => {
          const inserted = payload.new as { user_id: string; chat_room_id: string };
          if (inserted.user_id === userIdRef.current) {
            fetchChats(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_room_member' },
        (payload) => {
          const updated = payload.new as { user_id: string; chat_room_id: string; is_deleted?: boolean };
          if (updated.user_id === user.id && updated.is_deleted) {
            setChats((prev) => prev.filter(c => c.id !== updated.chat_room_id));
          }
        }
      )
      .subscribe((status) => {
        // Re-fetch after reconnect to recover any events missed during downtime
        if (status === 'SUBSCRIBED') fetchChats(true);
      });

    // Re-fetch when browser comes back online after being offline
    const handleOnline = () => fetchChats(true);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchChats]);

  /** Instantly zero the badge for a chat — call when the user opens it */
  const clearUnreadCount = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unread_count: 0 } : c))
    );
  }, []);

  /** Optimistically update the archived state for a chat */
  const archiveChat = useCallback((chatId: string, isArchived: boolean) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, is_archived: isArchived } : c))
    );
  }, []);

  /** Instantly remove a chat from the list (optimistic delete) */
  const removeChat = useCallback((chatId: string) => {
    setChats((prev) => prev.filter(c => c.id !== chatId));
  }, []);

  /** Optimistically update last message preview — call immediately after sender sends */
  const updateLastMessage = useCallback((chatId: string, content: string, userId: string, createdAt: string) => {
    setChats((prev) =>
      prev
        .map((c) =>
          c.id === chatId
            ? { ...c, last_message: { content, created_at: createdAt, user_id: userId } }
            : c
        )
        .sort((a, b) => {
          const timeA = a.last_message?.created_at
            ? new Date(a.last_message.created_at).getTime()
            : new Date(a.created_at).getTime();
          const timeB = b.last_message?.created_at
            ? new Date(b.last_message.created_at).getTime()
            : new Date(b.created_at).getTime();
          return timeB - timeA;
        })
    );
  }, []);

  return { chats, loading, clearUnreadCount, archiveChat, removeChat, updateLastMessage, refreshChats: () => fetchChats(true) };
}