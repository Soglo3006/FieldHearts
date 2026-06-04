"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useStartConversation } from "@/hooks/useStartConversation";
import { useState, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import SettingsPage from "@/components/profile/Settings";
import EllipsisPage from "@/components/profile/Ellipsis";
import RatingsPage from "@/components/profile/RatingsPage";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileAbout from "@/components/profile/ProfileAbout";
import ProfilePortfolio from "@/components/profile/ProfilePortfolio";
import ProfileListings from "@/components/profile/ProfileListings";
import BlockedBanner from "@/components/profile/BlockedBanner";
import { toast } from "sonner";
import { type Service as Listing } from "@/components/listings/EditListingModal";
import { Skeleton } from "@/components/ui/skeleton";
import { OverlayModal } from "@/components/ui/OverlayModal";
import CompleteProfileModal from "@/components/profile/CompleteProfileModal";

interface ProfileUser {
  account_type?: string;
  full_name?: string;
  company_name?: string;
  profession?: string;
  industry?: string;
  created_at?: string;
  skills?: string | string[];
  languages?: string | string[];
  portfolio?: string | unknown[];
  avatar?: string;
  city?: string;
  province?: string;
  team_size?: string;
  stats?: { average_rating?: number; total_reviews?: number };
}

export default function UserProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const pathname = usePathname();
  const router = useRouter();
  const { user, session, isLoggingOut, loading: authLoading } = useAuth();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasFetchedRef = useRef(false);

  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [showEllipsis, setShowEllipsis] = useState(false);
  const [showRatings, setShowRatings] = useState(false);

  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  /** False until we know block state for logged-in visitors (avoids flashing name/avatar before Supabase). */
  const [blockResolved, setBlockResolved] = useState(false);

  const settingsScrollRef = useRef<HTMLDivElement>(null);
  const isOwner = user?.id === profileId;
  const { startConversation, loading: sendMessageLoading, showCompleteProfile: showConvComplete, setShowCompleteProfile: setShowConvComplete } = useStartConversation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    hasFetchedRef.current = false;
    setError("");
    try {
      const raw = sessionStorage.getItem(`profile-${profileId}`);
      if (raw) {
        setProfileUser(JSON.parse(raw) as ProfileUser);
        setLoading(false);
      } else {
        setProfileUser(null);
        setLoading(true);
      }
    } catch {
      setProfileUser(null);
      setLoading(true);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId || hasFetchedRef.current) return;
    const fetchProfile = async () => {
      const hasCachedData = (() => {
        try { return typeof window !== 'undefined' && !!sessionStorage.getItem(`profile-${profileId}`); }
        catch { return false; }
      })();
      try {
        if (!hasCachedData) { setLoading(true); setError(""); }
        let url = `${process.env.NEXT_PUBLIC_API_URL}/profiles/${profileId}`;
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        if (user && user.id === profileId && session?.access_token) {
          url = `${process.env.NEXT_PUBLIC_API_URL}/profiles/me`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error("Profile not found");
        const data = await res.json();
        setProfileUser(data);
        try { sessionStorage.setItem(`profile-${profileId}`, JSON.stringify(data)); } catch {}
        hasFetchedRef.current = true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("profile.profileNotFound"));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [profileId, user, session?.access_token, t]);

  useEffect(() => {
    if (!profileId) return;
    setListingsLoading(true);
    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/user/${profileId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          : [];
        setUserListings(sorted);
      })
      .catch(() => setUserListings([]))
      .finally(() => setListingsLoading(false));
  }, [profileId, session?.access_token]);

  useEffect(() => {
    if (!profileId || authLoading) return;

    if (!user || user.id === profileId) {
      setIsBlocked(false);
      setIsBlockedByOther(false);
      setBlockResolved(true);
      return;
    }

    let cancelled = false;
    setBlockResolved(false);
    setIsBlocked(false);
    setIsBlockedByOther(false);
    (async () => {
      const [{ data: iBlockedThem }, { data: theyBlockedMe }] = await Promise.all([
        supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_user_id", profileId).maybeSingle(),
        supabase.from("blocked_users").select("id").eq("blocker_id", profileId).eq("blocked_user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setIsBlocked(!!iBlockedThem);
      setIsBlockedByOther(!!theyBlockedMe);
      setBlockResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId, user, authLoading]);

  const viewingOtherWhileLoggedIn = Boolean(user && user.id !== profileId);
  const blockStatusPending = viewingOtherWhileLoggedIn && !blockResolved;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <main className="flex-1 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            {/* Profile header card */}
            <div className="border border-gray-200 rounded-2xl p-6 mb-6 flex gap-6 items-start">
              <Skeleton className="h-24 w-24 rounded-full shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <Skeleton className="h-7 w-48 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-9 w-36 rounded-lg" />
                  <Skeleton className="h-9 w-36 rounded-lg" />
                  <Skeleton className="h-9 w-36 rounded-lg" />
                </div>
              </div>
            </div>
            {/* Listings section */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <Skeleton className="h-6 w-28 rounded mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("profile.profileNotFound")}</h1>
            <p className="text-gray-600">{error || t("profile.profileNotFoundDesc")}</p>
            <Link href="/"><Button className="mt-4 bg-green-700 hover:bg-green-800 text-white">{t("notFound.goHome")}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (viewingOtherWhileLoggedIn && blockResolved && isBlockedByOther) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("profile.profileNotFound")}</h1>
            <p className="text-gray-600">{t("profile.profileNotFoundDesc")}</p>
            <Link href="/"><Button className="mt-4 bg-green-700 hover:bg-green-800 text-white">{t("notFound.goHome")}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const isPerson = profileUser.account_type === "person";
  const isCompany = profileUser.account_type === "company";
  const displayName = (isPerson ? profileUser.full_name : profileUser.company_name) || "";
  const displayTitle = (isPerson ? profileUser.profession : profileUser.industry) || "";
  const dateLocale = i18n.language?.startsWith("fr") ? "fr-CA" : "en-US";
  const memberSince = profileUser.created_at
    ? new Date(profileUser.created_at).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
    : t("profile.recently");
  const skills = typeof profileUser.skills === "string" ? JSON.parse(profileUser.skills) : profileUser.skills || [];
  const languages = typeof profileUser.languages === "string" ? JSON.parse(profileUser.languages) : profileUser.languages || [];
  const portfolio = typeof profileUser.portfolio === "string" ? JSON.parse(profileUser.portfolio) : profileUser.portfolio || [];

  const openProfileOptions = () => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setShowEllipsis(true);
  };

  const handleUnblock = async () => {
    if (!user || !window.confirm(t("settings.unblockConfirm"))) return;
    setBlockLoading(true);
    try {
      await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_user_id", profileId);
      setIsBlocked(false);
    } catch {
      toast.error(t("profile.failedUnblock"));
    } finally {
      setBlockLoading(false);
    }
  };

  const hidePublicHeader = !isOwner && (isBlocked || isBlockedByOther);
  const breadcrumbLabel = isOwner
    ? (isPerson ? t("profile.yourProfile") : t("profile.yourCompanyProfile"))
    : hidePublicHeader
      ? t("profile.breadcrumbRestricted")
      : t("profile.sProfile", { name: displayName });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <Link href="/"><span className="hover:text-green-700 cursor-pointer">{t("notFound.goHome")}</span></Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-green-700 font-medium">
              {breadcrumbLabel}
            </span>
          </div>

          {!hidePublicHeader && (
            <ProfileHeader
              profileUser={profileUser}
              displayName={displayName}
              displayTitle={displayTitle}
              isPerson={isPerson}
              isCompany={isCompany}
              isOwner={isOwner}
              isBlocked={isBlocked}
              isBlockedByOther={isBlockedByOther}
              blockLoading={blockLoading}
              profileId={profileId}
              listingsCount={userListings.length}
              sendMessageLoading={sendMessageLoading}
              onSendMessage={() => startConversation(profileId, pathname)}
              onSettings={() => setShowSettings(true)}
              onEllipsis={openProfileOptions}
              onRatings={() => setShowRatings(true)}
              onUnblock={handleUnblock}
            />
          )}

          {!isBlocked && !isBlockedByOther && (
            <>
              <ProfileAbout
                profileUser={profileUser}
                isPerson={isPerson}
                isCompany={isCompany}
                skills={skills}
                languages={languages}
                memberSince={memberSince}
              />
              <ProfilePortfolio portfolio={portfolio} isPerson={isPerson} isOwner={isOwner} />
              <ProfileListings
                userListings={userListings}
                setUserListings={setUserListings}
                listingsLoading={listingsLoading}
                isOwner={isOwner}
                isPerson={isPerson}
                profileId={profileId}
                accessToken={session?.access_token}
              />
            </>
          )}

          <BlockedBanner
            isBlocked={isBlocked}
            isBlockedByOther={isBlockedByOther}
            blockLoading={blockLoading}
            onUnblock={handleUnblock}
          />
        </div>
      </main>

      {showSettings && (
        <OverlayModal open={showSettings} onClose={() => setShowSettings(false)} scrollRef={settingsScrollRef}>
          <SettingsPage onClose={() => setShowSettings(false)} scrollRef={settingsScrollRef} />
        </OverlayModal>
      )}

      {showEllipsis && (
        <OverlayModal open={showEllipsis} onClose={() => setShowEllipsis(false)}>
          <EllipsisPage onClose={() => setShowEllipsis(false)} profileId={profileId} displayName={displayName} userListings={userListings} />
        </OverlayModal>
      )}

      {showRatings && (
        <OverlayModal open={showRatings} onClose={() => setShowRatings(false)}>
          <RatingsPage onClose={() => setShowRatings(false)} profileId={profileId} displayName={displayName} />
        </OverlayModal>
      )}

      <CompleteProfileModal open={showConvComplete} onClose={() => setShowConvComplete(false)} />
    </div>
  );
}
