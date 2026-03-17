"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/auth";

interface UseProtectedRouteOptions {
  requireAuth?: boolean;
  requireProfileCompleted?: boolean;
  redirectTo?: string;
}

export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const {
    requireAuth = true,
    requireProfileCompleted = false,
    redirectTo = "/login",
  } = options;

  const { user, loading, isLoggingOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || isLoggingOut) return;

    if (requireAuth && !user) {
      router.push(redirectTo);
      return;
    }

    if (requireProfileCompleted && user) {
      const profileCompleted = user.user_metadata?.profile_completed;
      if (!profileCompleted) {
        router.push("/choose_type");
        return;
      }
    }

    if (!requireAuth && user) {
      if (isAdminUser(user)) {
        router.push("/admin");
      } else {
        const profileCompleted = user.user_metadata?.profile_completed;
        router.push(profileCompleted ? "/" : "/choose_type");
      }
    }
  }, [user, loading, isLoggingOut, router, requireAuth, requireProfileCompleted, redirectTo]);

  return { user, loading };
}