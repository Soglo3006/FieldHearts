/**
 * Provinces et territoires du Canada pour le sélecteur d'emplacement.
 * Utilisé pour proposer une recherche par région (ex. « Québec ») avant les villes.
 */

export type CanadaRegion = {
  id: string;
  labels: { fr: string; en: string };
  /** Termes pour filtrer quand l'utilisateur tape (sans accents, minuscules) */
  search: string[];
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSearch(s: string): string {
  return stripDiacritics(s.toLowerCase().trim());
}

/** Ordre : est → ouest, régions administratives usuelles */
export const CANADA_REGIONS: readonly CanadaRegion[] = [
  { id: "nl", labels: { fr: "Terre-Neuve-et-Labrador", en: "Newfoundland and Labrador" }, search: ["terre-neuve", "labrador", "newfoundland", "nl", "t-n-l"] },
  { id: "pe", labels: { fr: "Île-du-Prince-Édouard", en: "Prince Edward Island" }, search: ["ipe", "p-e-i", "pei", "edward"] },
  { id: "ns", labels: { fr: "Nouvelle-Écosse", en: "Nova Scotia" }, search: ["nouvelle-ecosse", "nova scotia", "né", "ns"] },
  { id: "nb", labels: { fr: "Nouveau-Brunswick", en: "New Brunswick" }, search: ["nouveau-brunswick", "new brunswick", "nb"] },
  { id: "qc", labels: { fr: "Québec", en: "Quebec" }, search: ["québec", "quebec", "qc"] },
  { id: "on", labels: { fr: "Ontario", en: "Ontario" }, search: ["ontario", "on"] },
  { id: "mb", labels: { fr: "Manitoba", en: "Manitoba" }, search: ["manitoba", "mb"] },
  { id: "sk", labels: { fr: "Saskatchewan", en: "Saskatchewan" }, search: ["saskatchewan", "sk"] },
  { id: "ab", labels: { fr: "Alberta", en: "Alberta" }, search: ["alberta", "ab"] },
  { id: "bc", labels: { fr: "Colombie-Britannique", en: "British Columbia" }, search: ["colombie-britannique", "british columbia", "bc"] },
  { id: "yt", labels: { fr: "Yukon", en: "Yukon" }, search: ["yukon", "yt"] },
  { id: "nt", labels: { fr: "Territoires du Nord-Ouest", en: "Northwest Territories" }, search: ["territoires du nord-ouest", "northwest", "tno", "nt"] },
  { id: "nu", labels: { fr: "Nunavut", en: "Nunavut" }, search: ["nunavut", "nu"] },
] as const;

export function getRegionDisplayLabel(region: CanadaRegion, langIsEnglish: boolean): string {
  return langIsEnglish ? region.labels.en : region.labels.fr;
}

/**
 * Sans requête : toutes les régions. Avec requête : sous-ensemble pertinent (FR ou EN).
 */
export function filterCanadaRegions(rawQuery: string): CanadaRegion[] {
  const q = normalizeSearch(rawQuery);
  if (!q) return [...CANADA_REGIONS];

  return CANADA_REGIONS.filter((region) => {
    const fr = normalizeSearch(region.labels.fr);
    const en = normalizeSearch(region.labels.en);
    if (fr.includes(q) || en.includes(q)) return true;
    return region.search.some((term) => normalizeSearch(term).startsWith(q) || normalizeSearch(term).includes(q));
  });
}
