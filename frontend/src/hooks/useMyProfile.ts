"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboardingSetup } from "@/lib/onboarding";
import type { ProfileForCompletion } from "@/lib/onboardingSteps";

export function useMyProfile() {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<ProfileForCompletion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !session?.access_token || needsOnboardingSetup(user)) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) setProfile(data);
      })
      .catch(() => {
        if (alive) setProfile(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user, session?.access_token]);

  return { profile, loading };
}
