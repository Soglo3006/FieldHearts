import type { User } from "@supabase/supabase-js";

/** User must pick account type and pass the basic-info intro before using the app. */
export function needsOnboardingSetup(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.user_metadata?.onboarding_intro_completed !== true;
}
