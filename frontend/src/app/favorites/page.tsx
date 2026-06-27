"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Grid3x3, MapPin, HeartOff } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AppImage from "@/components/ui/AppImage";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import { formatListingPriceLine } from "@/lib/listingPrice";
import ProfileCompletionRequiredScreen from "@/components/profile/ProfileCompletionRequiredScreen";
import { useMyProfile } from "@/hooks/useMyProfile";
import { isProfileDetailsIncomplete } from "@/lib/onboardingSteps";
import BookingSectionPagination from "@/components/bookings/BookingSectionPagination";
import { cn } from "@/lib/utils";

const FAVORITES_PAGE_SIZE = 4;

interface FavoriteService extends Pick<ServiceLikeWithI18n, "language" | "translations"> {
  id: string;
  title: string;
  price: number | null;
  pricing_mode?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean;
  category_name: string | null;
  subcategory: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
}

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const { profile, loading: profileLoading } = useMyProfile();
  const [items, setItems] = useState<FavoriteService[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [slideDir, setSlideDir] = useState<"prev" | "next">("next");

  const token = session?.access_token;
  const totalPages = Math.max(1, Math.ceil(items.length / FAVORITES_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = items.slice(
    (safePage - 1) * FAVORITES_PAGE_SIZE,
    safePage * FAVORITES_PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const changePage = (next: number) => {
    setPage((current) => {
      if (next === current) return current;
      setSlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (user && token) {
        // Authenticated: fetch from backend
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setItems(data);
          }
        } catch {}
      } else {
        // Guest: load from localStorage then fetch details
        try {
          const raw = localStorage.getItem("savedListings");
          const ids: string[] = raw ? JSON.parse(raw) : [];
          if (!ids.length) {
            setItems([]);
            setLoading(false);
            return;
          }
          const results: FavoriteService[] = [];
          await Promise.all(
            ids.map(async (id) => {
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}`);
                if (res.ok) {
                  const data = await res.json();
                  results.push({
                    id: data.id,
                    title: data.title,
                    price: data.price != null && data.price !== "" ? Number(data.price) : null,
                    pricing_mode: data.pricing_mode ?? null,
                    price_min: data.price_min ?? null,
                    price_max: data.price_max ?? null,
                    location: data.location,
                    address: data.address ?? null,
                    city: data.city ?? null,
                    hide_exact_location: data.hide_exact_location ?? false,
                    category_name: data.category_name ?? data.category ?? null,
                    subcategory: data.subcategory ?? null,
                    image_url: data.image_url ?? null,
                    image_urls: data.image_urls ?? null,
                    language: data.language ?? null,
                    translations: data.translations ?? null,
                  });
                }
              } catch {}
            })
          );
          setItems(results);
        } catch {}
      }
      setLoading(false);
    };
    load();
  }, [user?.id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (user && token) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } else {
      try {
        const raw = localStorage.getItem("savedListings");
        const arr: string[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem("savedListings", JSON.stringify(arr.filter((x) => x !== id)));
      } catch {}
    }
  };

  if (user && profileLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <p className="text-gray-500">{t("favorites.loading")}</p>
      </div>
    );
  }

  if (user && isProfileDetailsIncomplete(profile)) {
    return <ProfileCompletionRequiredScreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("favorites.title")}</h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-xl shadow-sm bg-white animate-pulse overflow-hidden">
                <div className="w-full aspect-video bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Grid3x3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">{t("favorites.noFavorites")}</p>
            <Link href="/listings" className="text-sm text-green-700 hover:underline mt-2 inline-block">
              {t("favorites.browseListings")}
            </Link>
          </div>
        ) : (
          <>
            <div
              key={safePage}
              className={cn(
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                "animate-in fade-in-0 duration-300 ease-out",
                slideDir === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
              )}
            >
              {pagedItems.map((s) => (
              <div key={s.id} className="border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden hover:shadow-lg transition-all">
                <Link href={`/serviceDetail/${s.id}`} className="block">
                  <AspectRatio ratio={16 / 9}>
                    {s.image_url ? (
                      <AppImage src={s.image_url} alt={s.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Grid3x3 className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </AspectRatio>
                </Link>

                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/serviceDetail/${s.id}`} className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 hover:text-green-700 transition-colors">
                      {s.title}
                    </h3>
                  </Link>

                  <p className="text-green-700 font-bold text-lg mb-2">{formatListingPriceLine(t, s)}</p>

                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="h-4 w-4 mr-1 shrink-0" />
                    <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
                  </div>

                  {s.category_name && (
                    <p className="text-xs text-gray-500 line-clamp-1 mb-3">
                      {s.category_name}{s.subcategory && ` • ${s.subcategory}`}
                    </p>
                  )}

                  <div className="mt-auto pt-3 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                      onClick={() => remove(s.id)}
                    >
                      <HeartOff className="h-3.5 w-3.5" />
                      {t("favorites.remove")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            </div>
            <BookingSectionPagination
              page={safePage}
              totalPages={totalPages}
              onPrevious={() => changePage(safePage - 1)}
              onNext={() => changePage(safePage + 1)}
            />
          </>
        )}
      </main>
    </div>
  );
}
