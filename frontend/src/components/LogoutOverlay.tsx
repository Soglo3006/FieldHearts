"use client";

import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AuthTransitionOverlay } from "@/components/auth/AuthTransitionOverlay";

export default function LogoutOverlay() {
  const { t } = useTranslation();
  const { isLoggingOut } = useAuth();

  if (!isLoggingOut) return null;

  return <AuthTransitionOverlay message={t("settings.loggingOut")} />;
}
