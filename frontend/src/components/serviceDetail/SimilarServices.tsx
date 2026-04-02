"use client";
import Link from "next/link";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MapPin, Grid3x3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppImage from "@/components/ui/AppImage";
import { getPublicServiceLocation } from "@/lib/serviceLocation";

interface SimilarService {
  id: string;
  title: string;
  price: number;
  location: string;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean;
  image_url: string | null;
}

interface Props {
  services: SimilarService[];
}

export default function SimilarServices({ services }: Props) {
  const { t } = useTranslation();

  if (services.length === 0) return null;

  return (
    <div className="lg:col-span-2 order-3 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{t("serviceDetail.similar")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((s) => (
          <Link key={s.id} href={`/serviceDetail/${s.id}`} className="block group">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
              <AspectRatio ratio={16 / 9}>
                {s.image_url ? (
                  <AppImage src={s.image_url} alt={s.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Grid3x3 className="h-10 w-10 text-gray-300" />
                  </div>
                )}
              </AspectRatio>
              <div className="p-3">
                <p className="font-semibold text-gray-900 line-clamp-1 group-hover:text-green-700 transition-colors">
                  {s.title}
                </p>
                <p className="text-green-700 font-bold text-sm mt-1">{Number(s.price).toFixed(2)} $</p>
                {getPublicServiceLocation(s) && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
