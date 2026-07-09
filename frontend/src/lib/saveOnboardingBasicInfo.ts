import type { OnboardingData } from "@/components/onboarding/onboardingTypes";
import { clearMyProfileCache } from "@/lib/myProfileCache";
import {
  isPayoutProfileComplete,
  onboardingDataToPayoutProfile,
} from "@/lib/onboardingSteps";

export async function saveOnboardingBasicInfo(
  data: OnboardingData,
  accessToken: string,
  userId?: string,
): Promise<boolean> {
  const snapshot = onboardingDataToPayoutProfile(data);
  if (!isPayoutProfileComplete(snapshot)) return false;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/onboarding-basic`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      account_type: data.accountType,
      full_name: data.fullName || "",
      phone: data.phone,
      address: data.adresse,
      city: data.ville,
      province: data.province,
      postal_code: data.postalCode || "",
      company_name: data.companyName || "",
    }),
  });

  if (res.ok && userId) {
    clearMyProfileCache(userId);
  }

  return res.ok;
}
