import { supabase } from '@/lib/supabaseClient';

/**
 * Créer ou obtenir une conversation directe avec un autre utilisateur
 * @param otherUserId - L'ID de l'autre utilisateur
 * @returns L'ID de la conversation (existante ou nouvelle)
 */
export async function getOrCreateDirectChat(otherUserId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .rpc('get_or_create_direct_chat', {
        other_user_id: otherUserId
      });

    if (error) {
      return null;
    }

    // If the user had previously deleted this conversation, restore it
    await supabase
      .from('chat_room_member')
      .update({ is_deleted: false })
      .eq('chat_room_id', data)
      .eq('user_id', user.id)
      .eq('is_deleted', true);

    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Vérifier si une conversation existe déjà avec un utilisateur
 * @param currentUserId - L'ID de l'utilisateur actuel
 * @param otherUserId - L'ID de l'autre utilisateur
 * @returns L'ID de la conversation si elle existe, null sinon
 */
export async function findExistingChat(
  currentUserId: string, 
  otherUserId: string
): Promise<string | null> {
  try {
    // Trouver tous les chats où l'utilisateur actuel est membre
    const { data: userChats } = await supabase
      .from('chat_room_member')
      .select('chat_room_id')
      .eq('user_id', currentUserId);

    if (!userChats || userChats.length === 0) {
      return null;
    }

    const chatRoomIds = userChats.map(c => c.chat_room_id);

    // Pour chaque chat, vérifier si c'est un chat direct avec l'autre user
    for (const chatId of chatRoomIds) {
      const { data: chatRoom } = await supabase
        .from('chat_room')
        .select('is_group')
        .eq('id', chatId)
        .maybeSingle();

      // Seulement les chats directs (pas de groupe)
      if (chatRoom && !chatRoom.is_group) {
        // Vérifier si l'autre user est membre
        const { data: members } = await supabase
          .from('chat_room_member')
          .select('user_id')
          .eq('chat_room_id', chatId);

        if (members && members.length === 2) {
          const memberIds = members.map(m => m.user_id);
          if (memberIds.includes(otherUserId)) {
            return chatId;
          }
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}