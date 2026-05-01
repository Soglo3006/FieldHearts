"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { MapPin, Clock, Grid3x3 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdBanner from "@/components/AdBanner";
import { formatTranslatedCategoryTrail, categories, toCategoryKey } from "@/lib/categories";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { ListingsRegionEmptyState } from "@/components/listings/ListingsRegionEmptyState";
import { ListingCardImageCarousel, getListingGalleryUrls } from "@/components/listings/ListingCardImageCarousel";
import { ListingTrustLine } from "@/components/listings/ListingTrustLine";
import { formatListingPriceLine } from "@/lib/listingPrice";

interface ApiService {
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
  created_at: string;
  image_url: string | null;
  image_urls?: string[] | null;
  category_name: string | null;
  subcategory: string | null;
  type?: string;
  translations?: ServiceLikeWithI18n["translations"];
  language?: string | null;
  review_count?: number | string | null;
  average_rating?: number | string | null;
  completed_bookings_count?: number | string | null;
}

interface PaginatedListingsResponse {
  data?: ApiService[];
  total?: number;
}

export interface ListingsFilters {
  search?: string;
  categories?: string[];
  subcategories?: string[];
  category?: string;
  subcategory?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  serviceType?: string;
  username?: string;
  spokenLanguage?: string;
}

function hasRestrictiveFilters(f?: ListingsFilters): boolean {
  if (!f) return false;
  return Boolean(
    f.search?.trim() ||
      (f.categories?.length ?? 0) > 0 ||
      (f.subcategories?.length ?? 0) > 0 ||
      f.location?.trim() ||
      (f.serviceType && f.serviceType !== "all") ||
      f.spokenLanguage ||
      (f.minPrice != null && f.minPrice > 0) ||
      (f.maxPrice != null && f.maxPrice < 1000) ||
      f.username
  );
}

function formatRelativeDate(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 5) return t("home.justNow");
    if (minutes < 60) return t("home.minutesAgo", { minutes });
    if (hours < 24) return t("home.hoursAgo", { hours });
    if (days === 1) return t("home.yesterday");
    if (days < 7) return t("home.daysAgo", { days });
    return t("home.weeksAgo", { weeks: Math.floor(days / 7) });
  } catch {
    return t("home.recently");
  }
}

const LISTINGS_PER_PAGE = 12;
const AD_INTERVAL = 8; // insert ad every N cards

function normalizeListingsResponse(
  payload: unknown,
  currentPage: number,
  pageSize: number
): { data: ApiService[]; total: number } {
  if (Array.isArray(payload)) {
    const startIndex = (currentPage - 1) * pageSize;

    return {
      data: payload.slice(startIndex, startIndex + pageSize),
      total: payload.length,
    };
  }

  const response = (payload ?? {}) as PaginatedListingsResponse;
  const data = Array.isArray(response.data) ? response.data : [];

  return {
    data,
    total: typeof response.total === "number" ? response.total : data.length,
  };
}

export default function ListingsGrid({ filters }: { filters?: ListingsFilters }) {
  const { t, i18n } = useTranslation();
  const [listings, setListings] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalListings, setTotalListings] = useState(0);
  const gridTopRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters?.search,
    filters?.categories,
    filters?.subcategories,
    filters?.category,
    filters?.subcategory,
    filters?.location,
    filters?.minPrice,
    filters?.maxPrice,
    filters?.serviceType,
    filters?.username,
    filters?.spokenLanguage,
  ]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    const fetchListings = async () => {
      try {
        const params = new URLSearchParams();
        if (filters?.search)                               params.set("search", filters.search);
        if (filters?.categories?.length)                   params.set("categoryName", filters.categories.join(","));
        else if (filters?.category)                        params.set("categoryName", filters.category);
        if (filters?.subcategories?.length)                params.set("subcategory", filters.subcategories.join(","));
        else if (filters?.subcategory)                     params.set("subcategory", filters.subcategory);
        if (filters?.location)                             params.set("location", filters.location);
        if (filters?.minPrice && filters.minPrice > 0)     params.set("minPrice", String(filters.minPrice));
        if (filters?.maxPrice && filters.maxPrice < 1000)  params.set("maxPrice", String(filters.maxPrice));
        if (filters?.serviceType && filters.serviceType !== "all") params.set("type", filters.serviceType);
        if (filters?.username)                                      params.set("username", filters.username);
        if (filters?.spokenLanguage)                               params.set("spokenLanguage", filters.spokenLanguage);
        params.set("page", String(currentPage));
        params.set("limit", String(LISTINGS_PER_PAGE));

        const url = `${process.env.NEXT_PUBLIC_API_URL}/services?${params.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          const normalized = normalizeListingsResponse(json, currentPage, LISTINGS_PER_PAGE);
          setListings(normalized.data);
          setTotalListings(normalized.total);
        } else {
          setListings([]);
          setTotalListings(0);
        }
        setLoading(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setListings([]);
          setTotalListings(0);
          setLoading(false);
        }
      }
    };

    fetchListings();
    return () => controller.abort();
  }, [
    currentPage,
    filters?.search,
    filters?.categories,
    filters?.subcategories,
    filters?.category,
    filters?.subcategory,
    filters?.location,
    filters?.minPrice,
    filters?.maxPrice,
    filters?.serviceType,
    filters?.username,
    filters?.spokenLanguage,
  ]);

  const totalPages = Math.ceil(totalListings / LISTINGS_PER_PAGE);
  const currentListings = listings;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div ref={gridTopRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    );
  }

  if (listings.length === 0) {
    return (
      <div ref={gridTopRef} className="w-full flex justify-center py-6 sm:py-8">
        <ListingsRegionEmptyState
          locationLabel={filters?.location ?? ""}
          footerHint={hasRestrictiveFilters(filters) ? t("listings.adjustFilters") : undefined}
          className="max-w-md"
        />
      </div>
    );
  }

  // Build rows interleaved with ad placeholders
  const items: Array<{ type: "listing"; data: ApiService } | { type: "ad"; key: number }> = [];
  currentListings.forEach((listing, index) => {
    items.push({ type: "listing", data: listing });
    if ((index + 1) % AD_INTERVAL === 0 && index !== currentListings.length - 1) {
      items.push({ type: "ad", key: index });
    }
  });

  return (
    <div className="space-y-6" ref={gridTopRef}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          if (item.type === "ad") {
            return (
              <div key={`ad-${item.key}`} className="sm:col-span-2 lg:col-span-3">
                <AdBanner slot="LISTINGS_GRID_AD_SLOT" format="horizontal" style={{ minHeight: 90 }} />
              </div>
            );
          }

          const s = item.data;
          const cardIndex = currentListings.findIndex((x) => x.id === s.id);
          const detailHref = `/serviceDetail/${s.id}`;
          const galleryUrls = getListingGalleryUrls(s.image_urls, s.image_url);
          return (
            <div key={s.id} className="group flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
              <AspectRatio ratio={16 / 9}>
                {galleryUrls.length > 0 ? (
                  <div className="relative w-full h-full">
                    <ListingLangPills service={s} />
                    <ListingCardImageCarousel
                      urls={galleryUrls}
                      alt={resolveListingTitle(s, i18n.language)}
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      priority={cardIndex < 3}
                    />
                    <Link
                      href={detailHref}
                      className="absolute inset-0 z-5 outline-none hidden sm:block"
                      aria-label={resolveListingTitle(s, i18n.language)}
                    />
                  </div>
                ) : (
                  <Link
                    href={detailHref}
                    className="flex h-full w-full items-center justify-center bg-gray-100 outline-none"
                    aria-label={resolveListingTitle(s, i18n.language)}
                  >
                    <Grid3x3 className="h-10 w-10 text-gray-300" />
                  </Link>
                )}
              </AspectRatio>

              <Link href={detailHref} className="flex flex-col flex-1 p-3 text-left outline-none">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 group-hover:text-green-700 transition-colors text-sm">
                      {resolveListingTitle(s, i18n.language)}
                    </h3>
                    {s.type === "looking" ? (
                      <Badge className="shrink-0 border-0 bg-blue-100 text-xs text-blue-700">{t("listings.looking")}</Badge>
                    ) : (
                      <Badge className="shrink-0 border-0 bg-green-100 text-xs text-green-700">{t("listings.offering")}</Badge>
                    )}
                  </div>
                  <ListingTrustLine
                    reviewCount={s.review_count}
                    averageRating={s.average_rating}
                    completedBookingsCount={s.completed_bookings_count}
                    className="mb-1"
                  />

                  {(s.category_name || s.subcategory) && (
                    <p className="text-xs text-gray-400 mb-1 line-clamp-1">
                      {formatTranslatedCategoryTrail(s.category_name, s.subcategory, t)}
                    </p>
                  )}

                  <p className="text-green-700 font-bold text-base mb-2">{formatListingPriceLine(t, s)}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeDate(s.created_at, t)}</span>
                    </div>
                  </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="px-3">
            <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            const page = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage + i - 3;
            if (page < 1 || page > totalPages) return null;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={`px-4 ${currentPage === page ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              >
                {page}
              </Button>
            );
          })}

          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="px-3">
            <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
