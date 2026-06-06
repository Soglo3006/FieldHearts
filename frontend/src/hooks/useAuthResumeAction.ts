"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/hooks/useMyProfile";
import { consumeAuthResume } from "@/lib/authGateResume";

type UseAuthResumeActionOptions = {
  waitForProfile?: boolean;
};

export function useAuthResumeAction(
  type: string,
  handler: (payload: Record<string, unknown>) => void,
  options?: UseAuthResumeActionOptions,
) {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useMyProfile();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (authLoading || !user) return;
    if (options?.waitForProfile && profileLoading) return;

    const action = consumeAuthResume(type);
    if (!action) return;

    handlerRef.current(action.payload ?? {});
  }, [authLoading, user, profileLoading, type, options?.waitForProfile]);
}
