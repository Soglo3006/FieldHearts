/**
 * Canonicalisation titre/description + garde fou JSON depuis le client (POST/PATCH listings).
 */

const TITLE_MAX = 200;
const DESC_MAX = 5000;

/**
 * Nettoie un bloc titre/description par locale.
 * @param {unknown} raw
 */
export function sanitizeListingTranslations(raw) {
  /** @type {{ title: Partial<Record<"fr"|"en", string>>, description: Partial<Record<"fr"|"en", string>> }} */
  const out = { title: {}, description: {} };
  if (!raw || typeof raw !== "object" || raw === null) return out;

  const obj = raw;
  const titleObj =
    typeof obj.title === "object" && obj.title !== null ? /** @type {Record<string, unknown>} */ ({ ...obj.title }) : {};
  const descObj =
    typeof obj.description === "object" && obj.description !== null
      ? /** @type {Record<string, unknown>} */ ({ ...obj.description })
      : {};

  for (const lang of ["fr", "en"]) {
    /** @type {"fr"|"en"} */
    const L = /** @type {"fr"|"en"} */ (lang);
    const tv =
      typeof titleObj[L] === "string" ? String(titleObj[L]).trim().slice(0, TITLE_MAX) : "";
    if (tv) out.title[L] = tv;
    const dv =
      typeof descObj[L] === "string" ? String(descObj[L]).trim().slice(0, DESC_MAX) : "";
    if (dv) out.description[L] = dv;
  }

  return out;
}

/**
 * Copies canon pour colonnes varchar: FR prioritaire, puis EN.
 * @param {ReturnType<typeof sanitizeListingTranslations>} translations
 */
export function canonicalListingTexts(translations) {
  const tb = translations?.title ?? {};
  const db = translations?.description ?? {};
  const title = String(tb.fr ?? tb.en ?? "").trim().slice(0, TITLE_MAX);
  const description = String(db.fr ?? db.en ?? "").trim().slice(0, DESC_MAX);
  return { title, description };
}
