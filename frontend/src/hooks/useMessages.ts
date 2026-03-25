import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 40;

export interface Message {
  id: string;
  content: string;
  user_id: string;
  chat_room_id: string;
  created_at: string;
  read_at?: string | null;
  edited_at?: string | null;
  pinned_at?: string | null;
  replied_to_message_id?: string | null;
  client_temp_id?: string;
  deleted_at?: string | null;
  status?: "sending" | "sent" | "failed";
  reactions?: { emoji: string; user_ids: string[] }[];
  sender?: {
    id?: string;
    full_name?: string;
    company_name?: string;
    account_type?: string;
    avatar_url?: string | null;
  } | null;
  replied_to?: {
    id: string;
    content: string;
    user_id: string;
    sender_name?: string;
    deleted_at?: string | null;
  } | null;
}

interface CachedProfile {
  id: string;
  email?: string;
  full_name?: string;
  company_name?: string;
  account_type?: string;
  avatar_url?: string | null;
}

interface RawMessage {
  id: string;
  content: string;
  user_id: string;
  chat_room_id: string;
  created_at: string;
  read_at?: string | null;
  edited_at?: string | null;
  pinned_at?: string | null;
  replied_to_message_id?: string | null;
  client_temp_id?: string;
  deleted_at?: string | null;
  reactions?: { emoji: string; user_ids: string[] }[];
  replied_to?: {
    id: string;
    content: string;
    user_id: string;
    deleted_at?: string | null;
  } | null;
}

export function useMessages(chatRoomId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadedChatId, setLoadedChatId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestIdRef = useRef(0);
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const profilesCacheRef = useRef<Map<string, CachedProfile>>(new Map());

  // Stable refs for use inside async callbacks and stable event handlers
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);

  messagesRef.current = messages;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;

  const makeTempId = () =>
    `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const ensureProfiles = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !profilesCacheRef.current.has(id));
    if (!missing.length) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_name, account_type, avatar_url')
      .in('id', missing);

    (data || []).forEach((p) => profilesCacheRef.current.set(p.id, p as CachedProfile));
  }, []);

  const enrichMessages = useCallback(async (rawMessages: RawMessage[]): Promise<Message[]> => {
    const senderIds = [...new Set(rawMessages.map((m) => m.user_id))];
    const repliedUserIds = [...new Set(
      rawMessages
        .filter((m) => m.replied_to?.user_id)
        .map((m) => m.replied_to!.user_id)
    )];

    await ensureProfiles([...senderIds, ...repliedUserIds]);

    return rawMessages.map((msg) => {
      let repliedToData = null;
      if (msg.replied_to) {
        const repliedProfile = profilesCacheRef.current.get(msg.replied_to.user_id);
        repliedToData = {
          id: msg.replied_to.id,
          content: msg.replied_to.content,
          user_id: msg.replied_to.user_id,
          deleted_at: msg.replied_to.deleted_at,
          sender_name:
            repliedProfile?.account_type === 'company'
              ? repliedProfile.company_name
              : repliedProfile?.full_name,
        };
      }
      return {
        ...msg,
        status: 'sent' as const,
        sender: profilesCacheRef.current.get(msg.user_id) || null,
        replied_to: repliedToData,
      };
    });
  }, [ensureProfiles]);

  // Stable fetch — called on initial load, on channel SUBSCRIBED (reconnect), and on browser online
  const fetchMessages = useCallback(async () => {
    if (!chatRoomId) return;

    const currentRequestId = ++requestIdRef.current;

    // show cache instantly (Messenger feel)
    const cached = messagesCacheRef.current.get(chatRoomId);
    if (cached) {
      setMessages(cached);
      setLoading(false);
      setLoadedChatId(chatRoomId);
    } else {
      setMessages([]);
      setLoading(true);
      setLoadedChatId(null);
    }
    setHasMore(false);

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          replied_to:replied_to_message_id (
            id,
            content,
            user_id,
            deleted_at
          )
        `)
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (error) throw error;
      if (currentRequestId !== requestIdRef.current) return;

      const hasMoreResult = (messagesData || []).length > PAGE_SIZE;
      const slice = hasMoreResult
        ? (messagesData || []).slice(0, PAGE_SIZE)
        : (messagesData || []);
      const reversed = [...slice].reverse();
      const enriched = await enrichMessages(reversed);

      if (currentRequestId !== requestIdRef.current) return;

      setMessages(enriched);
      setLoadedChatId(chatRoomId);
      setHasMore(hasMoreResult);
      messagesCacheRef.current.set(chatRoomId, enriched);
    } catch (err) {
    } finally {
      if (currentRequestId === requestIdRef.current) setLoading(false);
    }
  }, [chatRoomId, enrichMessages]);

  // Track active chat in user_presence so the backend can suppress push notifications
  // when the recipient is already viewing this conversation.
  useEffect(() => {
    if (!user?.id || !chatRoomId) return;

    (async () => {
      await supabase.from('user_presence').upsert(
        { user_id: user.id, active_chat_id: chatRoomId },
        { onConflict: 'user_id' }
      );
    })();

    return () => {
      (async () => {
        await supabase.from('user_presence').upsert(
          { user_id: user.id, active_chat_id: null },
          { onConflict: 'user_id' }
        );
      })();
    };
  }, [user?.id, chatRoomId]);

  // Initial load — fetch last PAGE_SIZE messages
  useEffect(() => {
    if (!chatRoomId) {
      setMessages([]);
      setLoading(false);
      setLoadedChatId(null);
      setHasMore(false);
      return;
    }

    fetchMessages();

    const handleOnline = () => fetchMessages();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [chatRoomId, fetchMessages]);

  // Load older messages (called when user scrolls to the top)
  const loadMore = useCallback(async (): Promise<number> => {
    if (!chatRoomId || loadingMoreRef.current || !hasMoreRef.current) return 0;

    const oldest = messagesRef.current[0];
    if (!oldest) return 0;

    const capturedRequestId = requestIdRef.current;
    setLoadingMore(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          replied_to:replied_to_message_id (
            id,
            content,
            user_id,
            deleted_at
          )
        `)
        .eq('chat_room_id', chatRoomId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (error) throw error;
      if (capturedRequestId !== requestIdRef.current) return 0;

      const hasMoreResult = (data || []).length > PAGE_SIZE;
      const slice = hasMoreResult ? (data || []).slice(0, PAGE_SIZE) : (data || []);
      const reversed = [...slice].reverse();
      const enriched = await enrichMessages(reversed);

      if (capturedRequestId !== requestIdRef.current) return 0;

      setMessages((prev) => {
        const next = [...enriched, ...prev];
        messagesCacheRef.current.set(chatRoomId, next);
        return next;
      });
      setHasMore(hasMoreResult);
      return enriched.length;
    } catch (err) {
      return 0;
    } finally {
      if (capturedRequestId === requestIdRef.current) setLoadingMore(false);
    }
  }, [chatRoomId, enrichMessages]);

  // INSERT listener — also re-fetches on reconnect (SUBSCRIBED fires after channel recovery)
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        async (payload) => {
          const row = payload.new as RawMessage;
          const activeId = chatRoomId;

          await ensureProfiles([row.user_id]);

          let repliedToData = null;
          if (row.replied_to_message_id) {
            const existing = (messagesCacheRef.current.get(activeId) || []).find(
              (m) => m.id === row.replied_to_message_id
            );
            if (existing) {
              repliedToData = {
                id: existing.id,
                content: existing.content,
                user_id: existing.user_id,
                sender_name: existing.sender?.account_type === 'company'
                  ? existing.sender.company_name
                  : existing.sender?.full_name,
                deleted_at: existing.deleted_at || null,
              };
            }
          }

          const incoming: Message = {
            ...row,
            sender: profilesCacheRef.current.get(row.user_id) || null,
            replied_to: repliedToData,
            status: 'sent' as const,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;

            if (incoming.client_temp_id) {
              const idx = prev.findIndex((m) => m.client_temp_id === incoming.client_temp_id);
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = incoming;
                messagesCacheRef.current.set(activeId, copy);
                return copy;
              }
            }

            const next = [...prev, incoming];
            messagesCacheRef.current.set(activeId, next);
            return next;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchMessages();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, fetchMessages, ensureProfiles]);

  // UPDATE listener
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`updates:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const updated = payload.new as RawMessage;
          const activeId = chatRoomId;

          setMessages((prev) => {
            const next = prev.map((msg) => {
              if (msg.id === updated.id) {
                if (updated.deleted_at) {
                  return { ...msg, content: 'Message supprimé', deleted_at: updated.deleted_at, reactions: [] };
                }
                return {
                  ...msg,
                  content: updated.content,
                  edited_at: updated.edited_at,
                  pinned_at: updated.pinned_at,
                  reactions: updated.reactions,
                  read_at: updated.read_at,
                };
              }

              if (msg.replied_to_message_id === updated.id && updated.deleted_at) {
                return {
                  ...msg,
                  replied_to: msg.replied_to
                    ? { ...msg.replied_to, deleted_at: updated.deleted_at, content: 'Message supprimé' }
                    : null,
                };
              }

              return msg;
            });

            messagesCacheRef.current.set(activeId, next);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  const sendMessage = async (content: string, repliedToMessageId?: string | null) => {
    if (!content.trim() || !chatRoomId || !user) return;

    const trimmed = content.trim();
    const tempId = makeTempId();
    const nowIso = new Date().toISOString();

    const optimistic: Message = {
      id: tempId,
      client_temp_id: tempId,
      chat_room_id: chatRoomId,
      user_id: user.id,
      content: trimmed,
      created_at: nowIso,
      replied_to_message_id: repliedToMessageId || null,
      status: 'sending' as const,
      replied_to: repliedToMessageId
        ? (() => {
            const target = messagesRef.current.find((m) => m.id === repliedToMessageId);
            return target
              ? { id: target.id, content: target.content, user_id: target.user_id, sender_name: target.sender?.full_name }
              : null;
          })()
        : null,
    };

    setMessages((prev) => {
      const next = [...prev, optimistic];
      messagesCacheRef.current.set(chatRoomId, next);
      return next;
    });

    setSending(true);

    try {
      const { error } = await supabase.from('messages').insert({
        chat_room_id: chatRoomId,
        user_id: user.id,
        content: trimmed,
        client_temp_id: tempId,
        replied_to_message_id: repliedToMessageId || null,
      });
      if (error) throw error;

      // Restore conversation for any member who had deleted it on their side
      await supabase
        .from('chat_room_member')
        .update({ is_deleted: false })
        .eq('chat_room_id', chatRoomId)
        .neq('user_id', user.id)
        .eq('is_deleted', true);

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatRoomId,
          senderUserId: user.id,
          messagePreview: trimmed.substring(0, 100),
        }),
      }).catch(() => {});

    } catch (err) {
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m));
        messagesCacheRef.current.set(chatRoomId, next);
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (tempId: string) => {
    const msg = messagesRef.current.find((m) => m.id === tempId);
    if (!msg) return;
    await sendMessage(msg.content, msg.replied_to_message_id);
  };

  return { messages, loading, sending, sendMessage, retryMessage, loadedChatId, hasMore, loadingMore, loadMore };
}
