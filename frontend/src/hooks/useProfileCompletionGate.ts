"use client";

import { useCallback, useState } from "react";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  isProfileDetailsIncomplete,
  profileCompletionPath,
} from "@/lib/onboardingSteps";

export function useProfileCompletionGate() {
  const { profile, loading } = useMyProfile();
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const profileDetailsIncomplete = isProfileDetailsIncomplete(profile);
  const completeProfileHref = profileCompletionPath(profile?.account_type);

  const guardProfileAction = useCallback(
    (action?: () => void | Promise<void>) => {
      if (loading) return false;
      if (profileDetailsIncomplete) {
        setShowCompleteProfile(true);
        return false;
      }
      void action?.();
      return true;
    },
    [loading, profileDetailsIncomplete]
  );

  return {
    profile,
    loading,
    profileDetailsIncomplete,
    completeProfileHref,
    showCompleteProfile,
    setShowCompleteProfile,
    guardProfileAction,
  };
}
