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
  html.style.removeProperty("overflow-y");
  html.style.removeProperty("overflow-x");
  html.style.removeProperty("scrollbar-gutter");
  html.style.removeProperty("height");
  html.style.removeProperty("max-height");
  html.style.removeProperty("min-height");
  body.style.removeProperty("overflow");
  body.style.removeProperty("overflow-y");
  body.style.removeProperty("overflow-x");
  body.style.removeProperty("height");
  body.style.removeProperty("max-height");
  body.style.removeProperty("min-height");
  body.style.removeProperty("position");
  body.style.removeProperty("top");
  body.style.removeProperty("width");
  body.style.removeProperty("touch-action");
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
    // Messages page keeps document scroll so the section can exceed the window.
    clearStaleDocumentLocks();
  }, [pathname]);

  // Re-clear after paint: HMR / prior viewport locks can leave max-height on body
  // which kills the page scrollbar even after overflow is restored.
  useEffect(() => {
    if (!isNoFooterPage) return;
    clearStaleDocumentLocks();
  }, [isNoFooterPage, pathname]);

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

  // Messages: site chrome above + fixed-height chat panel. Page can scroll
  // (desktop + mobile); conversation keeps its own internal scroll.
  // shrink-0 on main is required — otherwise flex parents squash h-svh into
  // the remaining viewport and the document never overflows (no page scrollbar).
  if (isNoFooterPage) {
    return (
      <SiteChrome fillViewport>
        <div className="flex flex-col bg-white">
          <div className="shrink-0">
            <Suspense><Header /></Suspense>
            <CategoryNav />
          </div>
          <main
            data-messages-main
            className="flex h-svh max-h-svh shrink-0 flex-col overflow-hidden bg-white"
          >
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
