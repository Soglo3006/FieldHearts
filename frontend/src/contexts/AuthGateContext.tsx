"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";
import type { AuthGateOptions } from "@/lib/loginRedirectContext";
import { clearAuthResume, setAuthResume } from "@/lib/authGateResume";

type AuthGateContextValue = {
  requireAuth: (options?: AuthGateOptions) => boolean;
  openLogin: (options?: AuthGateOptions) => void;
  closeLogin: () => void;
};

const AuthGateContext = createContext<AuthGateContextValue | undefined>(undefined);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AuthGateOptions | null>(null);
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);

  const closeLogin = useCallback(() => {
    setOpen(false);
    setOptions(null);
    onSuccessRef.current = undefined;
  }, []);

  const openLogin = useCallback((next?: AuthGateOptions) => {
    onSuccessRef.current = next?.onSuccess;
    if (next?.resume) {
      setAuthResume(next.resume);
    }
    setOptions(next ?? {});
    setOpen(true);
  }, []);

  const requireAuth = useCallback(
    (next?: AuthGateOptions) => {
      if (loading) return false;
      if (user) return true;
      openLogin(next);
      return false;
    },
    [loading, user, openLogin],
  );

  useEffect(() => {
    if (!user || !open) return;
    const onSuccess = onSuccessRef.current;
    closeLogin();
    if (onSuccess) {
      clearAuthResume();
      window.setTimeout(() => onSuccess(), 0);
    }
  }, [user, open, closeLogin]);

  return (
    <AuthGateContext.Provider value={{ requireAuth, openLogin, closeLogin }}>
      {children}
      <LoginRequiredModal open={open} onClose={closeLogin} options={options} />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    throw new Error("useAuthGate must be used within an AuthGateProvider");
  }
  return ctx;
}
