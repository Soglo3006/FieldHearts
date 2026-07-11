"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StripeConnectOnboarding from "@/components/stripe/StripeConnectOnboarding";
import { WalletBankAccountSkeleton } from "@/components/wallet/WalletSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  isPayoutProfileComplete,
  profileCompletionPath,
  type ProfileForCompletion,
} from "@/lib/onboardingSteps";

export interface ConnectStatus {
  connected: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
  profile_ready?: boolean;
  missing_fields?: string[];
  bank_account?: {
    bank_name?: string | null;
    last4?: string | null;
    currency?: string | null;
    routing_number?: string | null;
    country?: string | null;
  } | null;
}

interface StripePayoutSetupProps {
  accessToken: string;
  variant?: "card" | "inline";
  title?: string;
  subtitle?: string;
  initialStatus?: ConnectStatus | null;
  onStatusChange?: (status: ConnectStatus) => void;
  onGoToProfileStep?: (step: number) => void;
  profileSnapshot?: ProfileForCompletion | null;
}

export default function StripePayoutSetup({
  accessToken,
  variant = "card",
  title,
  subtitle,
  initialStatus = null,
  onStatusChange,
  onGoToProfileStep,
  profileSnapshot = null,
}: StripePayoutSetupProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useMyProfile();
  const [status, setStatus] = useState<ConnectStatus | null>(initialStatus);
  const [loading, setLoading] = useState(!initialStatus);
  const [showForm, setShowForm] = useState(false);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const snapshotReady = isPayoutProfileComplete(profileSnapshot);
  const profileReady =
    snapshotReady ||
    status?.profile_ready === true ||
    isPayoutProfileComplete(profile);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<ConnectStatus>;
  }, [accessToken]);

  const applyStatus = useCallback((data: ConnectStatus) => {
    setStatus(data);
    onStatusChangeRef.current?.(data);
  }, []);

  const refreshStatus = useCallback(async () => {
    const data = await fetchStatus();
    if (data) applyStatus(data);
    return data;
  }, [fetchStatus, applyStatus]);

  // Parent may hydrate cached status after first paint
  useEffect(() => {
    if (!initialStatus) return;
    setStatus((prev) => prev ?? initialStatus);
    setLoading(false);
  }, [initialStatus]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!initialStatus) setLoading(true);
      const data = await fetchStatus();
      if (cancelled) return;
      if (data) applyStatus(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, fetchStatus, applyStatus]);

  useEffect(() => {
    if (snapshotReady) {
      refreshStatus();
    }
  }, [snapshotReady, refreshStatus]);

  const handleStripeExit = async () => {
    setShowForm(false);
    await refreshStatus();
  };

  const openOnboarding = () => {
    if (!profileReady) {
      handleGoToProfile();
      return;
    }
    setShowForm(true);
  };

  const handleGoToProfile = () => {
    if (onGoToProfileStep) {
      onGoToProfileStep(1);
      return;
    }
    const accountType =
      profile?.account_type ?? user?.user_metadata?.account_type;
    router.push(profileCompletionPath(accountType, 1));
  };

  const profileGate = !profileReady ? (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div>
        <p className="font-semibold text-gray-900 mb-1">{t("payoutSetup.profileRequiredTitle")}</p>
        <p className="text-sm text-gray-500 max-w-md">{t("payoutSetup.profileRequiredDesc")}</p>
      </div>
      <Button
        type="button"
        onClick={handleGoToProfile}
        className="bg-green-700 hover:bg-green-800 text-white min-w-[220px] h-11 rounded-xl text-sm cursor-pointer"
      >
        {t("payoutSetup.completeProfileFirst")}
      </Button>
    </div>
  ) : null;

  if (loading && !status) {
    return <WalletBankAccountSkeleton variant={variant} />;
  }

  const heading = title ?? t("payoutSetup.title");
  const desc = subtitle ?? t("payoutSetup.subtitle");

  // Connected: bank details + add/edit shown directly by Stripe (loading handled inside)
  const content = status?.charges_enabled ? (
    <StripeConnectOnboarding
      accessToken={accessToken}
      mode="management"
      onComplete={handleStripeExit}
    />
  ) : status?.details_submitted ? (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <Clock className="h-12 w-12 text-amber-400" />
        <p className="font-semibold text-gray-900">{t("payoutSetup.verifyingTitle")}</p>
        <p className="text-sm text-gray-500 max-w-md">{t("payoutSetup.verifyingDesc")}</p>
      </div>
      {!profileReady ? (
        profileGate
      ) : showForm ? (
        <StripeConnectOnboarding
          accessToken={accessToken}
          onComplete={handleStripeExit}
        />
      ) : (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={openOnboarding}
            className="bg-green-700 hover:bg-green-800 text-white cursor-pointer"
          >
            {t("payoutSetup.completeVerification")}
          </Button>
        </div>
      )}
    </div>
  ) : showForm && profileReady ? (
    <StripeConnectOnboarding
      accessToken={accessToken}
      onComplete={handleStripeExit}
    />
  ) : (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      {!profileReady ? (
        profileGate
      ) : (
        <>
          <div>
            <p className="font-semibold text-gray-900 mb-1">{t("payoutSetup.startTitle")}</p>
            <p className="text-sm text-gray-500 max-w-md">{desc}</p>
            <p className="text-xs text-gray-400 mt-2 max-w-md">{t("payoutSetup.prefilledHint")}</p>
          </div>
          <Button
            type="button"
            onClick={openOnboarding}
            className="bg-green-700 hover:bg-green-800 text-white min-w-[220px] h-11 rounded-xl text-sm cursor-pointer"
          >
            {t("payoutSetup.startButton")}
          </Button>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-gray-300" />
            {t("payoutSetup.secured")}
          </p>
        </>
      )}
    </div>
  );

  if (variant === "inline") {
    return <div>{content}</div>;
  }

  return (
    <Card className="gap-0 border-green-100 py-0 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900">{heading}</h3>
          {desc && !showForm && (
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          )}
        </div>
        {content}
      </CardContent>
    </Card>
  );
}
