import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useMyProfile';
import { isProfileDetailsIncomplete } from '@/lib/onboardingSteps';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export function useStartConversation() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useMyProfile();
  const [loading, setLoading] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  const startConversation = async (otherUserId: string, redirectBack?: string) => {
    if (authLoading) return;
    if (!user) {
      const q = new URLSearchParams();
      if (redirectBack) q.set("redirect", redirectBack);
      q.set("from", "contact");
      router.push(`/login?${q.toString()}`);
      return;
    }

    if (profileLoading) return;
    if (user && isProfileDetailsIncomplete(profile)) {
      setShowCompleteProfile(true);
      return;
    }

    if (user.id === otherUserId) {
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
      router.push(`/messages?compose=${encodeURIComponent(otherUserId)}`);
    } finally {
      setLoading(false);
    }
  };

  return { startConversation, loading, showCompleteProfile, setShowCompleteProfile };
}
