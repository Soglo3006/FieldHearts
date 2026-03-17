"use client";

import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { categories } from "@/lib/categories";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SupportButton from "@/components/support/SupportButton";
import { Grid3x3, MapPin, Clock } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "react-i18next";

const COMING_SOON = process.env.NEXT_PUBLIC_COMING_SOON === "true";

const MOCK_LISTINGS: Listing[] = [
  { id: "m1", title: "Nettoyage résidentiel complet", price: 80,  location: "Montréal, QC", city: "Montréal", created_at: new Date(Date.now() - 2 * 86400000).toISOString(), category: "cleaning",   type: "offer",   image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
  { id: "m2", title: "Jardinage & entretien extérieur", price: 55,  location: "Laval, QC",     city: "Laval",    created_at: new Date(Date.now() - 1 * 86400000).toISOString(), category: "gardening", type: "offer",   image_url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80" },
  { id: "m3", title: "Aide au déménagement",           price: 120, location: "Longueuil, QC",  city: "Longueuil",created_at: new Date(Date.now() - 3 * 86400000).toISOString(), category: "moving",    type: "offer",   image_url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80" },
  { id: "m4", title: "Cours de français particuliers", price: 40,  location: "Montréal, QC",   city: "Montréal", created_at: new Date(Date.now() - 5 * 86400000).toISOString(), category: "tutoring",  type: "offer",   image_url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80" },
  { id: "m5", title: "Recherche peintre intérieur",    price: 200, location: "Brossard, QC",   city: "Brossard", created_at: new Date(Date.now() - 1 * 86400000).toISOString(), category: "painting",  type: "looking", image_url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=80" },
  { id: "m6", title: "Cours de guitare débutant",      price: 35,  location: "Québec, QC",     city: "Québec",   created_at: new Date(Date.now() - 4 * 86400000).toISOString(), category: "music",     type: "offer",   image_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80" },
  { id: "m7", title: "Garde d'animaux à domicile",     price: 30,  location: "Montréal, QC",   city: "Montréal", created_at: new Date(Date.now() - 6 * 86400000).toISOString(), category: "pet_care",  type: "offer",   image_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80" },
  { id: "m8", title: "Réparation d'électroménagers",   price: 75,  location: "Laval, QC",      city: "Laval",    created_at: new Date(Date.now() - 2 * 86400000).toISOString(), category: "repair",    type: "offer",   image_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80" },
];

const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function formatRelativeDate(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string) {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  city?: string | null;
  image_url?: string;
  created_at: string;
  category: string;
  category_name?: string;
  type?: "offer" | "looking";
}

function ListingCard({ listing, t }: { listing: Listing; t: (key: string, opts?: Record<string, unknown>) => string }) {
  return (
    <Link href={`/serviceDetail/${listing.id}`}>
      <div className="border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <AspectRatio ratio={16 / 9}>
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Grid3x3 className="h-12 w-12 text-gray-300" />
            </div>
          )}
        </AspectRatio>
        <div className="p-3 flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold flex-1">{listing.title}</h3>
            {listing.type === "looking" ? (
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">{t("listings.looking")}</span>
            ) : (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">{t("listings.offering")}</span>
            )}
          </div>
          <p className="text-green-700 font-semibold">{listing.price} $</p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{listing.city ?? listing.location}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeDate(listing.created_at, t)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ListingSkeleton() {
  return (
    <div className="border rounded-xl shadow-sm bg-white overflow-hidden animate-pulse">
      <div className="w-full aspect-video bg-gray-200" />
      <div className="p-3">
        <div className="h-4 bg-gray-200 rounded mt-1 w-3/4" />
        <div className="h-4 bg-gray-200 rounded mt-2 w-1/2" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [nearbyListings, setNearbyListings] = useState<Listing[]>([]);
  const [sortedCategories, setSortedCategories] = useState(categories);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (user) {
      const profileCompleted = user.user_metadata?.profile_completed;
      if (!profileCompleted) {
        router.push("/choose_type");
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const [servicesRes, countsRes] = await Promise.all([
          fetch(`${API_URL}/services`),
          fetch(`${API_URL}/services/category-counts`),
        ]);
        const data: Listing[] = await servicesRes.json();
        const counts: { category_name: string; count: number }[] = await countsRes.json();

        setListings(data);

        // Sort categories by real count from backend
        const countMap: Record<string, number> = {};
        counts.forEach((c) => { countMap[c.category_name] = c.count; });
        const sorted = [...categories].sort(
          (a, b) => (countMap[b.name] || 0) - (countMap[a.name] || 0)
        );
        setSortedCategories(sorted);

        // Listings near you via geolocation — uses real coordinates
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const { latitude, longitude } = pos.coords;
                const nearbyRes = await fetch(
                  `${API_URL}/services?userLat=${latitude}&userLng=${longitude}&radius=50`
                );
                const nearbyData: Listing[] = await nearbyRes.json();
                setNearbyListings(nearbyData.length > 0 ? nearbyData.slice(0, 3) : data.slice(0, 3));
              } catch {
                setNearbyListings(data.slice(0, 3));
              }
            },
            () => setNearbyListings(data.slice(0, 3))
          );
        } else {
          setNearbyListings(data.slice(0, 3));
        }
      } catch {
        // API unreachable
      } finally {
        setDataLoading(false);
      }
    };

    fetchListings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <main className="flex-1">
        <div
          className="relative py-16 sm:py-32 md:py-40 px-4 overflow-hidden"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1600&q=80')`,
            backgroundPosition: "center 20%",
            backgroundSize: "100%",
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
          <h2 className="text-2xl font-bold mb-5">{t("home.recentlyAdded")}</h2>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="grid lg:col-span-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

              {/* Recently added listings */}
              {dataLoading && !COMING_SOON ? (
                Array.from({ length: 9 }).map((_, i) => <ListingSkeleton key={i} />)
              ) : (
                (COMING_SOON && listings.length === 0 ? MOCK_LISTINGS : listings.length === 0 ? [] : listings)
                  .slice(0, 9)
                  .map((listing) => (
                    <ListingCard key={listing.id} listing={listing} t={t} />
                  ))
              )}
              {!COMING_SOON && !dataLoading && listings.length === 0 && (
                <p className="text-gray-500 col-span-full">{t("home.noListings")}</p>
              )}

              {/* Popular categories */}
              <div className="col-span-full mt-10">
                <h1 className="text-3xl font-bold mb-5">{t("home.popularCategories")}</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                  {sortedCategories.slice(0, 8).map((category) => (
                    <Link
                      key={category.name}
                      href={`/listings?category=${encodeURIComponent(category.name)}`}
                    >
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group">
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
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

              {/* CTA for non-logged-in users */}
              {!user && (
                <div className="col-span-full mt-10 bg-green-800 rounded-2xl p-10 text-center text-white">
                  <h1 className="text-3xl font-bold mb-2">
                    {t("home.ctaTitle")}
                  </h1>
                  <p>{t("home.ctaSubtitle")}</p>
                  <Link href="/login">
                    <Button className="mt-4 cursor-pointer">{t("home.signIn")}</Button>
                  </Link>
                </div>
              )}

              {/* Ad banner */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl h-[200px] col-span-full flex items-center justify-center text-gray-500">
                {t("home.advertisement")}<br />728×90
              </div>

              {/* Listings near you */}
              <div className="col-span-full mt-10">
                <h1 className="text-2xl font-bold mb-5">{t("home.listingsNearYou")}</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {dataLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <ListingSkeleton key={i} />)
                  ) : nearbyListings.length === 0 ? (
                    <p className="text-gray-500 col-span-full">{t("home.noListingsNearYou")}</p>
                  ) : (
                    nearbyListings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} t={t} />
                    ))
                  )}
                </div>
                <Link href="/listings">
                  <Button className="mt-6 w-full bg-green-700 text-white hover:bg-green-800 cursor-pointer">
                    {t("home.viewAllListings")}
                  </Button>
                </Link>
              </div>

            </div>

            {/* Sidebar ads */}
            <div className="lg:col-span-1 space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl h-[300px] flex items-center justify-center text-gray-500">
                {t("home.advertisement")}<br />300×600
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl h-[250px] flex items-center justify-center text-gray-500">
                {t("home.advertisement")}<br />300×250
              </div>
            </div>
          </div>
        </div>
      </main>

      <SupportButton floating />
    </div>
  );
}
