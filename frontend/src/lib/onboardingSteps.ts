import type { OnboardingData } from "@/components/onboarding/onboardingTypes";

export type AccountType = "person" | "company";

export interface ProfileForCompletion {
  account_type?: string | null;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  profession?: string | null;
  industry?: string | null;
  skills?: string[] | string | null;
}

function parseSkills(skills: ProfileForCompletion["skills"]): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Steps 1–3: required fields (marked with *). Steps 4+: optional — complete once visited. */
export function isOnboardingStepComplete(
  step: number,
  accountType: AccountType,
  data: OnboardingData,
  maxStepReached: number,
  totalSteps: number
): boolean {
  const optionalFromStep = 4;
  if (step >= optionalFromStep) {
    if (step === totalSteps) {
      if (maxStepReached < step) return false;
      for (let s = 1; s < totalSteps; s++) {
        if (!isOnboardingStepComplete(s, accountType, data, maxStepReached, totalSteps)) return false;
      }
      return true;
    }
    return maxStepReached > step;
  }

  switch (step) {
    case 1:
      return (
        hasText(data.fullName) &&
        hasText(data.phone) &&
        hasText(data.adresse) &&
        hasText(data.ville) &&
        hasText(data.province) &&
        hasText(data.postalCode)
      );
    case 2:
      if (accountType === "person") return maxStepReached > 2;
      return hasText(data.industry);
    case 3:
      return (data.skills?.length ?? 0) > 0;
    default:
      return false;
  }
}

export function getOnboardingStepCompletions(
  accountType: AccountType,
  data: OnboardingData,
  totalSteps: number,
  maxStepReached: number
): boolean[] {
  return Array.from({ length: totalSteps }, (_, i) =>
    isOnboardingStepComplete(i + 1, accountType, data, maxStepReached, totalSteps)
  );
}

export function onboardingDataFromProfile(profile: ProfileForCompletion): OnboardingData {
  const skills = parseSkills(profile.skills);
  return {
    accountType: (profile.account_type === "company" ? "company" : "person") as AccountType,
    avatar: "",
    email: "",
    phone: profile.phone || "",
    adresse: profile.address || "",
    ville: profile.city || "",
    province: profile.province || "",
    postalCode: profile.postal_code || "",
    fullName: profile.full_name || "",
    profession: profile.profession || "",
    bio: "",
    skills,
    languages: [],
    experiences: [],
    companyName: "",
    industry: profile.industry || "",
    companyBio: "",
    teamSize: "",
    portfolio: [],
  };
}

/** True when any required onboarding step (1–3) is missing data. */
export function isProfileDetailsIncomplete(profile: ProfileForCompletion | null | undefined): boolean {
  if (!profile?.account_type) return false;

  const accountType = profile.account_type === "company" ? "company" : "person";
  const data = onboardingDataFromProfile(profile);
  const totalSteps = accountType === "company" ? 6 : 7;
  const completions = getOnboardingStepCompletions(accountType, data, totalSteps, totalSteps);

  return completions.slice(0, 3).some((complete) => !complete);
}

export function profileCompletionPath(accountType: string | null | undefined): string {
  const type = accountType === "company" ? "company" : "person";
  return `/profile/complete_profil?type=${type}`;
}
