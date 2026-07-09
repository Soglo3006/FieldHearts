import type { OnboardingData } from "@/components/onboarding/onboardingTypes";

export type AccountType = "person" | "company";

export interface ProfileForCompletion {
  account_type?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  profession?: string | null;
  industry?: string | null;
  skills?: string[] | string | null;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export interface ProfileRecord extends ProfileForCompletion {
  bio?: string | null;
  avatar?: string | null;
  languages?: unknown;
  experiences?: unknown;
  portfolio?: unknown;
  team_size?: string | null;
  email?: string | null;
  profile_completed?: boolean | null;
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

export function onboardingDataFromProfile(profile: ProfileRecord): OnboardingData {
  const skills = parseSkills(profile.skills);
  const isCompany = profile.account_type === "company";
  return {
    accountType: (isCompany ? "company" : "person") as AccountType,
    avatar: profile.avatar || "",
    email: profile.email || "",
    phone: profile.phone || "",
    adresse: profile.address || "",
    ville: profile.city || "",
    province: profile.province || "",
    postalCode: profile.postal_code || "",
    fullName: profile.full_name || "",
    profession: profile.profession || "",
    bio: isCompany ? "" : (profile.bio || ""),
    skills,
    languages: parseJsonArray(profile.languages),
    experiences: parseJsonArray(profile.experiences),
    companyName: profile.company_name || "",
    industry: profile.industry || "",
    companyBio: isCompany ? (profile.bio || "") : "",
    teamSize: profile.team_size || "",
    portfolio: parseJsonArray(profile.portfolio),
  };
}

/** Restore step progress after finish or when local draft was cleared. */
export function resolveOnboardingMaxStep(
  totalSteps: number,
  options: { savedMaxStep?: number | null; profileCompleted?: boolean },
): number {
  const saved = options.savedMaxStep;
  if (saved != null && saved >= 1) return Math.min(saved, totalSteps);
  if (options.profileCompleted) return totalSteps;
  return 1;
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

export function profileCompletionPath(
  accountType: string | null | undefined,
  step?: number,
): string {
  const type = accountType === "company" ? "company" : "person";
  const base = `/profile/complete_profil?type=${type}`;
  if (step != null && step >= 1) return `${base}&step=${step}`;
  return base;
}

/** Step 1 address fields required for buyer tax calculation. */
export function isProfileTaxLocationComplete(profile: ProfileForCompletion | null | undefined): boolean {
  if (!profile) return false;
  return (
    hasText(profile.address) &&
    hasText(profile.city) &&
    hasText(profile.province) &&
    hasText(profile.postal_code)
  );
}

export type BillingAddressForTax = {
  address_line1?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

export function isBillingAddressTaxComplete(address: BillingAddressForTax | null | undefined): boolean {
  if (!address) return false;
  return (
    hasText(address.address_line1) &&
    hasText(address.city) &&
    hasText(address.province) &&
    hasText(address.postal_code)
  );
}

export function onboardingDataToPayoutProfile(
  data: Pick<
    import("@/components/onboarding/onboardingTypes").OnboardingData,
    | "accountType"
    | "fullName"
    | "companyName"
    | "phone"
    | "adresse"
    | "ville"
    | "province"
    | "postalCode"
  >,
): ProfileForCompletion {
  return {
    account_type: data.accountType,
    full_name: data.fullName,
    company_name: data.companyName,
    phone: data.phone,
    address: data.adresse,
    city: data.ville,
    province: data.province,
    postal_code: data.postalCode,
  };
}

/** Step 1 fields required before opening Stripe payout onboarding. */
export function isPayoutProfileComplete(profile: ProfileForCompletion | null | undefined): boolean {
  if (!profile) return false;
  const isCompany = profile.account_type === "company";

  const hasIdentity = isCompany
    ? hasText(profile.company_name) && hasText(profile.full_name)
    : hasText(profile.full_name);

  return (
    hasIdentity &&
    hasText(profile.phone) &&
    hasText(profile.address) &&
    hasText(profile.city) &&
    hasText(profile.province) &&
    hasText(profile.postal_code)
  );
}
