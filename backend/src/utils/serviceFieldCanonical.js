/**
 * Mode de tarification annonce : uniquement forfait pour l’instant (hourly masqué produit + API).
 * La colonne `pricing_kind` est normalisée en lecture ; les écritures imposent toujours `fixed`.
 */
export const SERVICE_PRICING_KIND_FIXED = "fixed";

/**
 * Valeur unique autorisée en base / API jusqu’à ce qu’un vrai flux horaire existe.
 */
export function normalizePricingKindForRow(_raw) {
  return SERVICE_PRICING_KIND_FIXED;
}

/**
 * Clés canoniques pour services.availability et services.mobility (anglais stable).
 * Libellés FR/EN uniquement dans les fichiers i18n du frontend.
 */

function foldAscii(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normToken(s) {
  return foldAscii(s)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string | null | undefined} raw */
export function normalizeAvailability(raw) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const k = normToken(trimmed);

  const map = {
    anytime: "anytime",
    "any time": "anytime",
    weekends: "weekends",
    weekend: "weekends",
    "week ends": "weekends",
    "week end": "weekends",
    weekds: "weekends",
    weekdays: "weekdays",
    weekday: "weekdays",
    "week days": "weekdays",
    evenings: "evenings",
    evening: "evenings",
    soirs: "evenings",
    soir: "evenings",
    flexible: "flexible",
    souple: "flexible",
  };

  if (map[k]) return map[k];

  const direct = ["anytime", "weekends", "weekdays", "evenings", "flexible"];
  if (direct.includes(k)) return k;

  return trimmed;
}

/** @param {string | null | undefined} raw */
export function normalizeMobility(raw) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const k = normToken(trimmed);

  const map = {
    yes: "yes",
    no: "no",
    limited: "limited",
    city: "city",
    ville: "city",
    regional: "regional",
  };

  if (map[k]) return map[k];

  if (k === "en ville" || k === "in city") return "city";

  const direct = ["yes", "no", "limited", "city", "regional"];
  if (direct.includes(k)) return k;

  return trimmed;
}

/**
 * Harmonise availability / mobility sur une ligne service (pour réponses API).
 * @param {Record<string, unknown>} row
 */
export function canonServiceFieldsInPlace(row) {
  if (!row || typeof row !== "object") return row;
  if ("availability" in row) row.availability = normalizeAvailability(row.availability);
  if ("mobility" in row) row.mobility = normalizeMobility(row.mobility);
  row.pricing_kind = normalizePricingKindForRow(row.pricing_kind);
  return row;
}
