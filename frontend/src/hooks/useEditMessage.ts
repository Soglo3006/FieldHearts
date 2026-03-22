import { supabase } from '@/lib/supabaseClient';

export function useEditMessage() {
  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      return true;
    } catch (error) {
      throw error;
    }
  };

  return { editMessage };
}