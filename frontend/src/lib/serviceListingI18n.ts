/**
 * Titres/descriptions selon langue UI + badges langues disponibles sur les cartes listings.
 */

export type ListingLocaleCode = "fr" | "en";

export interface ListingTranslationsPayload {
  title?: Partial<Record<ListingLocaleCode, string>>;
  description?: Partial<Record<ListingLocaleCode, string>>;
}

export interface ServiceLikeWithI18n {
  title?: string;
  description?: string;
  language?: string | null;
  translations?: ListingTranslationsPayload | string | Record<string, unknown> | null;
}

function parseTranslations(raw: ServiceLikeWithI18n["translations"]): ListingTranslationsPayload | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as ListingTranslationsPayload;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ListingTranslationsPayload;
    } catch {
      return null;
    }
  }
  return null;
}

function siteLocaleFromPath(i18nLang: string | undefined): ListingLocaleCode {
  return i18nLang?.startsWith("en") ? "en" : "fr";
}

/** Titre préféré: langue site → puis l'autre → fallback varchar */
export function resolveListingTitle(service: ServiceLikeWithI18n, i18nLang: string | undefined): string {
  const pref = siteLocaleFromPath(i18nLang);
  const alt: ListingLocaleCode = pref === "fr" ? "en" : "fr";
  const tr = parseTranslations(service.translations);
  const fb = String(service.title ?? "").trim();
  const tTitle = tr?.title;
  const a = pref === "fr" ? tTitle?.fr?.trim() : tTitle?.en?.trim();
  const b = pref === "fr" ? tTitle?.en?.trim() : tTitle?.fr?.trim();
  return a || b || fb;
}

/** Description préférée */
export function resolveListingDescription(service: ServiceLikeWithI18n, i18nLang: string | undefined): string {
  const pref = siteLocaleFromPath(i18nLang);
  const tr = parseTranslations(service.translations);
  const fb = String(service.description ?? "").trim();
  const dTitle = tr?.description;
  const a = pref === "fr" ? dTitle?.fr?.trim() : dTitle?.en?.trim();
  const b = pref === "fr" ? dTitle?.en?.trim() : dTitle?.fr?.trim();
  return a || b || fb;
}

/**
 * Codes langues affichés sur l'image (contenu titre ou description disponible dans cette langue),
 * sinon repli depuis `language` (langue parlée).
 */
export function listingContentLocales(service: ServiceLikeWithI18n): ListingLocaleCode[] {
  const tr = parseTranslations(service.translations);
  const langs = new Set<ListingLocaleCode>();
  const hasBlock = (
    blk: Partial<Record<ListingLocaleCode, string>> | undefined,
    k: ListingLocaleCode
  ) =>
    !!(blk?.[k] && blk[k]?.trim());

  let anyTrans = false;
  (["fr", "en"] as const).forEach((k) => {
    const ht = hasBlock(tr?.title, k) || hasBlock(tr?.description, k);
    if (ht) {
      anyTrans = true;
      langs.add(k);
    }
  });

  const orderRank = (code: ListingLocaleCode) => (code === "fr" ? 0 : 1);
  if (anyTrans) return [...langs].sort((a, b) => orderRank(a) - orderRank(b));

  /** Langue parlée (formulaire liste) — aligné AvailabilityLanguageMobilityFields */
  const sp = String(service.language ?? "").toLowerCase();
  if (sp === "english") return ["en"];
  if (sp === "french") return ["fr"];
  if (sp === "bilingual") return ["fr", "en"];
  /** Legacy ou textes libres */
  if (sp.includes("english") || sp === "en") return ["en"];
  if (sp.includes("french") || sp === "fr") return ["fr"];
  if (
    sp.includes("bilingual") ||
    sp.includes("biling") ||
    sp === "both" ||
    sp.includes("fr_en") ||
    sp.includes("en_fr")
  )
    return ["fr", "en"];
  if (sp) return ["fr", "en"];
  return ["fr"];
}

export function localeCodesToShortLabel(locales: ListingLocaleCode[]): string {
  const orderRank = (code: ListingLocaleCode) => (code === "fr" ? 0 : 1);
  return [...locales].sort((a, b) => orderRank(a) - orderRank(b)).join(" · ");
}
