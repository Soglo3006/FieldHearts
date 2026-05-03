import type { TFunction } from "i18next";

/** Resolved labels for the post confirmation modal (must stay aligned with PostSelect values). */

export function labelPosterType(t: TFunction, value: string): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (v === "individual") return t("post.individual");
  if (v === "company") return t("post.company");
  return v;
}

export function labelAvailability(t: TFunction, value: string): string | null {
  const v = value?.trim();
  if (!v) return null;
  const keys: Record<string, string> = {
    anytime: "post.urgencyAnytime",
    weekends: "post.availabilityWeekends",
    weekdays: "post.availabilityWeekdays",
    evenings: "post.availabilityEvenings",
    flexible: "serviceDetail.availabilityFlexible",
  };
  const key = keys[v];
  return key ? t(key) : v;
}

export function labelSpokenLanguage(t: TFunction, value: string): string | null {
  const v = value?.trim();
  if (!v) return null;
  const keys: Record<string, string> = {
    french: "post.languageFrench",
    english: "post.languageEnglish",
    bilingual: "post.languageBilingual",
  };
  const key = keys[v];
  return key ? t(key) : v;
}

export function labelMobility(t: TFunction, value: string): string | null {
  const v = value?.trim();
  if (!v) return null;
  const keys: Record<string, string> = {
    yes: "post.mobilityYes",
    no: "post.mobilityNo",
    limited: "post.mobilityLimited",
    city: "serviceDetail.mobilityCity",
    regional: "serviceDetail.mobilityRegional",
  };
  const key = keys[v];
  return key ? t(key) : v;
}

export function labelUrgency(t: TFunction, value: string): string | null {
  const v = value?.trim();
  if (!v) return null;
  const keys: Record<string, string> = {
    anytime: "post.urgencyAnytime",
    "few-days": "post.urgencyFewDays",
    today: "post.urgencyToday",
    urgent: "post.urgencyUrgent",
  };
  const key = keys[v];
  return key ? t(key) : v;
}
