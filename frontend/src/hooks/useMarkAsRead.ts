import { supabase } from '@/lib/supabaseClient';

export function useMarkAsRead() {
  const markChatAsRead = async (chatRoomId: string, currentUserId: string) => {
    try {
      // Marquer tous les messages NON-LUS de l'autre personne comme lus
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_room_id', chatRoomId)
        .neq('user_id', currentUserId) // Messages de l'AUTRE personne seulement
        .is('read_at', null); // Seulement ceux qui ne sont pas encore lus

      if (error) throw error;

      return true;
    } catch (error) {
      throw error;
    }
  };

  return { markChatAsRead };
}