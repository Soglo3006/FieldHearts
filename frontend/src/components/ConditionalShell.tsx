"use client";

import "@/lib/i18n";
import { Suspense, useEffect, useLayoutEffect } from "react";
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
import { forceClearScrollLock } from "@/hooks/useScrollLock";

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

const MESSAGES_SCROLL_LOCK_CLASS = "uneden-messages-lock";

/** Clear leftover document locks from old messages experiments / stuck modals. */
function clearStaleDocumentLocks() {
  const html = document.documentElement;
  const body = document.body;
  html.classList.remove(MESSAGES_SCROLL_LOCK_CLASS);
  html.style.removeProperty("overflow");
  html.style.removeProperty("scrollbar-gutter");
  body.style.removeProperty("overflow");
  forceClearScrollLock();
}

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, isLoggingOut } = useAuth();

  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isNoCategoryPage = NO_CATEGORY_ROUTES.some((r) => pathname.startsWith(r));
  const isNoFooterPage = NO_FOOTER_ROUTES.some((r) => pathname.startsWith(r));
  const isSupportUser = isSupportOnlyUser(user);
  const supportShouldBeInAdmin = isSupportUser && !pathname.startsWith("/admin");

  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    const browserLng = getLanguageCode(navigator.language);
    const lng = saved ?? browserLng;
    if (lng !== i18n.language) i18n.changeLanguage(lng);
  }, []);

  useLayoutEffect(() => {
    // Always heal stuck locks on route change — including /messages.
    // (ProfileSidebar used to leave data-scroll-locked on forever.)
    clearStaleDocumentLocks();
  }, [pathname]);

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

  // Messages: one 100dvh column so conversation/chat/about get remaining height.
  // Banner + header + categories stay visually unchanged (not compacted).
  if (isNoFooterPage) {
    return (
      <SiteChrome fillViewport>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="shrink-0">
            <Suspense><Header /></Suspense>
            <CategoryNav />
          </div>
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            {children}
          </main>
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
