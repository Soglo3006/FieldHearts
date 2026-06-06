"use client";

import { useTranslation } from "react-i18next";
import { AuthTransitionOverlay } from "@/components/auth/AuthTransitionOverlay";

export function AuthRedirectOverlay() {
  const { t } = useTranslation();
  return <AuthTransitionOverlay message={t("login.loading")} />;
}
