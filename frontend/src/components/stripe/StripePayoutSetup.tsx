"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/Spinner";
import StripeConnectOnboarding from "@/components/stripe/StripeConnectOnboarding";
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
}

interface StripePayoutSetupProps {
  accessToken: string;
  variant?: "card" | "inline";
  title?: string;
  subtitle?: string;
  onStatusChange?: (status: ConnectStatus) => void;
  onGoToProfileStep?: (step: number) => void;
  profileSnapshot?: ProfileForCompletion | null;
}

export default function StripePayoutSetup({
  accessToken,
  variant = "card",
  title,
  subtitle,
  onStatusChange,
  onGoToProfileStep,
  profileSnapshot = null,
}: StripePayoutSetupProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useMyProfile();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showManagement, setShowManagement] = useState(false);

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

  const refreshStatus = useCallback(async () => {
    const data = await fetchStatus();
    if (data) {
      setStatus(data);
      onStatusChange?.(data);
    }
    return data;
  }, [fetchStatus, onStatusChange]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    refreshStatus().finally(() => setLoading(false));
  }, [accessToken, refreshStatus]);

  useEffect(() => {
    if (snapshotReady) {
      refreshStatus();
    }
  }, [snapshotReady, refreshStatus]);

  const handleStripeExit = async () => {
    setShowForm(false);
    setShowManagement(false);
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

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  const heading = title ?? t("payoutSetup.title");
  const desc = subtitle ?? t("payoutSetup.subtitle");

  const content = status?.charges_enabled ? (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="font-semibold text-gray-900">{t("payoutSetup.connectedTitle")}</p>
        <p className="text-sm text-gray-500 max-w-md">{t("payoutSetup.connectedDesc")}</p>
      </div>
      {showManagement ? (
        <StripeConnectOnboarding
          accessToken={accessToken}
          mode="management"
          onComplete={handleStripeExit}
        />
      ) : (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowManagement(true)}
            className="cursor-pointer"
          >
            {t("payoutSetup.manageBank")}
          </Button>
        </div>
      )}
    </div>
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
        <StripeConnectOnboarding accessToken={accessToken} onComplete={handleStripeExit} />
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
    <StripeConnectOnboarding accessToken={accessToken} onComplete={handleStripeExit} />
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

  const body = content;

  if (variant === "inline") {
    return <div>{body}</div>;
  }

  return (
    <Card className="shadow-sm border-green-100">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-green-700 shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900">{heading}</h3>
            {!status?.charges_enabled && !showForm && !showManagement && (
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            )}
          </div>
        </div>
        {body}
      </CardContent>
    </Card>
  );
}
