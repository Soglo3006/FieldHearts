import type { TFunction } from "i18next";

/** Première lettre alphabétique Unicode en majuscule (pour libellés hérités / valeurs libres). */
function capitalizeLeadingLetter(s: string): string {
  const str = typeof s === "string" ? s : String(s ?? "");
  if (!str.length) return str;
  const i = str.search(/\p{L}/u);
  if (i === -1) return str;
  const ch = str[i]!;
  const up = ch.toLocaleUpperCase();
  return str.slice(0, i) + up + str.slice(i + ch.length);
}

const availKey: Record<string, string> = {
  anytime: "post.urgencyAnytime",
  weekends: "post.availabilityWeekends",
  weekdays: "post.availabilityWeekdays",
  evenings: "post.availabilityEvenings",
  flexible: "serviceDetail.availabilityFlexible",
};

const mobKey: Record<string, string> = {
  yes: "post.mobilityYes",
  no: "post.mobilityNo",
  limited: "post.mobilityLimited",
  city: "serviceDetail.mobilityCity",
  regional: "serviceDetail.mobilityRegional",
};

const urgencyKey: Record<string, string> = {
  anytime: "post.urgencyAnytime",
  "few-days": "post.urgencyFewDays",
  today: "post.urgencyToday",
  urgent: "post.urgencyUrgent",
};

const langSingle = (tok: string, t: TFunction): string | undefined => {
  const k = tok.toLowerCase().trim();
  if (k === "french" || k === "fr" || k === "français") return t("post.languageFrench");
  if (k === "english" || k === "en") return t("post.languageEnglish");
  if (k === "bilingual" || k === "bilingue") return t("post.languageBilingual");
  return undefined;
};

/** Langues parlées : codes (french…), français/anglais, fr_en / fr-en, anciennes données. */
export function formatSpokenLanguageLabel(raw: string | null | undefined, t: TFunction): string {
  if (!raw?.trim()) return "";
  const s = raw.trim();
  const single = langSingle(s, t);
  if (single) return capitalizeLeadingLetter(single);

  const compact = s.toLowerCase().replace(/[\s_-]/g, "");
  const isFrEnCompound =
    compact === "fren" || compact === "enfr" || /^fr.?en|^en.?fr$/i.test(compact);
  if (isFrEnCompound) {
    return capitalizeLeadingLetter(`${t("post.languageFrench")}, ${t("post.languageEnglish")}`);
  }

  const parts = s.split(/[,;|/+]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const labels = parts.map((p) => langSingle(p, t)).filter((x): x is string => !!x?.length);
    if (labels.length === parts.length) return capitalizeLeadingLetter(labels.join(", "));
  }

  const split = s.split(/[_/+]+/).map((p) => p.trim()).filter(Boolean);
  if (split.length > 1) {
    const labels = split.map((p) => langSingle(p, t)).filter((x): x is string => !!x?.length);
    if (labels.length === split.length) return capitalizeLeadingLetter(labels.join(", "));
  }

  return capitalizeLeadingLetter(s);
}

/** Disponibilité (liste déroulante publication + anciennes valeurs). */
export function formatAvailabilityLabel(raw: string | null | undefined, t: TFunction): string {
  if (!raw?.trim()) return "";
  const k = raw.trim().toLowerCase();
  const key = availKey[k];
  const out = key ? t(key) : raw.trim();
  return capitalizeLeadingLetter(out);
}

/** Mobilité (oui/non/limité/ville…). */
export function formatMobilityLabel(raw: string | null | undefined, t: TFunction): string {
  if (!raw?.trim()) return "";
  const k = raw.trim().toLowerCase();
  const key = mobKey[k];
  const out = key ? t(key) : raw.trim();
  return capitalizeLeadingLetter(out);
}

/** Niveau d’urgence (demandes « looking »). */
export function formatUrgencyLabel(raw: string | null | undefined, t: TFunction): string {
  if (!raw?.trim()) return "";
  const k = raw.trim().toLowerCase();
  const key = urgencyKey[k];
  const out = key ? t(key) : raw.trim();
  return capitalizeLeadingLetter(out);
}
