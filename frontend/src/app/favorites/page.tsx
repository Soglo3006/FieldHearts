"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Grid3x3, HeartOff } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/contexts/AuthContext";
import { type ServiceLikeWithI18n, resolveListingTitle } from "@/lib/serviceListingI18n";
import { formatListingPriceLine } from "@/lib/listingPrice";
import { formatListingCategoryLine } from "@/lib/listingTags";
import BookingSectionPagination from "@/components/bookings/BookingSectionPagination";
import { ListingCardImageCarousel, getListingGalleryUrls } from "@/components/listings/ListingCardImageCarousel";
import { ListingCardSubtitle, ListingCardPriceRow, ListingCardTitle } from "@/components/listings/ListingTrustLine";
import ListingLocationLine from "@/components/listings/ListingLocationLine";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { cn } from "@/lib/utils";

const FAVORITES_PAGE_SIZE = 6;

interface FavoriteService extends ServiceLikeWithI18n {
  id: string;
  type?: "offer" | "looking" | string | null;
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
  completed_bookings_count?: number | string | null;
  review_count?: number | string | null;
  average_rating?: number | string | null;
}

export default function FavoritesPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, session } = useAuth();
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
                    type: data.type ?? null,
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
                    completed_bookings_count: data.completed_bookings_count ?? null,
                    review_count: data.review_count ?? null,
                    average_rating: data.average_rating ?? null,
                  });
                }
              } catch {}
            }),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("favorites.title")}</h1>
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
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("favorites.title")}</h1>

        {items.length === 0 ? (
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
              {pagedItems.map((s) => {
                const detailHref = `/serviceDetail/${s.id}`;
                const galleryUrls = getListingGalleryUrls(s.image_urls, s.image_url);
                const displayTitle = resolveListingTitle(s, i18n.language);
                const categoryLine = formatListingCategoryLine(s.category_name, s, t, " | ");
                return (
                  <div
                    key={s.id}
                    className="group flex h-full flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow"
                  >
                    <AspectRatio ratio={16 / 9}>
                      {galleryUrls.length > 0 ? (
                        <div
                          className="relative w-full h-full cursor-pointer"
                          onClick={() => router.push(detailHref)}
                        >
                          <ListingLangPills service={s} />
                          <ListingCardImageCarousel
                            urls={galleryUrls}
                            alt={displayTitle}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <Link
                            href={detailHref}
                            className="absolute inset-0 z-5 outline-none hidden sm:block"
                            aria-label={displayTitle}
                          />
                        </div>
                      ) : (
                        <div className="relative h-full w-full">
                          <ListingLangPills service={s} />
                          <Link
                            href={detailHref}
                            className="flex h-full w-full items-center justify-center bg-gray-100 outline-none"
                            aria-label={displayTitle}
                          >
                            <Grid3x3 className="h-10 w-10 text-gray-300" />
                          </Link>
                        </div>
                      )}
                    </AspectRatio>

                    <div className="flex flex-col flex-1 p-3">
                      <Link href={detailHref} className="flex flex-col flex-1 text-left outline-none">
                        <div className="flex items-start gap-2 mb-1">
                          <ListingCardTitle
                            title={displayTitle}
                            className="group-hover:text-green-700 transition-colors"
                          />
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
                        <ListingLocationLine service={s} />
                      </Link>

                      <div className="mt-auto pt-3 border-t border-gray-100">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 text-red-600 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600"
                          onClick={() => remove(s.id)}
                        >
                          <HeartOff className="h-3.5 w-3.5" />
                          {t("favorites.remove")}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
