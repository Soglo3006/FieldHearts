"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { Grid3x3, MapPin, ArrowLeft, Clock } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import AppImage from "@/components/ui/AppImage";
import { useTranslation } from "react-i18next";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { formatListingPriceLine } from "@/lib/listingPrice";
import { formatListingCategoryLine } from "@/lib/listingTags";
import { ListingCardSubtitle, ListingCardPriceRow } from "@/components/listings/ListingTrustLine";

interface Service extends ServiceLikeWithI18n {
  id: string;
  type: "offer" | "looking";
  title: string;
  price: string | number | null;
  pricing_mode?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean;
  category: string | null;
  category_name?: string | null;
  subcategory: string | null;
  listing_tags?: unknown;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at?: string;
  owner_name: string;
  completed_bookings_count?: number | string | null;
  review_count?: number | string | null;
  average_rating?: number | string | null;
}

function formatRelativeDate(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 5) return t("home.justNow");
    if (minutes < 60) return t("home.minutesAgo", { minutes });
    if (hours < 24) return t("home.hoursAgo", { hours });
    if (days === 1) return t("home.yesterday");
    if (days < 7) return t("home.daysAgo", { count: days });
    if (days < 30) return t("home.weeksAgo", { count: Math.floor(days / 7) });
    return t("home.monthsAgo", { count: Math.floor(days / 30) });
  } catch {
    return t("home.recently");
  }
}

export default function UserListingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const [listings, setListings] = useState<Service[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [blockResolved, setBlockResolved] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);

  useEffect(() => {
    if (!id || authLoading) return;

    if (!user || user.id === id) {
      setBlockedByMe(false);
      setBlockedByOther(false);
      setBlockResolved(true);
      return;
    }

    let cancelled = false;
    setBlockResolved(false);
    setBlockedByMe(false);
    setBlockedByOther(false);
    (async () => {
      const [{ data: iBlocked }, { data: theyBlocked }] = await Promise.all([
        supabase
          .from("blocked_users")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_user_id", id)
          .maybeSingle(),
        supabase
          .from("blocked_users")
          .select("id")
          .eq("blocker_id", id)
          .eq("blocked_user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setBlockedByMe(!!iBlocked);
      setBlockedByOther(!!theyBlocked);
      setBlockResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

  useEffect(() => {
    if (!blockResolved || !user || user.id === id || !blockedByMe) return;
    router.replace(`/profile/${id}`);
  }, [blockResolved, blockedByMe, user, id, router]);

  useEffect(() => {
    if (!blockResolved || !user || user.id === id || !blockedByOther) return;
    router.replace(`/profile/${id}`);
  }, [blockResolved, blockedByOther, user, id, router]);

  useEffect(() => {
    if (!id) return;
    const guestOrOwner = !user || user.id === id;
    if (!guestOrOwner && !blockResolved) return;
    if (user && user.id !== id && blockedByMe) return;
    if (user && user.id !== id && blockedByOther) return;

    setLoading(true);
    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/user/${id}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setListings(data);
          if (data.length > 0) setOwnerName(data[0].owner_name ?? "");
        } else {
          setListings([]);
          setOwnerName("");
        }
      })
      .catch(() => {
        setListings([]);
        setOwnerName("");
      })
      .finally(() => setLoading(false));
  }, [id, blockResolved, user, blockedByMe, blockedByOther, session?.access_token]);

  const viewingOtherWhileLoggedIn = Boolean(user && id && user.id !== id);
  const blockPending = viewingOtherWhileLoggedIn && !blockResolved;
  const redirecting = Boolean(
    blockResolved && user && id && user.id !== id && (blockedByMe || blockedByOther),
  );

  if (authLoading || blockPending || redirecting) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/profile/${id}`} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {loading && !ownerName ? (
            <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">
              {ownerName ? `${ownerName} · ${t("profile.listings")}` : t("profile.listings")}
            </h1>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-xl shadow-sm bg-white animate-pulse overflow-hidden">
                <div className="w-full aspect-video bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Grid3x3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">{t("profile.noListings")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((s) => {
              const thumb = s.image_urls?.[0] ?? s.image_url;
              const resolved = resolveListingTitle(s, i18n.language);
              const categoryLine = formatListingCategoryLine(
                s.category_name ?? s.category ?? null,
                s,
                t,
                " | ",
              );
              return (
                <div
                  key={s.id}
                  className="group border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link href={`/serviceDetail/${s.id}`} className="block">
                    <AspectRatio ratio={16 / 9}>
                      <div className="relative h-full w-full">
                        <ListingLangPills service={s} />
                        {thumb ? (
                          <AppImage
                            src={thumb}
                            alt={resolved}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Grid3x3 className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </AspectRatio>
                  </Link>

                  <Link href={`/serviceDetail/${s.id}`} className="flex flex-col flex-1 p-3 text-left outline-none">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 group-hover:text-green-700 transition-colors text-sm">
                        {resolved}
                      </h3>
                      {s.type === "looking" ? (
                        <Badge className="shrink-0 border-0 bg-blue-100 text-xs text-blue-700">
                          {t("listings.looking")}
                        </Badge>
                      ) : (
                        <Badge className="shrink-0 border-0 bg-green-100 text-xs text-green-700">
                          {t("listings.offering")}
                        </Badge>
                      )}
                    </div>

                    <ListingCardSubtitle
                      categoryLine={categoryLine || null}
                      reviewCount={s.review_count}
                      averageRating={s.average_rating}
                    />

                    <ListingCardPriceRow
                      price={formatListingPriceLine(t, s)}
                      completedBookingsCount={s.completed_bookings_count}
                      listingType={s.type === "looking" ? "looking" : s.type === "offer" ? "offer" : undefined}
                    />

                    <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
                      </div>
                      {s.created_at && (
                        <div className="ml-2 flex shrink-0 items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeDate(s.created_at, t)}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
