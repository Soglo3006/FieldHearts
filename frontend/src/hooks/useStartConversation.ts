import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";
import { useMyProfile } from "@/hooks/useMyProfile";
import { isProfileDetailsIncomplete } from "@/lib/onboardingSteps";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function useStartConversation() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { requireAuth, notifyAuthActionReady } = useAuthGate();
  const { profile, loading: profileLoading } = useMyProfile();
  const [loading, setLoading] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [pendingContact, setPendingContact] = useState<{
    otherUserId: string;
    redirectBack?: string;
  } | null>(null);

  const continueConversation = useCallback(
    async (otherUserId: string) => {
      if (authLoading || profileLoading || !user) return;

      notifyAuthActionReady();

      if (isProfileDetailsIncomplete(profile)) {
        setLoading(false);
        setShowCompleteProfile(true);
        return;
      }

      if (user.id === otherUserId) {
        setLoading(false);
        toast.error("You cannot message yourself!");
        return;
      }

      setLoading(true);
      try {
        const [{ data: iBlocked }, { data: theyBlocked }] = await Promise.all([
          supabase
            .from("blocked_users")
            .select("id")
            .eq("blocker_id", user.id)
            .eq("blocked_user_id", otherUserId)
            .maybeSingle(),
          supabase
            .from("blocked_users")
            .select("id")
            .eq("blocker_id", otherUserId)
            .eq("blocked_user_id", user.id)
            .maybeSingle(),
        ]);
        if (iBlocked || theyBlocked) {
          toast.error(t("messages.cannotStartChatBlocked"));
          setLoading(false);
          return;
        }

        router.push(`/messages?compose=${encodeURIComponent(otherUserId)}`);
      } catch {
        setLoading(false);
      }
    },
    [authLoading, profileLoading, user, profile, router, t, notifyAuthActionReady],
  );

  useAuthResumeAction(
    "contact",
    (payload) => {
      const otherUserId = String(payload.otherUserId ?? "");
      if (!otherUserId) return;
      setLoading(true);
      setPendingContact({
        otherUserId,
        redirectBack:
          typeof payload.redirectBack === "string" ? payload.redirectBack : undefined,
      });
    },
    { waitForProfile: true },
  );

  useEffect(() => {
    if (!pendingContact || authLoading || profileLoading || !user) return;
    const { otherUserId } = pendingContact;
    setPendingContact(null);
    void continueConversation(otherUserId);
  }, [pendingContact, authLoading, profileLoading, user, continueConversation]);

  const startConversation = async (otherUserId: string, redirectBack?: string) => {
    if (authLoading) return;
    if (!user) {
      if (
        !requireAuth({
          context: "contact",
          redirect: redirectBack ?? `/messages?compose=${encodeURIComponent(otherUserId)}`,
          from: "contact",
          onSuccess: () => {
            setLoading(true);
            setPendingContact({ otherUserId, redirectBack });
          },
          resume: { type: "contact", payload: { otherUserId, redirectBack } },
        })
      ) {
        return;
      }
      return;
    }

    setLoading(true);
    await continueConversation(otherUserId);
  };

  return { startConversation, loading, showCompleteProfile, setShowCompleteProfile };
}
