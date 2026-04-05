"use client";

import "@/lib/i18n";
import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import i18n from "@/lib/i18n";
import Header from "@/components/home/Header";
import CategoryNav from "@/components/home/Category";
import Footer from "@/components/home/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { getLanguageCode } from "@/lib/locale";
import { useBackendReady } from "@/hooks/useBackendReady";

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
  "/listings",
  "/privacy-policy",
  "/terms",
  "/payment-terms",
  "/trust-safety",
  "/about",
  "/contact",
];

const NO_FOOTER_ROUTES = [
  "/messages",
];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading: authLoading, isLoggingOut } = useAuth();
  const backendStatus = useBackendReady();

  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    const browserLng = getLanguageCode(navigator.language);
    const lng = saved ?? browserLng;
    if (lng !== i18n.language) i18n.changeLanguage(lng);
  }, []);

  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isNoCategoryPage = NO_CATEGORY_ROUTES.some((r) => pathname.startsWith(r));
  const isNoFooterPage = NO_FOOTER_ROUTES.some((r) => pathname.startsWith(r));

  // Backend cold-start: show a friendly warm-up screen until the server responds
  if (backendStatus === "slow" || backendStatus === "checking") {
    if (backendStatus === "slow") {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500 font-medium">Démarrage du serveur…</p>
          <p className="text-xs text-gray-400">Cela peut prendre quelques secondes</p>
        </div>
      );
    }
    // "checking" — first 3 s: silent wait (the page renders normally if backend responds fast)
  }

  if (backendStatus === "error") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-base font-semibold text-gray-800">Impossible de joindre le serveur</p>
        <p className="text-sm text-gray-500">Veuillez vérifier votre connexion et réessayer.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

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

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isNoCategoryPage) {
    return (
      <>
        <Suspense><Header /></Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </>
    );
  }

  if (isNoFooterPage) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        <Suspense><Header /></Suspense>
        <CategoryNav />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <>
      <Suspense><Header /></Suspense>
      <CategoryNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}