"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navLinks = [
    { href: "/admin/disputes", label: t("admin.nav.disputes") },
    { href: "/admin/support", label: t("admin.nav.support") },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          {/* Logo + nav */}
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 text-green-700 font-bold text-base shrink-0">
              {t("admin.nav.dashboard")}
            </Link>
            <nav className="flex items-center gap-1">
              {navLinks.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 text-sm ${active ? "bg-green-50 text-green-700 font-semibold" : "text-gray-600"}`}
                    >
                      {label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" className="gap-2 text-gray-600" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              {t("admin.logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
