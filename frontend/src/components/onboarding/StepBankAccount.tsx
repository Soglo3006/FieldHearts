"use client";

import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import StripePayoutSetup from "@/components/stripe/StripePayoutSetup";
import type { ProfileForCompletion } from "@/lib/onboardingSteps";

interface Props {
  accessToken: string;
  accountType?: string;
  autoReconnect?: boolean;
  onGoToProfileStep?: (step: number) => void;
  profileSnapshot?: ProfileForCompletion | null;
}

export default function StepBankAccount({
  accessToken,
  onGoToProfileStep,
  profileSnapshot = null,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="h-6 w-6 text-green-700 shrink-0" />
        <h2 className="text-xl font-bold text-gray-900">{t("onboarding.bankAccount")}</h2>
      </div>
      <p className="text-gray-500 text-sm mb-4">{t("onboarding.bankAccountSubtitle")}</p>
      <StripePayoutSetup
        accessToken={accessToken}
        variant="inline"
        subtitle={t("onboarding.bankReceiveDesc")}
        onGoToProfileStep={onGoToProfileStep}
        profileSnapshot={profileSnapshot}
      />
    </Card>
  );
}
