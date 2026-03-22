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
  title: {
    default: "Uneden — Trouve de l'aide près de chez toi",
    template: "%s | Uneden",
  },
  description: "Uneden connecte les gens de ta communauté pour offrir et trouver des services locaux. Publie ton service ou trouve de l'aide près de chez toi.",
  keywords: ["services locaux", "communauté", "aide", "prestataire", "Québec", "Canada", "Uneden"],
  metadataBase: new URL("https://uneden.ca"),
  alternates: {
    canonical: "https://uneden.ca",
    languages: {
      "fr-CA": "https://uneden.ca",
      "en-CA": "https://uneden.ca/en",
    },
  },
  openGraph: {
    type: "website",
    url: "https://uneden.ca",
    siteName: "Uneden",
    title: "Uneden — Trouve de l'aide près de chez toi",
    description: "Connecte-toi avec ta communauté pour offrir et trouver des services locaux.",
    images: [
      {
        url: "https://uneden.ca/og-image.png",
        width: 1200,
        height: 630,
        alt: "Uneden — Trouve de l'aide près de chez toi",
      },
    ],
    locale: "fr_CA",
  },
  twitter: {
    card: "summary",
    title: "Uneden — Trouve de l'aide près de chez toi",
    description: "Connecte-toi avec ta communauté pour offrir et trouver des services locaux.",
    images: ["https://uneden.ca/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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