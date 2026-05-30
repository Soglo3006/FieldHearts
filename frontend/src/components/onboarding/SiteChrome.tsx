"use client";

import ProfileIncompleteBanner from "@/components/onboarding/ProfileIncompleteBanner";
import { useMyProfile } from "@/hooks/useMyProfile";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const { profile } = useMyProfile();

  return (
    <>
      <ProfileIncompleteBanner profile={profile} />
      {children}
    </>
  );
}
