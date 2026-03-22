"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isAdminUser } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";

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
            setTimeout(() => router.push("/login"), 2000);
            return;
          }
        }

        // Get session after potential code exchange
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setMessage("Authentication failed. Redirecting to login...");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        if (session) {
          if (isAdminUser(session.user)) {
            setMessage("Welcome, Admin!");
            setTimeout(() => router.push("/admin"), 1500);
          } else {
            const profileCompleted = session.user.user_metadata?.profile_completed;
            if (!profileCompleted) {
              setMessage("Email verified! Let's complete your profile...");
              setTimeout(() => router.push("/choose_type"), 1500);
            } else {
              setMessage("Welcome back!");
              setTimeout(() => router.push("/"), 1500);
            }
          }
        } else {
          // Implicit/hash flow fallback — listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
              subscription.unsubscribe();
              if (isAdminUser(session.user)) {
                router.push("/admin");
              } else {
                const profileCompleted = session.user.user_metadata?.profile_completed;
                router.push(profileCompleted ? "/" : "/choose_type");
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
        setTimeout(() => router.push("/login"), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="xl" className="mx-auto mb-4" />
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}