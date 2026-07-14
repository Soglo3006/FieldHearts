"use client";

import ProfileIncompleteBanner from "@/components/onboarding/ProfileIncompleteBanner";
import { useMyProfile } from "@/hooks/useMyProfile";

export default function SiteChrome({
  children,
  /** Banner + children share one 100dvh column (messages page). */
  fillViewport = false,
}: {
  children: React.ReactNode;
  fillViewport?: boolean;
}) {
  const { profile } = useMyProfile();

  if (fillViewport) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-white">
        <ProfileIncompleteBanner profile={profile} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <>
      <ProfileIncompleteBanner profile={profile} />
      {children}
    </>
  );
}
