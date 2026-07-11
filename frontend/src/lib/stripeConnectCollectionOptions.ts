/**
 * Stripe Connect embedded components — hide fields we already sync from Uneden.
 * Stripe keeps its own step progress and navigation buttons.
 */
export type StripeConnectCollectionOptions = {
  fields: "currently_due" | "eventually_due";
  futureRequirements?: "omit" | "include";
  /** Stripe requires exactly one of `only` or `exclude`, not both optional. */
  requirements?: { only: string[] } | { exclude: string[] };
};

/** Synced to Stripe before opening embedded onboarding — hide from the worker UI. */
const PREFILLED_REQUIREMENT_EXCLUDES = [
  "business_type",
  "business_profile.url",
  "business_profile.mcc",
  "business_profile.product_description",
  "business_profile.name",
  "business_profile.support_phone",
  "business_profile.support_email",
  "business_profile.support_url",
  "company.name",
  "company.address",
  "company.phone",
  "individual.email",
  "individual.first_name",
  "individual.last_name",
  "individual.phone",
  "individual.address",
  "individual.relationship.title",
];

/** Let Stripe drive steps/progress; only hide pre-filled business/profile fields. */
export const STRIPE_ONBOARDING_COLLECTION_OPTIONS: StripeConnectCollectionOptions = {
  fields: "currently_due",
  futureRequirements: "omit",
  requirements: {
    exclude: PREFILLED_REQUIREMENT_EXCLUDES,
  },
};

/** Bank account updates only — no business / profile sections. */
export const STRIPE_BANK_MANAGEMENT_COLLECTION_OPTIONS: StripeConnectCollectionOptions = {
  fields: "currently_due",
  futureRequirements: "omit",
  requirements: {
    only: ["external_account"],
  },
};
