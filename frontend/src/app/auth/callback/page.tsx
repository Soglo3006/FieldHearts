"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { canAccessAdminPortal, safeInternalPath } from "@/lib/auth";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { clearAdminStepUpToken } from "@/lib/adminStepUp";
import { requestWelcomeEmail } from "@/lib/requestWelcomeEmail";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Authenticating...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // PKCE flow: Supabase sends ?code=xxx in the URL
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage("Verification failed. Redirecting to login...");
            setTimeout(() => router.replace("/login"), 1500);
            return;
          }
          clearAdminStepUpToken();
        }

        // Get session after potential code exchange
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setMessage("Authentication failed. Redirecting to login...");
          setTimeout(() => router.replace("/login"), 1500);
          return;
        }

        if (session) {
          clearAdminStepUpToken();
          requestWelcomeEmail(session.access_token);
          if (canAccessAdminPortal(session.user)) {
            router.replace("/admin");
          } else {
            if (needsOnboardingSetup(session.user)) {
              router.replace("/choose_type");
            } else {
              const next = new URLSearchParams(window.location.search).get("next");
              router.replace(safeInternalPath(next, "/"));
            }
          }
        } else {
          // Implicit/hash flow fallback — listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
              subscription.unsubscribe();
              clearAdminStepUpToken();
              requestWelcomeEmail(session.access_token);
              if (canAccessAdminPortal(session.user)) {
                router.replace("/admin");
              } else {
                if (needsOnboardingSetup(session.user)) {
                  router.replace("/choose_type");
                } else {
                  const next = new URLSearchParams(window.location.search).get("next");
                  router.replace(safeInternalPath(next, "/"));
                }
              }
            }
          });
          setTimeout(() => {
            subscription.unsubscribe();
            setMessage("No session found. Redirecting to login...");
            setTimeout(() => router.push("/login"), 1500);
          }, 5000);
        }
      } catch (err) {
        setMessage("Something went wrong. Redirecting to login...");
        setTimeout(() => router.replace("/login"), 1500);
      }
    };

    handleCallback();
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