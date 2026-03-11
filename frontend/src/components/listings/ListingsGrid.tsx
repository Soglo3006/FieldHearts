"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { MapPin, Clock, Grid3x3 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ApiService {
  id: string;
  title: string;
  price: number;
  location: string;
  created_at: string;
  image_url: string | null;
  category_name: string | null;
  subcategory: string | null;
  type?: string;
}

export interface ListingsFilters {
  search?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  serviceType?: string;
  username?: string;
}

function formatRelativeDate(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t("home.today");
    if (days === 1) return t("home.yesterday");
    if (days < 7) return t("home.daysAgo", { days });
    return t("home.weeksAgo", { weeks: Math.floor(days / 7) });
  } catch {
    return t("home.recently");
  }
}

const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const LISTINGS_PER_PAGE = 12;
const AD_INTERVAL = 8; // insert ad every N cards

export default function ListingsGrid({ filters }: { filters?: ListingsFilters }) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const gridTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
    setLoading(true);
    const controller = new AbortController();

    const fetchListings = async () => {
      try {
        const params = new URLSearchParams();
        if (filters?.search)                               params.set("search", filters.search);
        if (filters?.category)                             params.set("categoryName", filters.category);
        if (filters?.subcategory)                          params.set("subcategory", filters.subcategory);
        if (filters?.location)                             params.set("location", filters.location);
        if (filters?.minPrice && filters.minPrice > 0)     params.set("minPrice", String(filters.minPrice));
        if (filters?.maxPrice && filters.maxPrice < 1000)  params.set("maxPrice", String(filters.maxPrice));
        if (filters?.serviceType && filters.serviceType !== "all") params.set("type", filters.serviceType);
        if (filters?.username)                                      params.set("username", filters.username);

        const query = params.toString();
        const url = `${process.env.NEXT_PUBLIC_API_URL}/services${query ? `?${query}` : ""}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = res.ok ? await res.json() : [];
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setListings([]);
          setLoading(false);
        }
      }
    };

    fetchListings();
    return () => controller.abort();
  }, [
    filters?.search,
    filters?.category,
    filters?.subcategory,
    filters?.location,
    filters?.minPrice,
    filters?.maxPrice,
    filters?.serviceType,
    filters?.username,
  ]);

  const totalPages = Math.ceil(listings.length / LISTINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LISTINGS_PER_PAGE;
  const currentListings = listings.slice(startIndex, startIndex + LISTINGS_PER_PAGE);

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
              <div
                key={`ad-${item.key}`}
                className="sm:col-span-2 lg:col-span-3 bg-gray-100 rounded-xl p-6 flex items-center justify-center border border-gray-200 h-24"
              >
                <span className="text-gray-400 text-sm font-medium">{t("listings.adPlaceholder")}</span>
              </div>
            );
          }

          const s = item.data;
          return (
            <Link key={s.id} href={`/serviceDetail/${s.id}`} className="block group">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow flex flex-col">
                <AspectRatio ratio={16 / 9}>
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Grid3x3 className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </AspectRatio>

                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 group-hover:text-green-700 transition-colors text-sm">
                      {s.title}
                    </h3>
                    {s.type === "looking" && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs flex-shrink-0 border-0">{t("listings.looking")}</Badge>
                    )}
                  </div>

                  {(s.category_name || s.subcategory) && (
                    <p className="text-xs text-gray-400 mb-1 line-clamp-1">
                      {[
                        s.category_name ? t(`categories.${toKey(s.category_name)}`, { defaultValue: s.category_name }) : null,
                        s.subcategory ? t(`categories.${toKey(s.category_name ?? "")}_${toKey(s.subcategory)}`, { defaultValue: s.subcategory }) : null,
                      ].filter(Boolean).join(" | ")}
                    </p>
                  )}

                  <p className="text-green-700 font-bold text-base mb-2">${Number(s.price).toLocaleString()}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{s.location}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
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
