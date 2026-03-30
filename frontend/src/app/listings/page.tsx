"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronRight, X, SlidersHorizontal } from "lucide-react";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import { categories, toCategoryKey } from "@/lib/categories";
import ListingsGrid from "@/components/listings/ListingsGrid";
import { Spinner } from "@/components/ui/Spinner";
import AdBanner from "@/components/AdBanner";

const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// ── Inner component (needs useSearchParams inside Suspense) ──────────────────
function ListingsContent({ username }: { username?: string }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") ?? "");
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get("subcategory") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [serviceType, setServiceType] = useState(searchParams.get("type") ?? "all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    searchParams.get("category") ? [searchParams.get("category")!] : []
  );
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounced values — prevent API call on every keystroke/drag
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedLocation, setDebouncedLocation] = useState(location);
  const [debouncedPrice, setDebouncedPrice] = useState<[number, number]>(priceRange);

  // Sync all filters from URL when CategoryNav or header search navigates here
  const urlSearch = searchParams.get("search") ?? "";
  const urlCategory = searchParams.get("category") ?? "";
  const urlSubcategory = searchParams.get("subcategory") ?? "";
  const urlType = searchParams.get("type") ?? "all";
  useEffect(() => {
    setSearch(urlSearch);
    setDebouncedSearch(urlSearch);
  }, [urlSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelectedCategory(urlCategory);
    setSelectedSubcategory(urlSubcategory);
    if (urlCategory) setExpandedCategories([urlCategory]);
  }, [urlCategory, urlSubcategory]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setServiceType(urlType);
  }, [urlType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocation(location), 400);
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPrice(priceRange), 300);
    return () => clearTimeout(timer);
  }, [priceRange]);

  const toggleExpand = (name: string) =>
    setExpandedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );

  const selectCategory = (name: string) => {
    setSelectedCategory(name);
    setSelectedSubcategory("");
  };

  const selectSubcategory = (cat: string, sub: string) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(sub);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setLocation("");
    setPriceRange([0, 1000]);
    setServiceType("all");
    setExpandedCategories([]);
  };

  const activeChips = [
    debouncedSearch && { label: `"${debouncedSearch}"`, clear: () => setSearch("") },
    selectedCategory && !selectedSubcategory && { label: t(`categories.${toKey(selectedCategory)}`, { defaultValue: selectedCategory }), clear: () => setSelectedCategory("") },
    selectedSubcategory && { label: t(`categories.${toKey(selectedCategory)}_${toKey(selectedSubcategory)}`, { defaultValue: selectedSubcategory }), clear: () => setSelectedSubcategory("") },
    debouncedLocation && { label: ` ${debouncedLocation}`, clear: () => setLocation("") },
    serviceType !== "all" && { label: serviceType === "offer" ? t("listings.offering") : t("listings.looking"), clear: () => setServiceType("all") },
    (debouncedPrice[0] > 0 || debouncedPrice[1] < 1000) && {
      label: `$${debouncedPrice[0]}–$${debouncedPrice[1] >= 1000 ? "1000+" : debouncedPrice[1]}`,
      clear: () => setPriceRange([0, 1000]),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div className="max-w-7xl mx-auto p-5">
      {/* ── Mobile filter toggle ── */}
      <div className="flex items-center gap-2 mb-4 lg:hidden">
        <button
          onClick={() => setShowMobileFilters((v) => !v)}
          className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("listings.filters")}
          {activeChips.length > 0 && (
            <span className="ml-1 bg-green-700 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {activeChips.length}
            </span>
          )}
        </button>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 flex-1 min-w-0">
            {activeChips.map(({ label, clear }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 bg-green-50 text-green-800 text-xs px-3 py-1 rounded-full border border-green-200"
              >
                {label}
                <button onClick={clear} className="cursor-pointer ml-1 hover:text-green-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Filter sidebar ── */}
        <aside className={`w-full lg:w-1/4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${showMobileFilters ? "block" : "hidden"} lg:block`}>
          <div className="border border-gray-200 rounded-xl p-4 space-y-5">
            {/* Mobile close button */}
            <div className="flex items-center justify-between lg:hidden">
              <span className="text-sm font-semibold text-gray-900">{t("listings.filters")}</span>
              <button onClick={() => setShowMobileFilters(false)} className="cursor-pointer p-1 rounded hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Clear all */}
            {activeChips.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {activeChips.length > 1
                    ? t("listings.filtersActivePlural", { count: activeChips.length })
                    : t("listings.filtersActive", { count: activeChips.length })}
                </span>
                <button onClick={clearFilters} className="cursor-pointer text-xs text-green-700 underline hover:text-green-800">
                  {t("listings.clearAll")}
                </button>
              </div>
            )}

            {/* Type */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t("listings.type")}</h3>
              <div className="flex gap-2">
                {[
                  { value: "all", label: t("listings.all") },
                  { value: "offer", label: t("listings.offering") },
                  { value: "looking", label: t("listings.looking") },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setServiceType(value)}
                    className={`cursor-pointer flex-1 text-xs px-2 py-2 rounded-lg border transition-colors ${
                      serviceType === value
                        ? "border-green-700 bg-green-50 text-green-800 font-semibold"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t("listings.category")}</h3>
                {selectedCategory && (
                  <button
                    onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); }}
                    className="cursor-pointer text-xs text-green-700 underline"
                  >
                    {t("listings.clear")}
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.name && !selectedSubcategory;
                  const isExpanded = expandedCategories.includes(cat.name);
                  return (
                    <div key={cat.name}>
                      <div
                        className={`flex items-center rounded-lg text-sm transition-colors ${
                          isSelected ? "bg-green-50 text-green-800" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {/* Category name — selects the filter */}
                        <button
                          onClick={() => selectCategory(cat.name)}
                          className={`cursor-pointer flex-1 text-left py-2 pl-2 font-${isSelected ? "semibold" : "normal"}`}
                        >
                          {t(`categories.${toKey(cat.name)}`, { defaultValue: cat.name })}
                        </button>
                        {/* Arrow — only expands/collapses subcategories */}
                        <button
                          onClick={() => toggleExpand(cat.name)}
                          className="cursor-pointer p-2 shrink-0 text-gray-400 hover:text-gray-700"
                          aria-label={isExpanded ? "Réduire" : "Développer"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="ml-3 pl-3 border-l-2 border-gray-100 space-y-0.5 mb-1">
                          {cat.subcategories?.map((sub) => (
                            <button
                              key={sub}
                              onClick={() => selectSubcategory(cat.name, sub)}
                              className={`cursor-pointer block w-full text-left py-1.5 px-2 rounded text-xs transition-colors ${
                                selectedSubcategory === sub
                                  ? "text-green-800 bg-green-50 font-semibold"
                                  : "text-gray-600 hover:text-green-700 hover:bg-green-50"
                              }`}
                            >
                              {t(`categories.${toKey(cat.name)}_${toKey(sub)}`, { defaultValue: sub })}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t("listings.location")}</h3>
              <CityAutocomplete
                value={location}
                onChange={setLocation}
                placeholder={t("listings.cityOrArea")}
              />
            </div>

            {/* Price range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t("listings.price")}</h3>
                <span className="text-xs font-medium text-green-700">
                  ${priceRange[0]} – {priceRange[1] >= 1000 ? "$1000+" : `$${priceRange[1]}`}
                </span>
              </div>
              <Slider
                value={priceRange}
                onValueChange={(v) => setPriceRange(v as [number, number])}
                max={1000}
                step={5}
                className="w-full [&_[data-slot=slider-track]]:bg-gray-300 [&_[data-slot=slider-range]]:bg-green-700 [&_[data-slot=slider-thumb]]:border-green-800 [&_[data-slot=slider-thumb]]:bg-white cursor-pointer"
              />
            </div>

            {/* Ad in sidebar */}
            <AdBanner slot="LISTINGS_SIDEBAR_SLOT" format="rectangle" style={{ minHeight: 250 }} />
          </div>
        </aside>

        {/* ── Results ── */}
        <div className="w-full lg:w-3/4 space-y-4">

          {/* Active filter chips — hidden on mobile (shown in the top bar instead) */}
          {activeChips.length > 0 && (
            <div className="hidden lg:flex flex-wrap gap-2">
              {activeChips.map(({ label, clear }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 bg-green-50 text-green-800 text-xs px-3 py-1 rounded-full border border-green-200"
                >
                  {label}
                  <button onClick={clear} className="cursor-pointer ml-1 hover:text-green-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <ListingsGrid
            filters={{
              search: debouncedSearch,
              category: selectedCategory,
              subcategory: selectedSubcategory,
              location: debouncedLocation,
              minPrice: debouncedPrice[0],
              maxPrice: debouncedPrice[1],
              serviceType,
              username,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper ─────────────────────────────────────────────────────────────
export default function ListingsPage({ username }: { username?: string }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white min-h-screen text-black">
      {/* Ad banner */}
      <div className="bg-gray-200 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-center">
            <AdBanner slot="LISTINGS_BANNER_SLOT" format="horizontal" style={{ minHeight: 70, width: "100%" }} />
          </div>
        </div>
      </div>

      <main>
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto p-5 flex justify-center py-16">
              <Spinner size="md" />
            </div>
          }
        >
          <ListingsContent username={username} />
        </Suspense>
      </main>
    </div>
  );
}
