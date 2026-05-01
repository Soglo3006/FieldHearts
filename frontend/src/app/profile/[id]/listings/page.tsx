"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Grid3x3, MapPin, ArrowLeft } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import AppImage from "@/components/ui/AppImage";
import { useTranslation } from "react-i18next";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { formatListingPriceLine } from "@/lib/listingPrice";

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
  subcategory: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  owner_name: string;
}

export default function UserListingsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const [listings, setListings] = useState<Service[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/user/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setListings(data);
          if (data.length > 0) setOwnerName(data[0].owner_name ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/profile/${id}`} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {ownerName ? `${ownerName} · ${t("profile.listings")}` : t("profile.listings")}
          </h1>
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
              return (
                <div key={s.id} className="border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden hover:shadow-lg transition-all">
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

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start gap-2 mb-1">
                      <Link href={`/serviceDetail/${s.id}`} className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-1 hover:text-green-700 transition-colors">
                          {resolved}
                        </h3>
                      </Link>
                      {s.type === "looking" && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs flex-shrink-0 border-0">{t("listings.looking")}</Badge>
                      )}
                    </div>

                    <p className="text-green-700 font-bold text-lg mb-2">{formatListingPriceLine(t, s)}</p>

                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
                    </div>

                    {s.category && (
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {s.category}
                        {s.subcategory && ` • ${s.subcategory}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
