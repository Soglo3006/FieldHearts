"use client";
import Link from "next/link";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MapPin, Grid3x3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppImage from "@/components/ui/AppImage";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import { formatListingPriceLine } from "@/lib/listingPrice";
import { formatListingCategoryLine } from "@/lib/listingTags";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { ListingCardSubtitle, ListingCardPriceRow } from "@/components/listings/ListingTrustLine";

interface SimilarService {
  id: string;
  title: string;
  pricing_mode?: string | null;
  price: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean;
  image_url: string | null;
  image_urls?: string[] | null;
  language?: string | null;
  translations?: ServiceLikeWithI18n["translations"];
  category?: string | null;
  category_name?: string | null;
  subcategory?: string | null;
  listing_tags?: unknown;
  review_count?: number | string | null;
  average_rating?: number | string | null;
  completed_bookings_count?: number | string | null;
  type?: "offer" | "looking" | null;
}

interface Props {
  services: SimilarService[];
}

export default function SimilarServices({ services }: Props) {
  const { t, i18n } = useTranslation();

  if (services.length === 0) return null;

  return (
    <div className="lg:col-span-2 order-3 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{t("serviceDetail.similar")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((s) => {
          const thumb = s.image_urls?.[0] ?? s.image_url;
          const resolved = resolveListingTitle(s, i18n.language);
          const categoryLine = formatListingCategoryLine(
            s.category_name ?? s.category ?? null,
            s,
            t,
            " | ",
          );
          return (
            <Link key={s.id} href={`/serviceDetail/${s.id}`} className="block group h-full">
              <div className="flex h-full flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
                <AspectRatio ratio={16 / 9}>
                  <div className="relative h-full w-full">
                    <ListingLangPills service={s} />
                    {thumb ? (
                      <AppImage src={thumb} alt={resolved} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Grid3x3 className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                </AspectRatio>
                <div className="flex flex-1 flex-col p-3">
                  <p className="font-semibold text-gray-900 line-clamp-1 group-hover:text-green-700 transition-colors text-sm">{resolved}</p>
                  <ListingCardSubtitle
                    categoryLine={categoryLine || null}
                    reviewCount={s.review_count}
                    averageRating={s.average_rating}
                  />
                  <ListingCardPriceRow
                    price={formatListingPriceLine(t, s)}
                    completedBookingsCount={s.completed_bookings_count}
                    listingType={s.type ?? undefined}
                  />
                  {getPublicServiceLocation(s) && (
                    <p className="text-xs text-gray-500 mt-auto flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
