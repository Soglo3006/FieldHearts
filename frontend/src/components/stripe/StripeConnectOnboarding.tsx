"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js/pure";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { Skeleton } from "@/components/ui/skeleton";
import { getFreshAccessToken } from "@/lib/stripeConnect";
import {
  STRIPE_BANK_MANAGEMENT_COLLECTION_OPTIONS,
  STRIPE_ONBOARDING_COLLECTION_OPTIONS,
} from "@/lib/stripeConnectCollectionOptions";

type ConnectMode = "onboarding" | "management";

export function StripeConnectFormSkeleton({
  variant = "form",
}: {
  variant?: "form" | "bank";
}) {
  if (variant === "bank") {
    return (
      <div className="space-y-3 py-1" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-3.5 w-28" />
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-16 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3 py-1" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

async function fetchPublishableKey(): Promise<string | null> {
  const fromEnv = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (fromEnv) return fromEnv;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/config`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.publishable_key ?? null;
  } catch {
    return null;
  }
}

async function postConnectSession(
  token: string,
  mode: ConnectMode,
): Promise<Response> {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode }),
  });
}

/** Always create a fresh AccountSession — secrets are single-use (claim once). */
async function fetchConnectSession(
  accessToken: string,
  mode: ConnectMode,
): Promise<string> {
  // Prefer the token we already have — avoid a full Supabase refresh on every load
  let token = accessToken;
  if (!token) {
    token = (await getFreshAccessToken()) ?? "";
  }
  if (!token) throw new Error("auth");

  let res = await postConnectSession(token, mode);
  if (res.status === 401) {
    const fresh = await getFreshAccessToken(token);
    if (!fresh) throw new Error("auth");
    res = await postConnectSession(fresh, mode);
  }

  if (!res.ok) {
    if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      if (data.code === "PROFILE_INCOMPLETE") {
        throw new Error("profile_incomplete");
      }
    }
    throw new Error("session");
  }
  const data = await res.json();
  if (!data.client_secret) throw new Error("secret");
  return data.client_secret as string;
}

export default function StripeConnectOnboarding({
  accessToken,
  mode = "onboarding",
  onComplete,
  onReady,
  className,
}: {
  accessToken: string;
  mode?: ConnectMode;
  onComplete?: () => void;
  onReady?: () => void;
  className?: string;
}) {
  const [publishableKey, setPublishableKey] = useState<string | null>(
    () => process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [coverWithSkeleton, setCoverWithSkeleton] = useState(true);
  const [instanceEpoch, setInstanceEpoch] = useState(1);
  const stripeHostRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const readyNotifiedRef = useRef(false);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const authKeyRef = useRef({ accessToken, mode });

  const skeletonVariant = mode === "management" ? "bank" : "form";

  const revealContent = useCallback(() => {
    setCoverWithSkeleton(false);
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    onReadyRef.current?.();
  }, []);

  useEffect(() => {
    if (publishableKey) return;
    let cancelled = false;
    (async () => {
      try {
        const key = await fetchPublishableKey();
        if (cancelled) return;
        if (!key) {
          setError("config");
          return;
        }
        setPublishableKey(key);
      } catch {
        if (!cancelled) setError("config");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publishableKey]);

  // Remount Connect only when auth/mode actually changes (not on first mount)
  useEffect(() => {
    const prev = authKeyRef.current;
    if (prev.accessToken === accessToken && prev.mode === mode) return;
    authKeyRef.current = { accessToken, mode };
    setCoverWithSkeleton(true);
    readyNotifiedRef.current = false;
    setInstanceEpoch((n) => n + 1);
  }, [accessToken, mode]);

  const fetchClientSecret = useCallback(async () => {
    try {
      return await fetchConnectSession(accessTokenRef.current, modeRef.current);
    } catch (err) {
      const message = err instanceof Error ? err.message : "session";
      setError(
        message === "profile_incomplete"
          ? "profile_incomplete"
          : message === "config"
            ? "config"
            : "session",
      );
      throw err;
    }
  }, []);

  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    if (!publishableKey) {
      setConnectInstance(null);
      return;
    }

    const instance = loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret,
      appearance: {
        overlays: "dialog",
        variables: {
          colorPrimary: "#15803d",
          colorBackground: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          borderRadius: "12px",
          overlayBackdropColor: "rgba(0,0,0,0.35)",
        },
      },
      locale: "fr-CA",
    });
    setConnectInstance(instance);
  }, [publishableKey, fetchClientSecret, instanceEpoch]);

  useEffect(() => {
    if (!connectInstance || !coverWithSkeleton) return;
    const host = stripeHostRef.current;
    if (!host) return;

    const countInteractive = (root: Element | ShadowRoot): number => {
      let count = root.querySelectorAll(
        'button, [role="button"], a, input, select, textarea',
      ).length;
      root.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) count += countInteractive(el.shadowRoot);
      });
      return count;
    };

    const isReady = () => {
      if (countInteractive(host) >= 1) return true;
      const text = (host.innerText || "").replace(/\s+/g, " ").trim();
      if (text.length >= 12) return true;
      if (host.querySelector("iframe")) return true;
      if (host.getBoundingClientRect().height >= 72 && host.childElementCount > 0) {
        return true;
      }
      return false;
    };

    const checkReady = () => {
      if (isReady()) revealContent();
    };

    checkReady();
    const resizeObserver = new ResizeObserver(checkReady);
    resizeObserver.observe(host);
    const mutationObserver = new MutationObserver(checkReady);
    mutationObserver.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    const poll = window.setInterval(checkReady, 100);
    // Don't hold the overlay for long — Stripe's own UI is better than a 15s blank wait
    const fallback = window.setTimeout(revealContent, 2500);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(fallback);
    };
  }, [connectInstance, coverWithSkeleton, revealContent]);

  if (error) {
    const message =
      error === "profile_incomplete"
        ? "Complétez votre profil (nom, téléphone et adresse) avant de continuer."
        : "Configuration de paiement indisponible. Réessayez plus tard.";
    return (
      <div className={className}>
        <p className="py-4 text-center text-sm text-red-600">{message}</p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-[160px] ${className ?? ""}`}>
      {coverWithSkeleton && (
        <div
          className={
            connectInstance ? "absolute inset-0 z-10 bg-white" : undefined
          }
        >
          <StripeConnectFormSkeleton variant={skeletonVariant} />
        </div>
      )}

      {connectInstance && (
        <div ref={stripeHostRef} key={instanceEpoch}>
          <ConnectComponentsProvider connectInstance={connectInstance}>
            {mode === "management" ? (
              <ConnectAccountManagement
                collectionOptions={STRIPE_BANK_MANAGEMENT_COLLECTION_OPTIONS}
                onLoadError={revealContent}
              />
            ) : (
              <ConnectAccountOnboarding
                collectionOptions={STRIPE_ONBOARDING_COLLECTION_OPTIONS}
                onLoadError={revealContent}
                onExit={() => {
                  void onComplete?.();
                }}
              />
            )}
          </ConnectComponentsProvider>
        </div>
      )}
    </div>
  );
}
