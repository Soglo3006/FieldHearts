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
      // Mobile: page can scroll so site chrome (banner/header/categories) leaves
      // the viewport and the messages panel can grow to full height.
      // Desktop: lock to one viewport column.
      <div className="flex flex-col bg-white md:h-dvh md:max-h-dvh md:overflow-hidden">
        <ProfileIncompleteBanner profile={profile} />
        <div className="flex flex-1 flex-col md:min-h-0 md:overflow-hidden">{children}</div>
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
