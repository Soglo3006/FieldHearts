"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { Spinner } from "@/components/ui/Spinner";
import { getFreshAccessToken } from "@/lib/stripeConnect";
import {
  STRIPE_BANK_MANAGEMENT_COLLECTION_OPTIONS,
  STRIPE_ONBOARDING_COLLECTION_OPTIONS,
} from "@/lib/stripeConnectCollectionOptions";

type ConnectMode = "onboarding" | "management";

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

export default function StripeConnectOnboarding({
  accessToken,
  mode = "onboarding",
  onComplete,
  onExit,
  className,
}: {
  accessToken: string;
  mode?: ConnectMode;
  onComplete?: () => void;
  onExit?: () => void;
  className?: string;
}) {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const token = await getFreshAccessToken(accessToken);
    if (!token) throw new Error("auth");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode }),
    });

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
  }, [accessToken, mode]);

  const connectInstance = useMemo<StripeConnectInstance | null>(() => {
    if (!publishableKey) return null;
    return loadConnectAndInitialize({
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
  }, [publishableKey, fetchClientSecret]);

  useEffect(() => {
    let cancelled = false;
    fetchPublishableKey()
      .then((key) => {
        if (cancelled) return;
        if (!key) {
          setError("config");
          return;
        }
        setPublishableKey(key);
      })
      .catch(() => {
        if (!cancelled) setError("config");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    const message =
      error === "profile_incomplete"
        ? "Complétez votre profil (nom, téléphone et adresse) avant de continuer."
        : "Configuration de paiement indisponible. Réessayez plus tard.";
    return (
      <div className={className}>
        <p className="text-sm text-red-600 text-center py-4">{message}</p>
      </div>
    );
  }

  if (!connectInstance) {
    return (
      <div className={`flex justify-center py-8 ${className ?? ""}`}>
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className={className}>
      <ConnectComponentsProvider connectInstance={connectInstance}>
        {mode === "management" ? (
          <ConnectAccountManagement
            collectionOptions={STRIPE_BANK_MANAGEMENT_COLLECTION_OPTIONS}
            onExit={() => {
              void onComplete?.();
            }}
          />
        ) : (
          <ConnectAccountOnboarding
            collectionOptions={STRIPE_ONBOARDING_COLLECTION_OPTIONS}
            onExit={() => {
              void onComplete?.();
            }}
          />
        )}
      </ConnectComponentsProvider>
    </div>
  );
}
