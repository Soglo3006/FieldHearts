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

    if (!isNoFooterPage) return;

    // Desktop only: pin the shell. On mobile we keep document scroll so the
    // user can scroll site chrome away and enlarge the messages section.
    const mq = window.matchMedia("(min-width: 768px)");
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlMaxHeight: html.style.maxHeight,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyMaxHeight: body.style.maxHeight,
      bodyMinHeight: body.style.minHeight,
    };

    const applyDesktopLock = () => {
      if (!mq.matches) {
        html.classList.remove(MESSAGES_SCROLL_LOCK_CLASS);
        html.style.overflow = prev.htmlOverflow;
        html.style.height = prev.htmlHeight;
        html.style.maxHeight = prev.htmlMaxHeight;
        body.style.overflow = prev.bodyOverflow;
        body.style.height = prev.bodyHeight;
        body.style.maxHeight = prev.bodyMaxHeight;
        body.style.minHeight = prev.bodyMinHeight;
        return;
      }
      html.classList.add(MESSAGES_SCROLL_LOCK_CLASS);
      html.style.overflow = "hidden";
      html.style.height = "100%";
      html.style.maxHeight = "100dvh";
      body.style.overflow = "hidden";
      body.style.height = "100%";
      body.style.maxHeight = "100dvh";
      body.style.minHeight = "0";
    };

    applyDesktopLock();
    mq.addEventListener("change", applyDesktopLock);
    return () => {
      mq.removeEventListener("change", applyDesktopLock);
      html.classList.remove(MESSAGES_SCROLL_LOCK_CLASS);
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      html.style.maxHeight = prev.htmlMaxHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.maxHeight = prev.bodyMaxHeight;
      body.style.minHeight = prev.bodyMinHeight;
    };
  }, [pathname, isNoFooterPage]);

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

  // Messages: on mobile, chrome stays scrollable so the chat can expand to
  // nearly full screen after scrolling. Desktop keeps a fixed viewport column.
  if (isNoFooterPage) {
    return (
      <SiteChrome fillViewport>
        <div className="flex flex-1 flex-col bg-white md:min-h-0 md:overflow-hidden">
          <div className="shrink-0">
            <Suspense><Header /></Suspense>
            <CategoryNav />
          </div>
          <main
            data-messages-main
            className="flex min-h-svh flex-col bg-white md:min-h-0 md:flex-1 md:overflow-hidden"
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
