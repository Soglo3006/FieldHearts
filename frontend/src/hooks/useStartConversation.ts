import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateDirectChat } from '@/lib/chatUtils';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export function useStartConversation() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const startConversation = async (otherUserId: string, redirectBack?: string) => {
    if (authLoading) return;
    if (!user) {
      const q = new URLSearchParams();
      if (redirectBack) q.set("redirect", redirectBack);
      q.set("from", "contact");
      router.push(`/login?${q.toString()}`);
      return;
    }

    if (user.id === otherUserId) {
      // Ne pas créer de conversation avec soi-même
      toast.error("You cannot message yourself!");
      return;
    }

    const [{ data: iBlocked }, { data: theyBlocked }] = await Promise.all([
      supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_user_id", otherUserId).maybeSingle(),
      supabase.from("blocked_users").select("id").eq("blocker_id", otherUserId).eq("blocked_user_id", user.id).maybeSingle(),
    ]);
    if (iBlocked || theyBlocked) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return;
    }

    setLoading(true);

    try {
      // Créer ou obtenir la conversation
      const chatId = await getOrCreateDirectChat(otherUserId);

      if (chatId) {
        // Rediriger vers la page messages avec ce chat ouvert
        router.push(`/messages?chat=${chatId}`);
      } else {
        toast.error('Failed to create conversation. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { startConversation, loading };
}