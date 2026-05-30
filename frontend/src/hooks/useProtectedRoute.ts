"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/auth";
import { needsOnboardingSetup } from "@/lib/onboarding";

interface UseProtectedRouteOptions {
  requireAuth?: boolean;
  requireProfileCompleted?: boolean;
  redirectTo?: string;
  redirectAfterLogin?: string;
}

export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const {
    requireAuth = true,
    requireProfileCompleted = false,
    redirectTo = "/login",
    redirectAfterLogin,
  } = options;

  const { user, loading, isLoggingOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || isLoggingOut) return;

    if (requireAuth && !user) {
      router.replace(redirectTo);
      return;
    }

    if (requireProfileCompleted && user && needsOnboardingSetup(user)) {
      router.replace("/choose_type");
      return;
    }

    if (!requireAuth && user) {
      if (isAdminUser(user)) {
        router.replace("/admin");
      } else if (needsOnboardingSetup(user)) {
        router.replace("/choose_type");
      } else {
        router.replace(redirectAfterLogin ?? "/");
      }
    }
  }, [user, loading, isLoggingOut, router, requireAuth, requireProfileCompleted, redirectTo, redirectAfterLogin]);

  return { user, loading };
}