import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useUnreadCount(chatRoomId: string | null, currentUserId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!chatRoomId || !currentUserId) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_room_id', chatRoomId)
          .neq('user_id', currentUserId) 
          .is('read_at', null); 

        if (error) throw error;
        setUnreadCount(count || 0);
      } catch (error) {
      }
    };

    fetchUnreadCount();

    // Realtime listener pour mettre à jour le compteur
    const channel = supabase
      .channel(`unread:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, currentUserId]);

  return unreadCount;
}