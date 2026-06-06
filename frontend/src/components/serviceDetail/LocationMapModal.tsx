"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

interface Props {
  location: string;
  lat?: number | null;
  lng?: number | null;
  isApproximate?: boolean;
  onClose: () => void;
}

const mapLoadFallbackMs = 15_000;

const circleStyle =
  "absolute inset-0 m-auto h-[220px] w-[220px] rounded-full border-2 border-green-600 bg-green-500/10 pointer-events-none z-2 transition-opacity duration-300";

function MapEmbedPanel({ mapSrc, isApproximate }: { mapSrc: string; isApproximate: boolean }) {
  const { t } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMapLoaded(true), mapLoadFallbackMs);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-gray-100" role="status" aria-live="polite">
      <iframe
        title="Location Map"
        className={cn(
          "absolute inset-0 z-0 h-full w-full transition-opacity duration-300",
          mapLoaded ? "opacity-100" : "opacity-0"
        )}
        referrerPolicy="no-referrer-when-downgrade"
        src={mapSrc}
        onLoad={() => setMapLoaded(true)}
      />
      {isApproximate && mapLoaded && <div className={circleStyle} />}
      {!mapLoaded && (
        <div className="absolute inset-0 z-3 flex flex-col items-center justify-center gap-3 bg-gray-100">
          <Loader2 className="size-10 animate-spin text-green-600" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("serviceDetail.mapLoading")}</p>
        </div>
      )}
    </div>
  );
}

export default function LocationMapModal({ location, lat, lng, isApproximate = false, onClose }: Props) {
  const { t } = useTranslation();
  useScrollLock(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const addressQuery = location.trim();
  const mapQuery =
    addressQuery || (lat != null && lng != null ? `${lat},${lng}` : "");
  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(mapQuery)}&zoom=${isApproximate ? 12 : 16}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const headerTitle =
    addressQuery ||
    (isApproximate ? t("serviceDetail.approximateLocation") : t("serviceDetail.exactLocation"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
          <h3 className="min-w-0 font-semibold text-gray-900 line-clamp-2">{headerTitle}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-500 hover:text-gray-700"
            aria-label="Close map"
          >
            ✕
          </button>
        </div>
        <MapEmbedPanel key={mapSrc} mapSrc={mapSrc} isApproximate={isApproximate} />
        <div className="px-4 py-3 text-xs text-gray-600 flex items-center justify-between border-t">
          <span>{isApproximate ? t("serviceDetail.approximateLocationDesc") : t("serviceDetail.exactLocationDesc")}</span>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-green-700 hover:text-green-800"
          >
            {t("serviceDetail.openInGoogleMaps")}
          </a>
        </div>
      </div>
    </div>
  );
}
