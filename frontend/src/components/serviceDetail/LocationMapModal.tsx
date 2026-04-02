"use client";

import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";

interface Props {
  location: string;
  lat?: number | null;
  lng?: number | null;
  isApproximate?: boolean;
  onClose: () => void;
}

export default function LocationMapModal({ location, lat, lng, isApproximate = false, onClose }: Props) {
  const { t } = useTranslation();
  useScrollLock(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const hasExactCoords = !isApproximate && lat != null && lng != null;
  const mapQuery = hasExactCoords ? `${lat},${lng}` : location;
  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(mapQuery)}&zoom=${isApproximate ? 12 : 16}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const circleStyle = "absolute inset-0 m-auto h-[220px] w-[220px] rounded-full border-2 border-green-600 bg-green-500/10 pointer-events-none z-[2]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">
            {isApproximate ? t("serviceDetail.approximateLocation") : t("serviceDetail.exactLocation")}
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-500 hover:text-gray-700"
            aria-label="Close map"
          >
            ✕
          </button>
        </div>
        <div className="relative aspect-video w-full overflow-hidden">
          <iframe
            title="Location Map"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapSrc}
          />
          <div className="absolute inset-0 z-[1]" />
          {isApproximate && (
            <div className={circleStyle} />
          )}
        </div>
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
