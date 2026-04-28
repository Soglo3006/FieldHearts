"use client";

import { cn } from "@/lib/utils";
import { listingContentLocales, type ListingLocaleCode, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";

interface Props {
  service: ServiceLikeWithI18n;
  className?: string;
  /** Placement par défaut haut à gauche (cartes grille) ; `right-top` évite collision avec compteur carrousel */
  position?: "left" | "right";
}

/** Pastilles compactes « Fr · Eng » sur les visuels d’annonces */
export default function ListingLangPills({ service, className, position = "left" }: Props) {
  const locales = listingContentLocales(service);
  if (locales.length === 0) return null;

  const labels: Record<ListingLocaleCode, string> = { fr: "Fr", en: "Eng" };

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-[2px]",
        position === "left" ? "left-2" : "right-2",
        className,
      )}
      aria-hidden
    >
      {locales.map((locale) => (
        <span key={locale}>{labels[locale]}</span>
      ))}
    </div>
  );
}
