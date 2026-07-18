"use client";

import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { categories } from "@/lib/categories";
import Link from "next/link";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useTransition, type MouseEvent } from "react";
import { Grid3x3 } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMapsConfig";
import { geocodeCanadianLocation, LOCATION_SEARCH_RADIUS_KM, shouldAutoGeocodeLocation } from "@/lib/geocodeCanadianLocation";
import { ListingsRegionEmptyState } from "@/components/listings/ListingsRegionEmptyState";
import AppImage from "@/components/ui/AppImage";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ListingLocationLine from "@/components/listings/ListingLocationLine";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import dynamic from "next/dynamic";
import { ListingCardImageCarousel, getListingGalleryUrls } from "@/components/listings/ListingCardImageCarousel";
const AdBanner = dynamic(() => import("@/components/AdBanner"), { ssr: false });
import { ListingCardSubtitle, ListingCardPriceRow, ListingCardTitle } from "@/components/listings/ListingTrustLine";
import { formatListingCategoryLine } from "@/lib/listingTags";
import { formatListingPriceLine } from "@/lib/listingPrice";
import { HomeListingCardSkeleton } from "@/components/home/HomeSkeleton";
import LinkLabelWithLoadingSpinner from "@/components/ui/LinkLabelWithLoadingSpinner";
import { PostPublishLink, usePostPublishNavigating } from "@/components/navigation/PostPublishLink";
import { cn } from "@/lib/utils";

const CityAutocomplete = dynamic(() => import("@/components/ui/CityAutocomplete"), { ssr: false });
const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Communauté locale — bannière incitation à publier / se connecter */
const HOME_CTA_IMAGE =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=80&auto=format&fit=crop";

export interface HomeListing extends ServiceLikeWithI18n {
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
  locations?: Array<{ address?: string; city?: string; lat?: number; lng?: number; location?: string }>;
  display_location_label?: string | null;
  display_location_extra_count?: number | string | null;
  image_url?: string;
  image_urls?: string[] | null;
  created_at: string;
  category: string;
  category_name?: string;
  subcategory?: string | null;
  listing_tags?: unknown;
  type?: "offer" | "looking";
  review_count?: number | string | null;
  average_rating?: number | string | null;
  completed_bookings_count?: number | string | null;
}

export interface HomeCategoryCount {
  category_name: string;
  count: number;
}

function ListingCard({
  listing,
  t,
  i18nLang,
  priority = false,
  searchLat,
  searchLng,
  searchText,
}: {
  listing: HomeListing;
  t: (key: string, opts?: Record<string, unknown>) => string;
  i18nLang: string | undefined;
  priority?: boolean;
  searchLat?: number | null;
  searchLng?: number | null;
  searchText?: string | null;
}) {
  const router = useRouter();
  const galleryUrls = getListingGalleryUrls(listing.image_urls, listing.image_url);
  const resolvedTitle = resolveListingTitle(listing, i18nLang);
  const categoryLine = formatListingCategoryLine(
    listing.category_name ?? listing.category ?? null,
    listing,
    t,
    " | ",
  );
  const detailHref = `/serviceDetail/${listing.id}`;
  return (
    <div className="group h-full border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <AspectRatio ratio={16 / 9}>
        <div className="relative w-full h-full cursor-pointer" onClick={() => router.push(detailHref)}>
          <ListingLangPills service={listing} />
          {galleryUrls.length > 0 ? (
            <>
              <ListingCardImageCarousel
                urls={galleryUrls}
                alt={resolvedTitle}
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                priority={priority}
              />
              <Link
                href={detailHref}
                className="absolute inset-0 z-5 outline-none hidden sm:block"
                aria-label={resolvedTitle}
              />
            </>
          ) : (
            <Link href={detailHref} className="flex h-full w-full items-center justify-center bg-gray-100 outline-none" aria-label={resolvedTitle}>
              <Grid3x3 className="h-12 w-12 text-gray-300" />
            </Link>
          )}
        </div>
      </AspectRatio>
      <Link href={detailHref} className="flex flex-1 flex-col gap-1 p-3 text-left outline-none">
        <div className="flex items-start gap-2">
          <ListingCardTitle
            title={resolvedTitle}
            className="transition-colors group-hover:text-green-700"
          />
          {listing.type === "looking" ? (
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">{t("listings.looking")}</span>
          ) : (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">{t("listings.offering")}</span>
          )}
        </div>
        <ListingCardSubtitle
          categoryLine={categoryLine || null}
          reviewCount={listing.review_count}
          averageRating={listing.average_rating}
        />
        <ListingCardPriceRow
          price={formatListingPriceLine(t, listing)}
          completedBookingsCount={listing.completed_bookings_count}
          listingType={listing.type}
          priceClassName="font-semibold"
        />
        <ListingLocationLine
          service={listing}
          searchLat={searchLat}
          searchLng={searchLng}
          searchText={searchText}
        />
      </Link>
    </div>
  );
}

function HomeCtaPostLabel() {
  const { t } = useTranslation();
  const isNavigating = usePostPublishNavigating();

  return (
    <LinkLabelWithLoadingSpinner
      label={t("home.postListing")}
      loading={isNavigating}
    />
  );
}

export default function HomePageClient({
  initialListings,
  initialCategoryCounts,
}: {
  initialListings: HomeListing[];
  initialCategoryCounts: HomeCategoryCount[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [listings, setListings] = useState<HomeListing[]>(initialListings);
  const [nearbyListings, setNearbyListings] = useState<HomeListing[]>(initialListings.slice(0, 3));
  const [sortedCategories, setSortedCategories] = useState(categories);
  const [dataLoading, setDataLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPending, setLocationPending] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedLocationCoords, setResolvedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const { isLoaded: mapsReady } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const buildLocationQuery = useCallback(
    (label: string, coords: { lat: number; lng: number } | null) => {
      const params = new URLSearchParams();
      params.set("location", label.trim());
      if (coords) {
        params.set("userLat", String(coords.lat));
        params.set("userLng", String(coords.lng));
        params.set("radius", String(LOCATION_SEARCH_RADIUS_KM));
      }
      return params.toString();
    },
    [],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocation(locationInput), 400);
    return () => clearTimeout(timer);
  }, [locationInput]);

  useEffect(() => {
    if (!mounted || loading) return;
    if (user && needsOnboardingSetup(user)) {
      router.push("/choose_type");
    }
  }, [mounted, user, loading, router]);

  useEffect(() => {
    const countMap: Record<string, number> = {};
    (Array.isArray(initialCategoryCounts) ? initialCategoryCounts : []).forEach((countItem) => {
      countMap[countItem.category_name] = countItem.count;
    });
    const sorted = [...categories].sort(
      (a, b) => (countMap[b.name] || 0) - (countMap[a.name] || 0),
    );
    setSortedCategories(sorted);
  }, [initialCategoryCounts]);

  useEffect(() => {
    if (!debouncedLocation.trim()) {
      setListings(initialListings);
      setNearbyListings(initialListings.slice(0, 3));
      setResolvedLocationCoords(null);
      setDataLoading(false);
      return;
    }

    let cancelled = false;
    const fetchListings = async () => {
      setDataLoading(true);
      try {
        let coords = locationCoords;
        if (!coords && mapsReady && shouldAutoGeocodeLocation(debouncedLocation.trim(), Boolean(locationCoords))) {
          coords = await geocodeCanadianLocation(debouncedLocation.trim());
        }
        if (!cancelled) {
          setResolvedLocationCoords(coords);
        }

        const params = new URLSearchParams({ limit: "12" });
        const trimmedLocation = debouncedLocation.trim();
        if (trimmedLocation) {
          params.set("location", trimmedLocation);
        }
        if (coords) {
          params.set("userLat", String(coords.lat));
          params.set("userLng", String(coords.lng));
          params.set("radius", String(LOCATION_SEARCH_RADIUS_KM));
        } else if (!mapsReady) {
          return;
        }

        const servicesRes = await fetch(`${API_URL}/services?${params.toString()}`);
        const data = await servicesRes.json();
        if (cancelled) return;
        const rows = Array.isArray(data) ? (data as HomeListing[]) : [];
        setListings(rows);
        setNearbyListings(rows.slice(0, 3));
      } catch {
        if (!cancelled) {
          toast.error(t("listings.loadError"));
          setListings([]);
          setNearbyListings([]);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    fetchListings();
    return () => {
      cancelled = true;
    };
  }, [debouncedLocation, locationCoords, mapsReady, initialListings]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationGranted(false);
      setLocationPending(false);
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocationGranted(true);
      setLocationPending(false);
    };

    const onError = () => {
      setLocationGranted(false);
      setLocationPending(false);
    };

    const requestCoords = () => {
      setLocationPending(true);
      navigator.geolocation.getCurrentPosition(onSuccess, onError);
    };

    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        if (result.state === "denied") {
          onError();
        } else {
          requestCoords();
        }

        result.onchange = () => {
          if (result.state === "granted") {
            requestCoords();
          } else if (result.state === "denied") {
            onError();
            setNearbyListings([]);
          }
        };
      }).catch(() => requestCoords());
    } else {
      requestCoords();
    }
  }, []);

  useEffect(() => {
    if (!userCoords || debouncedLocation.trim()) return;
    fetch(`${API_URL}/services?userLat=${userCoords.lat}&userLng=${userCoords.lng}&radius=50`)
      .then((r) => r.json())
      .then((data: HomeListing[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setNearbyListings(data.slice(0, 3));
        }
      })
      .catch(() => {});
  }, [userCoords, debouncedLocation]);

  const listingsBrowseHref =
    debouncedLocation.trim().length > 0
      ? `/listings?${buildLocationQuery(debouncedLocation, resolvedLocationCoords ?? locationCoords)}`
      : "/listings";

  const [isListingsNavigating, startListingsNavigation] = useTransition();
  const [isLoginNavigating, startLoginNavigation] = useTransition();

  const onViewAllListingsClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (isListingsNavigating) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    startListingsNavigation(() => {
      router.push(listingsBrowseHref);
    });
  };

  const onLoginClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (isLoginNavigating) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    startLoginNavigation(() => {
      router.push("/login");
    });
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <main className="flex-1">
        <div
          className="relative py-16 sm:py-32 md:py-40 px-4 overflow-hidden"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1600&q=80')`,
            backgroundPosition: "center center",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-green-800/60" />
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-md">
              {t("home.heroTitle").split("\n").map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h1>
            <p className="text-green-100 text-sm sm:text-base">
              {t("home.heroSubtitle")}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-5">
          <div className="mb-6 max-w-xl">
            <label htmlFor="home-location-filter" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("listings.location")}
            </label>
            <CityAutocomplete
              id="home-location-filter"
              value={locationInput}
              onChange={setLocationInput}
              onCoordsChange={setLocationCoords}
              placeholder={t("listings.cityOrArea")}
            />
            <p className="mt-2 text-xs text-gray-500">{t("home.locationPrivacyHint")}</p>
          </div>

          <h2 className="text-2xl font-bold mb-5">{t("home.recentlyAdded")}</h2>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="grid lg:col-span-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {dataLoading ? (
                Array.from({ length: 9 }).map((_, i) => <HomeListingCardSkeleton key={i} />)
              ) : listings.length === 0 ? (
                <ListingsRegionEmptyState locationLabel={debouncedLocation} className="col-span-full" />
              ) : (
                listings.slice(0, 9).map((listing, i) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    t={t}
                    i18nLang={i18n.language}
                    priority={i < 3}
                    searchLat={resolvedLocationCoords?.lat}
                    searchLng={resolvedLocationCoords?.lng}
                    searchText={debouncedLocation.trim() || null}
                  />
                ))
              )}

              <div className="col-span-full mt-10">
                <h2 className="text-2xl font-bold mb-5">{t("home.popularCategories")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                  {sortedCategories.slice(0, 8).map((category) => (
                    <Link
                      key={category.name}
                      href={
                        debouncedLocation.trim()
                          ? `/listings?category=${encodeURIComponent(category.name)}&${buildLocationQuery(debouncedLocation, resolvedLocationCoords ?? locationCoords)}`
                          : `/listings?category=${encodeURIComponent(category.name)}`
                      }
                    >
                      <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden cursor-pointer group">
                        <AppImage
                          src={category.image}
                          alt={category.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <h2 className="text-white text-xs sm:text-sm font-semibold drop-shadow-lg leading-tight text-center px-1">
                            {t(`categories.${toKey(category.name)}`, { defaultValue: category.name })}
                          </h2>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="col-span-full mt-10 relative overflow-hidden rounded-2xl">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url('${HOME_CTA_IMAGE}')`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-green-900/45" aria-hidden />
                <div
                  className="absolute inset-0 bg-linear-to-r from-green-900/50 via-green-800/35 to-green-900/30"
                  aria-hidden
                />
                <div className="relative z-10 p-6 sm:p-10 text-center text-white">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 drop-shadow-sm">
                    {user ? t("home.ctaPostTitle") : t("home.ctaTitle")}
                  </h2>
                  <p className="text-sm sm:text-base text-green-100 max-w-xl mx-auto">
                    {user ? t("home.ctaPostSubtitle") : t("home.ctaSubtitle")}
                  </p>
                  {user ? (
                    <PostPublishLink className="inline-block">
                      <Button className="mt-5 flex cursor-pointer items-center justify-center bg-white text-green-900 shadow-md hover:bg-green-50">
                        <HomeCtaPostLabel />
                      </Button>
                    </PostPublishLink>
                  ) : (
                    <Link
                      href="/login"
                      className={cn(
                        "inline-block",
                        isLoginNavigating && "pointer-events-none opacity-80",
                      )}
                      aria-busy={isLoginNavigating}
                      onClick={onLoginClick}
                    >
                      <Button className="mt-5 flex cursor-pointer items-center justify-center bg-white text-green-900 shadow-md hover:bg-green-50">
                        <LinkLabelWithLoadingSpinner
                          label={t("home.signIn")}
                          loading={isLoginNavigating}
                        />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="col-span-full">
                <AdBanner slot="HOME_BANNER_SLOT" format="horizontal" style={{ minHeight: 90 }} />
              </div>

              {(locationPending || locationGranted) && (
                <div className="col-span-full mt-10">
                  <h2 className="text-2xl font-bold mb-5">{t("home.listingsNearYou")}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {dataLoading ? (
                      Array.from({ length: 3 }).map((_, i) => <HomeListingCardSkeleton key={i} />)
                    ) : nearbyListings.length === 0 ? (
                      <p className="text-gray-500 col-span-full">{t("home.noListingsNearYou")}</p>
                    ) : (
                      nearbyListings.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          t={t}
                          i18nLang={i18n.language}
                          searchLat={
                            debouncedLocation.trim()
                              ? (resolvedLocationCoords ?? locationCoords)?.lat
                              : userCoords?.lat
                          }
                          searchLng={
                            debouncedLocation.trim()
                              ? (resolvedLocationCoords ?? locationCoords)?.lng
                              : userCoords?.lng
                          }
                          searchText={debouncedLocation.trim() || null}
                        />
                      ))
                    )}
                  </div>
                  <Button
                    asChild
                    className={cn(
                      "mt-6 w-full bg-green-700 text-white hover:bg-green-800 cursor-pointer",
                      isListingsNavigating && "pointer-events-none opacity-80",
                    )}
                  >
                    <Link
                      href={listingsBrowseHref}
                      className="flex items-center justify-center"
                      aria-busy={isListingsNavigating}
                      onClick={onViewAllListingsClick}
                    >
                      <LinkLabelWithLoadingSpinner
                        label={t("home.viewAllListings")}
                        loading={isListingsNavigating}
                      />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="hidden lg:block lg:col-span-1 space-y-6">
              <AdBanner slot="HOME_SIDEBAR_1_SLOT" format="vertical" style={{ minHeight: 300 }} />
              <AdBanner slot="HOME_SIDEBAR_2_SLOT" format="rectangle" style={{ minHeight: 250 }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
