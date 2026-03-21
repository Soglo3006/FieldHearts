import { supabase } from '@/lib/supabaseClient';

export function useDeleteMessage() {
    const deleteMessage = async (messageId: string) => {
    try {
        const { error } = await supabase
        .from('messages')
        .update({ 
            deleted_at: new Date().toISOString(),
            content: 'Message supprimé',
            reactions: [], 
        })
        .eq('id', messageId);

        if (error) throw error;

        return true;
    } catch (error) {
        throw error;
    }
    };

    return { deleteMessage };
    }