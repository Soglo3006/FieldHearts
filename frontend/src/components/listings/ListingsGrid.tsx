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
import AppImage from "@/components/ui/AppImage";
import { formatTranslatedCategoryTrail, categories, toCategoryKey } from "@/lib/categories";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";

interface ApiService {
  id: string;
  title: string;
  price: number;
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
      <div ref={gridTopRef} className="text-center py-16 text-gray-500">
        <Grid3x3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium text-gray-700">{t("common.noResults")}</p>
        <p className="text-sm mt-1">{t("listings.adjustFilters")}</p>
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
          const cardIndex = items.slice(0, items.indexOf(item)).filter(i => i.type === "listing").length;
          return (
            <Link key={s.id} href={`/serviceDetail/${s.id}`} className="block group">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow flex flex-col">
                <AspectRatio ratio={16 / 9}>
                  {(() => {
                    const thumb = s.image_urls?.[0] ?? s.image_url;
                    const extra = (s.image_urls?.length ?? 0) > 1 ? s.image_urls!.length : 0;
                    return thumb ? (
                      <div className="relative w-full h-full">
                        <ListingLangPills service={s} />
                        <AppImage src={thumb} alt={resolveListingTitle(s, i18n.language)} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover" priority={cardIndex < 3} loading={cardIndex < 3 ? undefined : "lazy"} />
                        {extra > 1 && (
                          <span className="absolute bottom-1.5 right-1.5 bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            +{extra - 1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Grid3x3 className="h-10 w-10 text-gray-300" />
                      </div>
                    );
                  })()}
                </AspectRatio>

                <div className="p-3 flex flex-col flex-1">
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

                  {(s.category_name || s.subcategory) && (
                    <p className="text-xs text-gray-400 mb-1 line-clamp-1">
                      {formatTranslatedCategoryTrail(s.category_name, s.subcategory, t)}
                    </p>
                  )}

                  <p className="text-green-700 font-bold text-base mb-2">{Number(s.price).toFixed(2)} $</p>

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
                </div>
              </div>
            </Link>
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
