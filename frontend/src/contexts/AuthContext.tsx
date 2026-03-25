"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isAdminUser } from "@/lib/auth";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoggingOut: boolean;
  profilesById: Record<string, unknown>;
  setProfileInCache: (id: string, profile: unknown) => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const now = Math.floor(Date.now() / 1000);
        const isExpired = session.expires_at !== undefined && session.expires_at < now;
        if (isExpired) {
          const { data } = await supabase.auth.refreshSession();
          setSession(data.session);
          setUser(data.session?.user ?? null);
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
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Don't reset isLoggingOut on SIGNED_OUT — let signOut() handle it via timeout
      if (event !== "SIGNED_OUT") {
        setIsLoggingOut(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (isAdminUser(data.user)) {
      router.push("/admin");
    } else {
      const profileCompleted = data.user.user_metadata?.profile_completed;
      router.push(profileCompleted ? "/" : "/choose_type");
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          profile_completed: false,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      },
    });

    if (error) throw new Error(error.message);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw new Error(error.message);
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw new Error(error.message);
  };

  const signInWithApple = async () => {
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