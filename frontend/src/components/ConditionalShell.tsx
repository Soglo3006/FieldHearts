"use client";

import "@/lib/i18n";
import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import i18n from "@/lib/i18n";
import Header from "@/components/home/Header";
import CategoryNav from "@/components/home/Category";
import Footer from "@/components/home/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { getLanguageCode } from "@/lib/locale";
import { isSupportOnlyUser } from "@/lib/auth";
import SiteChrome from "@/components/onboarding/SiteChrome";

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

const NO_CATEGORY_ROUTES = [
  "/privacy-policy",
  "/terms",
  "/payment-terms",
  "/trust-safety",
  "/about",
  "/contact",
  "/help",
];

const NO_FOOTER_ROUTES = [
  "/messages",
];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, isLoggingOut } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    const browserLng = getLanguageCode(navigator.language);
    const lng = saved ?? browserLng;
    if (lng !== i18n.language) i18n.changeLanguage(lng);
  }, []);

  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isNoCategoryPage = NO_CATEGORY_ROUTES.some((r) => pathname.startsWith(r));
  const isNoFooterPage = NO_FOOTER_ROUTES.some((r) => pathname.startsWith(r));
  const isSupportUser = isSupportOnlyUser(user);
  const supportShouldBeInAdmin = isSupportUser && !pathname.startsWith("/admin");

  useEffect(() => {
    if (authLoading) return;
    if (!supportShouldBeInAdmin) return;
    router.replace("/admin");
  }, [authLoading, supportShouldBeInAdmin, router]);

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthPage) {
    return <main className="flex-1">{children}</main>;
  }

  if (supportShouldBeInAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isNoCategoryPage) {
    return (
      <SiteChrome>
        <Suspense><Header /></Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </SiteChrome>
    );
  }

  if (isNoFooterPage) {
    return (
      <SiteChrome>
        <div className="h-[100dvh] flex flex-col overflow-hidden">
          <Suspense><Header /></Suspense>
          <CategoryNav />
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
        </div>
      </SiteChrome>
    );
  }

  return (
    <SiteChrome>
      <Suspense><Header /></Suspense>
      <CategoryNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </SiteChrome>
  );
}