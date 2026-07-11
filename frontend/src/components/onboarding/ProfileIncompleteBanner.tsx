"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { profileCompletionPath, isProfileDetailsIncomplete } from "@/lib/onboardingSteps";
import type { ProfileForCompletion } from "@/lib/onboardingSteps";

interface Props {
  profile: ProfileForCompletion | null;
}

export default function ProfileIncompleteBanner({ profile }: Props) {
  const { t } = useTranslation();

  if (!profile || !isProfileDetailsIncomplete(profile)) return null;

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1.5 px-4 py-2.5 text-sm">
        <span className="text-gray-900">{t("onboarding.profileIncompleteBanner")}</span>
        <Link
          href={profileCompletionPath(profile.account_type)}
          className="font-semibold whitespace-nowrap text-gray-900 underline underline-offset-2 hover:text-red-600"
        >
          {t("onboarding.completeProfileLink")}
        </Link>
      </div>
    </div>
  );
}
