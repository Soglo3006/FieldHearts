"use client";

import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import StripePayoutSetup, { type ConnectStatus } from "@/components/stripe/StripePayoutSetup";
import type { ProfileForCompletion } from "@/lib/onboardingSteps";

interface Props {
  accessToken: string;
  accountType?: string;
  autoReconnect?: boolean;
  onGoToProfileStep?: (step: number) => void;
  profileSnapshot?: ProfileForCompletion | null;
  initialStatus?: ConnectStatus | null;
  onPayoutStatusChange?: (status: ConnectStatus) => void;
}

export default function StepBankAccount({
  accessToken,
  onGoToProfileStep,
  profileSnapshot = null,
  initialStatus = null,
  onPayoutStatusChange,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">{t("onboarding.bankAccount")}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{t("onboarding.bankAccountSubtitle")}</p>
      </div>
      <StripePayoutSetup
        accessToken={accessToken}
        variant="inline"
        initialStatus={initialStatus}
        onGoToProfileStep={onGoToProfileStep}
        profileSnapshot={profileSnapshot}
        onStatusChange={onPayoutStatusChange}
      />
    </Card>
  );
}
