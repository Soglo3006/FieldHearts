"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isAdminUser, isSupportOnlyUser, canAccessAdminPortal, safeInternalPath } from "@/lib/auth";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { clearMyProfileCache } from "@/lib/myProfileCache";
import { fetchMyProfileOnce } from "@/lib/fetchMyProfile";
import { clearAdminStepUpToken } from "@/lib/adminStepUp";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoggingOut: boolean;
  profilesById: Record<string, unknown>;
  setProfileInCache: (id: string, profile: unknown) => void;
  signInWithEmail: (
    email: string,
    password: string,
    options?: { redirectTo?: string; stayOnPage?: boolean }
  ) => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signInWithGoogle: (options?: { redirectTo?: string }) => Promise<void>;
  signInWithFacebook: (options?: { redirectTo?: string }) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profilesById, setProfilesById] = useState<Record<string, unknown>>({});
  const intentionalSignOut = useRef(false);

  const setProfileInCache = (id: string, profile: unknown) => {
    setProfilesById((prev) => ({ ...prev, [id]: profile }));
  };

  const router = useRouter();
  const pathname = usePathname();

  // Reset isLoggingOut only when navigation to "/" has actually completed
  useEffect(() => {
    if (isLoggingOut && !user && pathname === "/") {
      const t = setTimeout(() => setIsLoggingOut(false), 300);
      return () => clearTimeout(t);
    }
  }, [pathname, isLoggingOut, user]);

  // Support-only accounts must stay within /admin/*
  // If they navigate to any other page, send them back to /admin
  useEffect(() => {
    if (!user || loading) return;
    if (!isSupportOnlyUser(user)) return;
    const AUTH_PATHS = ["/login", "/auth/"];
    const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
    if (!pathname.startsWith("/admin") && !isAuthPath) {
      router.replace("/admin");
    }
  }, [user, pathname, loading]);

  // Prefetch profile as soon as session is ready (deduped with useMyProfile)
  useEffect(() => {
    if (!user?.id || !session?.access_token || needsOnboardingSetup(user)) return;
    void fetchMyProfileOnce(user.id, session.access_token);
  }, [user?.id, session?.access_token, user]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const now = Math.floor(Date.now() / 1000);
        const isExpired = session.expires_at !== undefined && session.expires_at < now;
        if (isExpired) {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            intentionalSignOut.current = true;
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            router.replace("/login");
            return;
          }
          setSession(data.session);
          setUser(data.session.user ?? null);
          setLoading(false);
          setIsLoggingOut(false);
          return;
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setIsLoggingOut(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !intentionalSignOut.current) {
        setSession(null);
        setUser(null);
        setLoading(false);
        router.replace("/login");
        return;
      }
      intentionalSignOut.current = false;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (event !== "SIGNED_OUT") {
        setIsLoggingOut(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const authCallbackHref = (redirectTo?: string) => {
    const origin = window.location.origin;
    if (!redirectTo) return `${origin}/auth/callback`;
    const next = safeInternalPath(redirectTo, "");
    if (!next) return `${origin}/auth/callback`;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  };

  const signInWithEmail = async (
    email: string,
    password: string,
    options?: { redirectTo?: string; stayOnPage?: boolean }
  ) => {
    clearAdminStepUpToken();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user ?? null);
      setLoading(false);
      setIsLoggingOut(false);
    }

    if (canAccessAdminPortal(data.user)) {
      router.push("/admin");
      return;
    }
    if (needsOnboardingSetup(data.user)) {
      router.push("/choose_type");
      return;
    }
    if (!data.user.user_metadata?.profile_completed) {
      const accountType = data.user.user_metadata?.account_type || "person";
      router.push(`/profile/complete_profil?type=${accountType}`);
      return;
    }

    if (!options?.stayOnPage) {
      const dest = safeInternalPath(options?.redirectTo ?? "", "/");
      router.push(dest);
    }
  };

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string) => {
    clearAdminStepUpToken();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: `${trimmedFirst} ${trimmedLast}`.trim(),
          profile_completed: false,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      },
    });

    if (error) throw new Error(error.message);
  };

  const signInWithGoogle = async (oauthOpts?: { redirectTo?: string }) => {
    clearAdminStepUpToken();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackHref(oauthOpts?.redirectTo),
      },
    });

    if (error) throw new Error(error.message);
  };

  const signInWithFacebook = async (oauthOpts?: { redirectTo?: string }) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: authCallbackHref(oauthOpts?.redirectTo),
      },
    });

    if (error) throw new Error(error.message);
  };

  const signInWithApple = async () => {
    clearAdminStepUpToken();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    setIsLoggingOut(true);
    intentionalSignOut.current = true;
    clearAdminStepUpToken();
    clearMyProfileCache(user?.id);
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isLoggingOut,
        profilesById,
        setProfileInCache,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithFacebook,
        signInWithApple,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}