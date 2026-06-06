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
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";
import { AuthRedirectOverlay } from "@/components/auth/AuthRedirectOverlay";
import {
  normalizeRedirectPath,
  pathnameMatchesRedirect,
  type AuthGateOptions,
} from "@/lib/loginRedirectContext";
import { clearAuthResume, setAuthResume } from "@/lib/authGateResume";

type AuthGateContextValue = {
  requireAuth: (options?: AuthGateOptions) => boolean;
  openLogin: (options?: AuthGateOptions) => void;
  closeLogin: () => void;
  notifyAuthActionReady: () => void;
};

const AuthGateContext = createContext<AuthGateContextValue | undefined>(undefined);

const NAVIGATION_CLOSE_MS = 150;
const AUTH_OVERLAY_SAFETY_MS = 4_000;

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AuthGateOptions | null>(null);
  const [completingAuth, setCompletingAuth] = useState(false);
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);
  const completingStartedRef = useRef(false);
  const authActionReadyRef = useRef(false);

  const closeLogin = useCallback(() => {
    setOpen(false);
    setOptions(null);
    setCompletingAuth(false);
    completingStartedRef.current = false;
    authActionReadyRef.current = false;
    onSuccessRef.current = undefined;
  }, []);

  const notifyAuthActionReady = useCallback(() => {
    authActionReadyRef.current = true;
  }, []);

  const openLogin = useCallback((next?: AuthGateOptions) => {
    authActionReadyRef.current = false;
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
    if (!open) {
      completingStartedRef.current = false;
      return;
    }
    if (!user || completingStartedRef.current) return;

    completingStartedRef.current = true;
    setCompletingAuth(true);

    const onSuccess = onSuccessRef.current;
    clearAuthResume();
    queueMicrotask(() => {
      onSuccess?.();
    });
  }, [user, open]);

  useEffect(() => {
    if (!completingAuth || !open) return;

    const tryClose = () => {
      if (authActionReadyRef.current) {
        closeLogin();
        return true;
      }
      return false;
    };

    if (tryClose()) return;

    const redirectPath = normalizeRedirectPath(options?.redirect);
    if (redirectPath && pathnameMatchesRedirect(pathname, redirectPath)) {
      const timer = window.setTimeout(closeLogin, NAVIGATION_CLOSE_MS);
      return () => window.clearTimeout(timer);
    }

    const interval = window.setInterval(tryClose, 50);
    const safety = window.setTimeout(closeLogin, AUTH_OVERLAY_SAFETY_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(safety);
    };
  }, [completingAuth, open, pathname, options?.redirect, closeLogin]);

  const handleCloseLogin = useCallback(() => {
    if (completingAuth) return;
    closeLogin();
  }, [completingAuth, closeLogin]);

  return (
    <AuthGateContext.Provider
      value={{ requireAuth, openLogin, closeLogin, notifyAuthActionReady }}
    >
      {children}
      {completingAuth && <AuthRedirectOverlay />}
      <LoginRequiredModal
        open={open && !completingAuth}
        onClose={handleCloseLogin}
        options={options}
      />
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
