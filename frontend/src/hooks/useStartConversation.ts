import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
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

    // Open a draft conversation shell. The real chat is created
    // only when the first message is sent from the messages page.
    setLoading(true);
    try {
      router.push(`/messages?compose=${encodeURIComponent(otherUserId)}`);
    } finally {
      setLoading(false);
    }
  };

  return { startConversation, loading };
}