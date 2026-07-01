import { getIntlLocale } from "@/lib/locale";

/** Absolute creation date for listing owners (not relative "il y a X jours"). */
export function formatListingCreationDate(dateStr: string, language?: string): string {
  try {
    const locale = getIntlLocale(language, { fr: "fr-CA", en: "en-CA" });
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
