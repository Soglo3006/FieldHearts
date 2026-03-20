"use client";

import "@/lib/i18n";
import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import i18n from "@/lib/i18n";
import Header from "@/components/home/Header";
import CategoryNav from "@/components/home/Category";
import Footer from "@/components/home/Footer";
import SupportButton from "@/components/support/SupportButton";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";

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
];

const NO_FOOTER_ROUTES = [
  "/messages",
];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading: authLoading, isLoggingOut } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    const browserLng = navigator.language?.startsWith("fr") ? "fr" : "en";
    const lng = saved ?? browserLng;
    if (lng !== i18n.language) i18n.changeLanguage(lng);
  }, []);

  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isNoCategoryPage = NO_CATEGORY_ROUTES.some((r) => pathname.startsWith(r));
  const isNoFooterPage = NO_FOOTER_ROUTES.some((r) => pathname.startsWith(r));

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
        <SupportButton floating />
      </>
    );
  }

  if (isNoFooterPage) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Suspense><Header /></Suspense>
        <CategoryNav />
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
        <SupportButton floating />
      </div>
    );
  }

  return (
    <>
      <Suspense><Header /></Suspense>
      <CategoryNav />
      <main className="flex-1">{children}</main>
      <Footer />
      <SupportButton floating />
    </>
  );
}