import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Chat {
  id: string;
  is_archived?: boolean;
}

interface OtherUser {
  id: string;
  full_name?: string;
  company_name?: string;
}

interface Params {
  activeChatId: string | null;
  userId: string | undefined;
  otherUser: OtherUser | undefined;
  chats: Chat[];
  isArchived: boolean;
  setIsBlocked: (v: boolean) => void;
  setIsMuted: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  setActiveChatId: (v: string | null) => void;
  removeChat: (id: string) => void;
  archiveChat: (id: string, archived: boolean) => void;
  /** Called after a successful block insert so the UI can refresh local block lists */
  onBlockedUser?: (blockedUserId: string) => void;
}

export function useConversationActions({
  activeChatId, userId, otherUser, chats, isArchived,
  setIsBlocked, setIsMuted, setShowSettings, setActiveChatId,
  removeChat, archiveChat,
}: Params) {
  const router = useRouter();

  const handleToggleMute = useCallback(async (isMuted: boolean) => {
    if (!activeChatId || !userId) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await supabase
      .from("chat_room_member")
      .update({ is_muted: newMuted })
      .eq("chat_room_id", activeChatId)
      .eq("user_id", userId);
  }, [activeChatId, userId, setIsMuted]);

  const handleDeleteConversation = useCallback(async () => {
    if (!activeChatId || !userId) return;
    const remainingChats = chats.filter(c => c.id !== activeChatId && !c.is_archived);
    const { error } = await supabase
      .from("chat_room_member")
      .update({ is_deleted: true })
      .eq("chat_room_id", activeChatId)
      .eq("user_id", userId);
    if (error) throw error;
    removeChat(activeChatId);
    setShowSettings(false);
    if (remainingChats.length > 0) {
      const nextId = remainingChats[0].id;
      setActiveChatId(nextId);
      router.replace(`/messages?chat=${nextId}`);
    } else {
      setActiveChatId(null);
      router.replace("/messages");
    }
  }, [activeChatId, userId, chats, removeChat, setShowSettings, setActiveChatId, router]);

  const handleBlockUser = useCallback(async () => {
    if (!otherUser?.id) return;
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: userId, blocked_user_id: otherUser.id });
    if (error && error.code !== "23505") throw error;
    setIsBlocked(true);
    onBlockedUser?.(otherUser.id);
    setShowSettings(false);
  }, [otherUser, userId, setIsBlocked, setShowSettings, onBlockedUser]);

  const handleReportUser = useCallback(async (reason: string, details: string) => {
    if (!otherUser?.id) return;
    const { error } = await supabase
      .from("user_reports")
      .insert({
        reporter_id: userId,
        reported_user_id: otherUser.id,
        reason,
        description: details,
        status: "pending",
      });
    if (error) throw error;
  }, [otherUser, userId]);

  const handleArchive = useCallback(async () => {
    if (!activeChatId || !userId) return;
    const newIsArchived = !isArchived;
    const { error } = await supabase
      .from("chat_room_member")
      .update({ is_archived: newIsArchived })
      .eq("chat_room_id", activeChatId)
      .eq("user_id", userId);
    if (error) throw error;
    archiveChat(activeChatId, newIsArchived);
    if (newIsArchived) {
      const next = chats.find(c => c.id !== activeChatId && !c.is_archived);
      if (next) {
        setActiveChatId(next.id);
        router.replace(`/messages?chat=${next.id}`);
      } else {
        setActiveChatId(null);
        router.replace("/messages");
      }
      setShowSettings(false);
    }
  }, [activeChatId, userId, isArchived, chats, archiveChat, setActiveChatId, setShowSettings, router]);

  return { handleToggleMute, handleDeleteConversation, handleBlockUser, handleReportUser, handleArchive };
}
