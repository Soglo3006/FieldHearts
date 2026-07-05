"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMapsConfig";
import { Slider } from "@/components/ui/slider";
import { ChevronRight, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import { categories } from "@/lib/categories";
import ListingsGrid from "@/components/listings/ListingsGrid";
import { Spinner } from "@/components/ui/Spinner";
import AdBanner from "@/components/AdBanner";
import {
  geocodeCanadianLocation,
  LOCATION_SEARCH_RADIUS_KM,
  shouldAutoGeocodeLocation,
  type LatLng,
} from "@/lib/geocodeCanadianLocation";


const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const FILTER_KEY_SEPARATOR = "::";

const parseFilterList = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const encodeSubcategoryFilter = (category: string, subcategory: string) => `${category}${FILTER_KEY_SEPARATOR}${subcategory}`;
const decodeSubcategoryFilter = (value: string) => {
  const [category, ...subcategoryParts] = value.split(FILTER_KEY_SEPARATOR);
  return {
    category,
    subcategory: subcategoryParts.join(FILTER_KEY_SEPARATOR),
  };
};

type FilterChipState = {
  serviceType: string;
  spokenLanguage: string;
  pricingMode: string;
  selectedCategories: string[];
  selectedSubcategories: string[];
  debouncedLocation: string;
  debouncedSearch: string;
  debouncedPrice: [number, number];
};

function collectActiveChipIds(state: FilterChipState): string[] {
  const ids: string[] = [];
  if (state.serviceType !== "all") ids.push("service-type");
  if (state.spokenLanguage) ids.push("spoken-language");
  if (state.pricingMode) ids.push("pricing-mode");
  for (const category of state.selectedCategories) ids.push(`category-${category}`);
  for (const encoded of state.selectedSubcategories) ids.push(`subcategory-${encoded}`);
  if (state.debouncedLocation.trim()) ids.push("location");
  if (state.debouncedSearch.trim()) ids.push("search");
  if (state.debouncedPrice[0] > 0 || state.debouncedPrice[1] < 1000) ids.push("price-range");
  return ids;
}

function mergeChipOrder(prev: string[], activeIds: string[]): string[] {
  const activeSet = new Set(activeIds);
  const kept = prev.filter((id) => activeSet.has(id));
  const added = activeIds.filter((id) => !prev.includes(id));
  return [...kept, ...added];
}

// ── Inner component (needs useSearchParams inside Suspense) ──────────────────
function ListingsContent({ username }: { username?: string }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialSpoken = searchParams.get("spokenLanguage") ?? "";
  const initialSpokenValid = ["french", "english", "bilingual"].includes(initialSpoken) ? initialSpoken : "";
  const initialPricing = searchParams.get("pricingMode") ?? "";
  const initialPricingValid = ["fixed", "range", "quote", "hourly"].includes(initialPricing) ? initialPricing : "";

  const initialCategories = parseFilterList(searchParams.get("category"));
  const initialSubcategories = parseFilterList(searchParams.get("subcategory")).map((subcategory) => {
    const matchingCategory = initialCategories.find((category) =>
      categories.find((cat) => cat.name === category)?.subcategories?.includes(subcategory)
    );

    return matchingCategory ? encodeSubcategoryFilter(matchingCategory, subcategory) : subcategory;
  });

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(initialSubcategories);
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const initialLat = parseFloat(searchParams.get("userLat") ?? "");
  const initialLng = parseFloat(searchParams.get("userLng") ?? "");
  const initialCoords: LatLng | null =
    !Number.isNaN(initialLat) && !Number.isNaN(initialLng)
      ? { lat: initialLat, lng: initialLng }
      : null;
  const [locationCoords, setLocationCoords] = useState<LatLng | null>(initialCoords);
  const [resolvedLocationCoords, setResolvedLocationCoords] = useState<LatLng | null>(initialCoords);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [serviceType, setServiceType] = useState(searchParams.get("type") ?? "all");
  const [spokenLanguage, setSpokenLanguage] = useState(initialSpokenValid);
  const [pricingMode, setPricingMode] = useState(initialPricingValid);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(initialCategories);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filterChipOrder, setFilterChipOrder] = useState<string[]>(() =>
    collectActiveChipIds({
      serviceType: searchParams.get("type") ?? "all",
      spokenLanguage: initialSpokenValid,
      pricingMode: initialPricingValid,
      selectedCategories: initialCategories,
      selectedSubcategories: initialSubcategories,
      debouncedLocation: searchParams.get("location") ?? "",
      debouncedSearch: searchParams.get("search") ?? "",
      debouncedPrice: [0, 1000],
    }),
  );

  const registerChip = useCallback((id: string) => {
    setFilterChipOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const unregisterChip = useCallback((id: string) => {
    setFilterChipOrder((prev) => prev.filter((chipId) => chipId !== id));
  }, []);

  // Debounced values — prevent API call on every keystroke/drag
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedLocation, setDebouncedLocation] = useState(location);
  const [debouncedPrice, setDebouncedPrice] = useState<[number, number]>(priceRange);

  const { isLoaded: mapsReady } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Sync all filters from URL when CategoryNav or header search navigates here
  const urlSearch = searchParams.get("search") ?? "";
  const urlCategoryParam = searchParams.get("category") ?? "";
  const urlSubcategoryParam = searchParams.get("subcategory") ?? "";
  const urlCategories = useMemo(() => parseFilterList(urlCategoryParam), [urlCategoryParam]);
  const urlSubcategories = useMemo(
    () =>
      parseFilterList(urlSubcategoryParam).map((subcategory) => {
        const matchingCategory = urlCategories.find((category) =>
          categories.find((cat) => cat.name === category)?.subcategories?.includes(subcategory)
        );

        return matchingCategory ? encodeSubcategoryFilter(matchingCategory, subcategory) : subcategory;
      }),
    [urlCategories, urlSubcategoryParam]
  );
  const urlType = searchParams.get("type") ?? "all";
  const spokenParam = searchParams.get("spokenLanguage") ?? "";
  const validSpoken = ["french", "english", "bilingual"].includes(spokenParam) ? spokenParam : "";
  const pricingParam = searchParams.get("pricingMode") ?? "";
  const validPricing = ["fixed", "range", "quote", "hourly"].includes(pricingParam) ? pricingParam : "";

  useEffect(() => {
    setSearch(urlSearch);
    setDebouncedSearch(urlSearch);
  }, [urlSearch]);
  useEffect(() => {
    setSelectedCategories(urlCategories);
    setSelectedSubcategories(urlSubcategories);
    if (urlCategories.length > 0) setExpandedCategories(urlCategories);
  }, [urlCategories, urlSubcategories]);
  useEffect(() => {
    setServiceType(urlType);
  }, [urlType]);
  useEffect(() => {
    setSpokenLanguage(validSpoken);
  }, [validSpoken]);
  useEffect(() => {
    setPricingMode(validPricing);
  }, [validPricing]);

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

  useEffect(() => {
    const urlLocation = searchParams.get("location") ?? "";
    const lat = parseFloat(searchParams.get("userLat") ?? "");
    const lng = parseFloat(searchParams.get("userLng") ?? "");
    const coords =
      !Number.isNaN(lat) && !Number.isNaN(lng) ? { lat, lng } : null;

    setLocation(urlLocation);
    setDebouncedLocation(urlLocation);
    setLocationCoords(coords);
    setResolvedLocationCoords(coords);
  }, [searchParams]);

  useEffect(() => {
    const trimmed = debouncedLocation.trim();
    if (!trimmed) {
      setResolvedLocationCoords(null);
      return;
    }
    if (locationCoords) {
      setResolvedLocationCoords(locationCoords);
      return;
    }

    setResolvedLocationCoords(null);

    if (!mapsReady || !shouldAutoGeocodeLocation(trimmed, false)) {
      return;
    }

    let cancelled = false;
    geocodeCanadianLocation(trimmed).then((coords) => {
      if (!cancelled) setResolvedLocationCoords(coords);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedLocation, locationCoords, mapsReady]);

  const toggleExpand = (name: string) =>
    setExpandedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );

  const clearCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((value) => value !== category));
    setFilterChipOrder((order) => order.filter((id) => id !== `category-${category}`));
  };

  const selectCategory = (name: string) => {
    const categoryId = `category-${name}`;

    if (selectedCategories.includes(name)) {
      clearCategory(name);
      return;
    }

    registerChip(categoryId);
    setSelectedCategories((prev) => [...prev, name]);
  };

  const selectSubcategory = (cat: string, sub: string) => {
    const encoded = encodeSubcategoryFilter(cat, sub);
    const subId = `subcategory-${encoded}`;
    const categoryId = `category-${cat}`;
    const isRemoving = selectedSubcategories.includes(encoded);

    if (isRemoving) {
      unregisterChip(subId);
      setSelectedSubcategories((prev) => prev.filter((value) => value !== encoded));
      return;
    }

    const categoryAlreadySelected = selectedCategories.includes(cat);

    registerChip(subId);
    if (categoryAlreadySelected) {
      registerChip(categoryId);
    }
    setSelectedSubcategories((prev) => [...prev, encoded]);
    setExpandedCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
  };

  const clearSubcategory = (encoded: string) => {
    unregisterChip(`subcategory-${encoded}`);
    setSelectedSubcategories((prev) => prev.filter((value) => value !== encoded));
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setLocation("");
    setLocationCoords(null);
    setResolvedLocationCoords(null);
    setPriceRange([0, 1000]);
    setServiceType("all");
    setSpokenLanguage("");
    setPricingMode("");
    setExpandedCategories([]);
    setFilterChipOrder([]);
  };

  const applyServiceType = (value: string) => {
    if (value === "all") unregisterChip("service-type");
    else registerChip("service-type");
    setServiceType(value);
  };

  const applySpokenLanguage = (value: string) => {
    if (!value) unregisterChip("spoken-language");
    else registerChip("spoken-language");
    setSpokenLanguage(value);
  };

  const applyPricingMode = (value: string) => {
    if (!value) unregisterChip("pricing-mode");
    else registerChip("pricing-mode");
    setPricingMode(value);
  };

  useEffect(() => {
    const activeIds = collectActiveChipIds({
      serviceType,
      spokenLanguage,
      pricingMode,
      selectedCategories,
      selectedSubcategories,
      debouncedLocation,
      debouncedSearch,
      debouncedPrice,
    });
    setFilterChipOrder((prev) => mergeChipOrder(prev, activeIds));
  }, [
    serviceType,
    spokenLanguage,
    pricingMode,
    selectedCategories,
    selectedSubcategories,
    debouncedLocation,
    debouncedSearch,
    debouncedPrice,
  ]);

  const chipById = useMemo(() => {
    const chips = new Map<string, { id: string; label: string; clear: () => void }>();

    if (serviceType !== "all") {
      chips.set("service-type", {
        id: "service-type",
        label: serviceType === "offer" ? t("listings.offering") : t("listings.looking"),
        clear: () => applyServiceType("all"),
      });
    }
    if (spokenLanguage) {
      chips.set("spoken-language", {
        id: "spoken-language",
        label:
          spokenLanguage === "french"
            ? t("post.languageFrench")
            : spokenLanguage === "english"
              ? t("post.languageEnglish")
              : t("post.languageBilingual"),
        clear: () => applySpokenLanguage(""),
      });
    }
    if (pricingMode) {
      chips.set("pricing-mode", {
        id: "pricing-mode",
        label:
          pricingMode === "fixed"
            ? t("post.pricingModeFixed")
            : pricingMode === "range"
              ? t("post.pricingModeRange")
              : pricingMode === "hourly"
                ? t("post.pricingModeHourly")
                : t("post.pricingModeQuote"),
        clear: () => applyPricingMode(""),
      });
    }
    for (const category of selectedCategories) {
      chips.set(`category-${category}`, {
        id: `category-${category}`,
        label: t(`categories.${toKey(category)}`, { defaultValue: category }),
        clear: () => clearCategory(category),
      });
    }
    for (const encoded of selectedSubcategories) {
      const { category, subcategory } = decodeSubcategoryFilter(encoded);
      chips.set(`subcategory-${encoded}`, {
        id: `subcategory-${encoded}`,
        label: t(`categories.${toKey(category)}_${toKey(subcategory)}`, { defaultValue: subcategory }),
        clear: () => clearSubcategory(encoded),
      });
    }
    if (debouncedLocation.trim()) {
      chips.set("location", {
        id: "location",
        label: debouncedLocation,
        clear: () => {
          unregisterChip("location");
          setLocation("");
          setLocationCoords(null);
          setResolvedLocationCoords(null);
        },
      });
    }
    if (debouncedSearch.trim()) {
      chips.set("search", {
        id: "search",
        label: `"${debouncedSearch}"`,
        clear: () => {
          unregisterChip("search");
          setSearch("");
        },
      });
    }
    if (debouncedPrice[0] > 0 || debouncedPrice[1] < 1000) {
      chips.set("price-range", {
        id: "price-range",
        label: `$${debouncedPrice[0]}–$${debouncedPrice[1] >= 1000 ? "1000+" : debouncedPrice[1]}`,
        clear: () => {
          unregisterChip("price-range");
          setPriceRange([0, 1000]);
        },
      });
    }

    return chips;
  }, [
    serviceType,
    spokenLanguage,
    pricingMode,
    selectedCategories,
    selectedSubcategories,
    debouncedLocation,
    debouncedSearch,
    debouncedPrice,
    t,
  ]);

  const activeChips = useMemo(
    () =>
      filterChipOrder
        .map((id) => chipById.get(id))
        .filter((chip): chip is { id: string; label: string; clear: () => void } => Boolean(chip)),
    [filterChipOrder, chipById],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Mobile filter toggle + active chips ── */}
      <div className="mb-4 space-y-2 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileFilters((v) => !v)}
            aria-expanded={showMobileFilters}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
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
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer ml-auto text-xs text-green-700 underline hover:text-green-800 shrink-0"
            >
              {t("listings.clearAll")}
            </button>
          )}
        </div>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map(({ id, label, clear }) => (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1 bg-green-50 text-green-800 text-xs px-2.5 py-1 rounded-full border border-green-200"
              >
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  onClick={clear}
                  className="cursor-pointer shrink-0 hover:text-green-900"
                  aria-label={t("listings.clear")}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ── Filter sidebar ── */}
        <aside
          className={cn(
            "w-full lg:w-1/4 lg:self-start",
            "max-lg:grid max-lg:transition-[grid-template-rows] max-lg:duration-300 max-lg:ease-in-out",
            showMobileFilters ? "max-lg:grid-rows-[1fr]" : "max-lg:grid-rows-[0fr]",
          )}
        >
          <div className="max-lg:overflow-hidden max-lg:min-h-0">
            <div
              className={cn(
                "border border-gray-200 rounded-xl p-4 space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto",
                "max-lg:mb-4 max-lg:transition-[opacity,transform] max-lg:duration-300 max-lg:ease-in-out",
                showMobileFilters
                  ? "max-lg:opacity-100 max-lg:translate-y-0"
                  : "max-lg:opacity-0 max-lg:-translate-y-1",
              )}
            >
            {/* Mobile close button */}
            <div className="flex items-center justify-between lg:hidden">
              <span className="text-sm font-semibold text-gray-900">{t("listings.filters")}</span>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="cursor-pointer p-1 rounded hover:bg-gray-100"
                title={t("common.close", { defaultValue: "Close" })}
                aria-label={t("common.close", { defaultValue: "Close" })}
              >
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
                    onClick={() => applyServiceType(value)}
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

            {/* Pricing mode (fixed / range / discuss) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t("listings.pricingTypeFilter")}</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "", label: t("listings.all") },
                  { value: "fixed", label: t("post.pricingModeFixed") },
                  { value: "range", label: t("post.pricingModeRange") },
                  { value: "hourly", label: t("post.pricingModeHourly") },
                  { value: "quote", label: t("post.pricingModeQuote") },
                ].map(({ value, label }) => (
                  <button
                    key={value || "any-pricing"}
                    type="button"
                    onClick={() => applyPricingMode(value)}
                    className={`cursor-pointer text-xs px-2 py-2 rounded-lg border transition-colors text-center leading-tight ${
                      pricingMode === value
                        ? "border-green-700 bg-green-50 text-green-800 font-semibold"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spoken language (listing preference) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t("listings.spokenLanguageFilter")}</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "", label: t("listings.all") },
                  { value: "french", label: t("post.languageFrench") },
                  { value: "english", label: t("post.languageEnglish") },
                  { value: "bilingual", label: t("post.languageBilingual") },
                ].map(({ value, label }) => (
                  <button
                    key={value || "any"}
                    type="button"
                    onClick={() => applySpokenLanguage(value)}
                    className={`cursor-pointer text-xs px-2 py-2 rounded-lg border transition-colors text-center leading-tight ${
                      spokenLanguage === value
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
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedCategories([]);
                      setSelectedSubcategories([]);
                      setFilterChipOrder((order) =>
                        order.filter(
                          (id) => !id.startsWith("category-") && !id.startsWith("subcategory-"),
                        ),
                      );
                    }}
                    className="cursor-pointer text-xs text-green-700 underline"
                  >
                    {t("listings.clear")}
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
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
                          className={`cursor-pointer flex-1 py-2 pl-2 text-left ${isSelected ? "font-semibold" : "font-normal"}`}
                        >
                          {t(`categories.${toKey(cat.name)}`, { defaultValue: cat.name })}
                        </button>
                        {/* Arrow — only expands/collapses subcategories */}
                        <button
                          onClick={() => toggleExpand(cat.name)}
                          className="cursor-pointer p-2 shrink-0 text-gray-400 hover:text-gray-700"
                          aria-label={isExpanded ? "Réduire" : "Développer"}
                          aria-expanded={isExpanded}
                        >
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform duration-300 ease-in-out",
                              isExpanded && "rotate-90",
                            )}
                            aria-hidden
                          />
                        </button>
                      </div>
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows] duration-300 ease-in-out",
                          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div
                            className={cn(
                              "ml-3 space-y-0.5 border-l-2 border-gray-100 pl-3 mb-1 transition-opacity duration-300 ease-in-out",
                              isExpanded ? "opacity-100" : "opacity-0",
                            )}
                          >
                            {cat.subcategories?.map((sub) => {
                              const encoded = encodeSubcategoryFilter(cat.name, sub);

                              return (
                                <button
                                  key={encoded}
                                  onClick={() => selectSubcategory(cat.name, sub)}
                                  className={`cursor-pointer block w-full text-left py-1.5 px-2 rounded text-xs transition-colors ${
                                    selectedSubcategories.includes(encoded)
                                      ? "text-green-800 bg-green-50 font-semibold"
                                      : "text-gray-600 hover:text-green-700 hover:bg-green-50"
                                  }`}
                                >
                                  {t(`categories.${toKey(cat.name)}_${toKey(sub)}`, { defaultValue: sub })}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
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
                onCoordsChange={setLocationCoords}
                placeholder={t("listings.cityOrArea")}
              />
              <p className="mt-2 text-xs text-gray-500">{t("home.locationPrivacyHint")}</p>
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
                className="w-full cursor-pointer **:data-[slot=slider-track]:bg-gray-300 **:data-[slot=slider-range]:bg-green-700 **:data-[slot=slider-thumb]:border-green-800 **:data-[slot=slider-thumb]:bg-white"
              />
            </div>

            {/* Ad in sidebar */}
            <AdBanner slot="LISTINGS_SIDEBAR_SLOT" format="rectangle" style={{ minHeight: 250 }} />
            </div>
          </div>
        </aside>

        {/* ── Results ── */}
        <div className="w-full lg:w-3/4">

          {/* Active filter chips — hidden on mobile (shown in the top bar instead) */}
          {activeChips.length > 0 && (
            <div className="mb-4 hidden flex-wrap gap-2 lg:flex">
              {activeChips.map(({ id, label, clear }) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 bg-green-50 text-green-800 text-xs px-3 py-1 rounded-full border border-green-200"
                >
                  {label}
                  <button
                    type="button"
                    onClick={clear}
                    className="cursor-pointer ml-1 hover:text-green-900"
                    aria-label={t("listings.clear")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <ListingsGrid
            filters={{
              search: debouncedSearch,
              categories: selectedCategories,
              subcategories: selectedSubcategories.map((value) => decodeSubcategoryFilter(value).subcategory || value),
              location: debouncedLocation,
              locationLat: resolvedLocationCoords?.lat,
              locationLng: resolvedLocationCoords?.lng,
              locationRadius: LOCATION_SEARCH_RADIUS_KM,
              minPrice: debouncedPrice[0],
              maxPrice: debouncedPrice[1],
              serviceType,
              username,
              spokenLanguage: spokenLanguage || undefined,
              pricingMode: pricingMode || undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper ─────────────────────────────────────────────────────────────
export default function ListingsPage({ username }: { username?: string }) {
  return (
    <div className="bg-white min-h-screen text-black">
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
