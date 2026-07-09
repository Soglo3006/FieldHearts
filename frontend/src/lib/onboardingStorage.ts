import { clearMyProfileCache } from "@/lib/myProfileCache";

export function clearOnboardingStorage(userId?: string) {
  try {
    ["person", "company"].forEach((type) => {
      localStorage.removeItem(`onboarding_data_${type}`);
      localStorage.removeItem(`onboarding_max_step_${type}`);
    });
  } catch {
    // ignore private mode / quota
  }
  if (userId) {
    clearMyProfileCache(userId);
    try {
      sessionStorage.removeItem(`wallet-connect-${userId}`);
    } catch {
      // ignore
    }
  }
}
