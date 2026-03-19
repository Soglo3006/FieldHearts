"use client";

import { useTranslation } from "react-i18next";

interface Props {
  location: string;
  lat?: number | null;
  lng?: number | null;
  onClose: () => void;
}

export default function LocationMapModal({ location, lat, lng, onClose }: Props) {
  const { t } = useTranslation();

  const hasCoords = lat != null && lng != null;
  const mapSrc = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}&output=embed&z=14`
    : `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed&z=12`;
  const mapsHref = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">{t("serviceDetail.approximateLocation")}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-500 hover:text-gray-700"
            aria-label="Close map"
          >
            ✕
          </button>
        </div>
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            title="Location Map"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapSrc}
          />
          {/* Bloque toute interaction avec la carte pour que le cercle reste fixe */}
          <div className="absolute inset-0" style={{ zIndex: 1 }} />
          {/* Cercle de zone approximative — centré via margin auto */}
          <div
            className="pointer-events-none absolute rounded-full border-2 border-green-600 bg-green-500/10"
            style={{
              width: 220,
              height: 220,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: "auto",
              zIndex: 2,
            }}
          />
        </div>
        <div className="px-4 py-3 text-xs text-gray-600 flex items-center justify-between border-t">
          <span>{t("serviceDetail.approximateLocationDesc")}</span>
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
