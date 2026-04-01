import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatUnreadMessagePreview } from '@/lib/messagePreview';

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
    audio.play().catch(() => {
      // Le navigateur bloque l'audio si l'utilisateur n'a pas encore interagi avec la page
      // C'est normal, on ignore silencieusement
    });
  } catch {
    // Fallback silencieux
  }
}

export function useUnreadMessages() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [unreadChats, setUnreadChats] = useState<UnreadChat[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevUnreadCountRef = useRef(0);

  const formatMessagePreview = useCallback((content: string, isOwnMessage: boolean, senderName?: string) => {
    return formatUnreadMessagePreview(content, {
      isOwnMessage,
      senderName,
      labels: {
        ownPrefix: i18n.language.startsWith('fr') ? 'Vous: ' : 'You: ',
        photo: t('messages.photo'),
        file: t('messages.file'),
        voiceMessage: t('messages.voiceMessage'),
        fallbackSenderName: i18n.language.startsWith('fr') ? 'Quelqu’un' : 'Someone',
        formatVoiceFromOther: (name: string) => t('messages.sentVoiceMessageOther', { name }),
      },
    });
  }, [i18n.language, t]);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async (playSound = false) => {
      try {
        // Récupérer tous les chats de l'user (non supprimés)
        const { data: memberData } = await supabase
          .from('chat_room_member')
          .select('chat_room_id')
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        if (!memberData || memberData.length === 0) {
          setUnreadChats([]);
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        const chatRoomIds = memberData.map(m => m.chat_room_id);

        // Pour chaque chat, récupérer le dernier message + compter les non-lus via read_at
        const allChats = await Promise.all(
          chatRoomIds.map(async (chatId) => {
            // Dernier message du chat
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_room_id', chatId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!lastMsg) return null;

            // Compter les messages non lus (de l'autre personne, read_at IS NULL)
            const { count: unreadMsgCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_room_id', chatId)
              .neq('user_id', user.id)
              .is('read_at', null);

            const isUnread = (unreadMsgCount || 0) > 0;

            // Trouver l'autre membre pour afficher son profil
            const { data: otherMember } = await supabase
              .from('chat_room_member')
              .select('user_id')
              .eq('chat_room_id', chatId)
              .neq('user_id', user.id)
              .limit(1)
              .maybeSingle();

            const displayUserId = otherMember?.user_id || lastMsg.user_id;

            // Récupérer le profil
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, company_name, account_type, avatar_url')
              .eq('id', displayUserId)
              .maybeSingle();

            // Préfixer "Vous: " si le dernier message est le nôtre
            const senderName = profile?.account_type === 'company'
              ? profile?.company_name || profile?.full_name || 'Inconnu'
              : profile?.full_name || 'Inconnu';

            const messagePreview = formatMessagePreview(
              lastMsg.content,
              lastMsg.user_id === user.id,
              senderName
            );

            return {
              id: lastMsg.id,
              chat_room_id: chatId,
              last_message: messagePreview,
              last_message_time: lastMsg.created_at,
              sender_name: senderName,
              sender_avatar: profile?.avatar_url || null,
              sender_id: displayUserId,
              is_read: !isUnread,
              account_type: profile?.account_type || null,
            };
          })
        );

        // Filtrer les null, trier : non-lus d'abord, puis par date décroissante
        const validChats = allChats
          .filter((chat): chat is UnreadChat => chat !== null)
          .sort((a, b) => {
            if (!a.is_read && b.is_read) return -1;
            if (a.is_read && !b.is_read) return 1;
            return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
          });

        const newUnreadCount = validChats.filter(c => !c.is_read).length;

        // Jouer le son si le nombre de non-lus a augmenté (nouveau message reçu)
        if (playSound && newUnreadCount > prevUnreadCountRef.current) {
          playNotificationSound();
        }

        prevUnreadCountRef.current = newUnreadCount;
        setUnreadChats(validChats);
        setUnreadCount(newUnreadCount);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial sans son
    fetchMessages(false);

    // Real-time : écouter les nouveaux messages ET les updates (read_at)
    const channel = supabase
      .channel('new-messages-notif')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Nouveau message de quelqu'un d'autre → re-fetch avec son
          if (payload.new.user_id !== user.id) {
            fetchMessages(true);
          } else {
            // Notre propre message → re-fetch sans son
            fetchMessages(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchMessages(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_room_member',
        },
        (payload) => {
          // Re-fetch quand is_deleted ou is_archived change pour cet user
          const row = payload.new as { user_id: string; is_deleted?: boolean; is_archived?: boolean };
          if (row.user_id === user.id) {
            fetchMessages(false);
          }
        }
      )
      .subscribe();

    // Fallback polling every 15s in case realtime misses events
    const pollInterval = setInterval(() => fetchMessages(false), 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [formatMessagePreview, user]);

  const markAsRead = async (chatRoomId: string) => {
    if (!user) return;

    // 1. Update en base : mettre read_at sur tous les messages non lus de l'autre personne
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('chat_room_id', chatRoomId)
      .neq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      return;
    }

    // 2. Mettre à jour localement
    setUnreadChats(prev =>
      prev.map(c =>
        c.chat_room_id === chatRoomId ? { ...c, is_read: true } : c
      )
    );
    setUnreadCount(prev => {
      const newCount = Math.max(0, prev - 1);
      prevUnreadCountRef.current = newCount;
      return newCount;
    });
  };

  return { unreadChats, unreadCount, loading, markAsRead };
}