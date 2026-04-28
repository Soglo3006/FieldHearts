/**
 * Même logique que backend/src/utils/serviceFieldCanonical.js —
 * valeurs stockées en clés anglaises ; FR/EN via i18n à l’affichage.
 */
function foldAscii(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normToken(s: string): string {
  return foldAscii(s)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAvailability(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const trimmed = String(raw).trim();
  if (trimmed === "") return "";
  const k = normToken(trimmed);

  const map: Record<string, string> = {
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

export function normalizeMobility(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const trimmed = String(raw).trim();
  if (trimmed === "") return "";
  const k = normToken(trimmed);

  const map: Record<string, string> = {
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
