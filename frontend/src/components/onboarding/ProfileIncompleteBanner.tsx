"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { profileCompletionPath, isProfileDetailsIncomplete } from "@/lib/onboardingSteps";
import type { ProfileForCompletion } from "@/lib/onboardingSteps";

interface Props {
  profile: ProfileForCompletion | null;
}

export default function ProfileIncompleteBanner({ profile }: Props) {
  const { t } = useTranslation();

  if (!profile || !isProfileDetailsIncomplete(profile)) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-amber-900">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{t("onboarding.profileIncompleteBanner")}</span>
        <Link
          href={profileCompletionPath(profile.account_type)}
          className="font-semibold underline underline-offset-2 hover:text-amber-950 whitespace-nowrap"
        >
          {t("onboarding.completeProfileLink")}
        </Link>
      </div>
    </div>
  );
}
