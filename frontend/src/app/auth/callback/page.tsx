"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { canAccessAdminPortal, safeInternalPath } from "@/lib/auth";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { clearAdminStepUpToken } from "@/lib/adminStepUp";
import { requestWelcomeEmail } from "@/lib/requestWelcomeEmail";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const goToLogin = (key: string) => {
      setMessage(t(key));
      setTimeout(() => router.replace("/login"), 1500);
    };

    const routeAfterSession = (session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>) => {
      clearAdminStepUpToken();
      requestWelcomeEmail(session.access_token);
      if (canAccessAdminPortal(session.user)) {
        router.replace("/admin");
      } else if (needsOnboardingSetup(session.user)) {
        router.replace("/choose_type");
      } else {
        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(safeInternalPath(next, "/"));
      }
    };

    const handleCallback = async () => {
      try {
        // PKCE flow: Supabase sends ?code=xxx in the URL. If exchange fails (e.g. the code was
        // already consumed by an email client's link-prefetch/security scan), don't give up
        // immediately — a session may already exist from that earlier exchange.
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) clearAdminStepUpToken();
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (session) {
          routeAfterSession(session);
          return;
        }

        if (error) {
          goToLogin("authCallback.authFailed");
          return;
        }

        // Implicit/hash flow fallback — listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, changedSession) => {
          if (event === "SIGNED_IN" && changedSession) {
            subscription.unsubscribe();
            routeAfterSession(changedSession);
          }
        });
        setTimeout(() => {
          subscription.unsubscribe();
          goToLogin("authCallback.noSession");
        }, 5000);
      } catch {
        goToLogin("authCallback.genericError");
      }
    };

    setMessage(t("authCallback.verifying"));
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once; t() is stable enough for this one-shot redirect
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="text-center space-y-4 w-full max-w-sm">
        <Skeleton className="mx-auto h-12 w-12 rounded-full animate-pulse" />
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}
