"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AuthTransitionOverlay } from "@/components/auth/AuthTransitionOverlay";

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/choose_type",
  "/profile/complete_profil",
  "/auth/callback",
  "/auth/verify-email",
  "/forgot-password",
  "/auth/reset-password",
  "/admin",
];

export function AuthBootstrapOverlay() {
  const { loading, isLoggingOut } = useAuth();
  const pathname = usePathname();
  const { t } = useTranslation();
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isLoggingOut || !loading || isAuthPage) return null;

  return <AuthTransitionOverlay message={t("common.loading")} />;
}
