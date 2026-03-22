import type { Metadata } from "next";
import "@/lib/i18n";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ConditionalShell from "@/components/ConditionalShell";
import LogoutOverlay from "@/components/LogoutOverlay";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Uneden",
  description: "Find services near you",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white text-black`}
        suppressHydrationWarning
      >
        <AuthProvider>

          <ComingSoonOverlay />
          <ConditionalShell>{children}</ConditionalShell>
          <LogoutOverlay />
          <Toaster richColors position="top-right" />
          <SpeedInsights />
          <Analytics />

        </AuthProvider>
      </body>
    </html>
  );
}