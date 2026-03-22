import { supabase } from '@/lib/supabaseClient';

export function usePinMessage() {
  const togglePin = async (messageId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          pinned_at: isPinned ? null : new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      return true;
    } catch (error) {
      throw error;
    }
  };

  const checkPinLimit = async (chatRoomId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', chatRoomId)
        .not('pinned_at', 'is', null);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      return 0;
    }
  };

  return { togglePin, checkPinLimit };
}