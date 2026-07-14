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
      // Natural document height (banner + chrome + messages). No viewport lock —
      // page scrollbar appears once content exceeds the window.
      <div className="flex w-full flex-col bg-white">
        <ProfileIncompleteBanner profile={profile} />
        <div className="flex w-full flex-col">{children}</div>
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
