"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { fetchMyProfileOnce, getCachedMyProfile } from "@/lib/fetchMyProfile";
import type { ProfileForCompletion } from "@/lib/onboardingSteps";

export function useMyProfile() {
  const { user, session } = useAuth();
  const userId = user?.id;

  const [profile, setProfile] = useState<ProfileForCompletion | null>(() => {
    if (!userId) return null;
    return getCachedMyProfile(userId) as ProfileForCompletion | null;
  });
  const [loading, setLoading] = useState(() => {
    if (!userId || !session?.access_token || needsOnboardingSetup(user)) return false;
    return !getCachedMyProfile(userId);
  });

  useEffect(() => {
    if (!userId || !session?.access_token || needsOnboardingSetup(user)) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const cached = getCachedMyProfile(userId);
    if (cached) {
      setProfile(cached as ProfileForCompletion);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let alive = true;
    void fetchMyProfileOnce(userId, session.access_token).then((data) => {
      if (!alive) return;
      if (data) setProfile(data as ProfileForCompletion);
      else if (!cached) setProfile(null);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [userId, session?.access_token, user]);

  return { profile, loading };
}
