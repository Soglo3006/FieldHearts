"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { useJsApiLoader, type Libraries } from "@react-google-maps/api";
import { MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CANADA_REGIONS, filterCanadaRegions, getRegionDisplayLabel } from "@/lib/canadaRegions";
import { geocodeCanadianLocation, geocodePlaceId, type LatLng } from "@/lib/geocodeCanadianLocation";

const LIBRARIES: Libraries = ["places"];

interface Props {
  value: string;
  onChange: (city: string) => void;
  /** Coordonnées lorsque l'utilisateur choisit une ville ou une région dans la liste. */
  onCoordsChange?: (coords: LatLng | null) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

function CityInput({ value, onChange, onCoordsChange, placeholder, className, id }: Props) {
  const { t, i18n } = useTranslation();
  const langIsEnglish = i18n.language?.startsWith("en") ?? false;
  const [panelOpen, setPanelOpen] = useState(false);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    defaultValue: value,
    debounce: 250,
    requestOptions: {
      types: ["(cities)"],
      componentRestrictions: { country: "ca" },
      language: i18n.language?.startsWith("en") ? "en" : "fr",
    } as google.maps.places.AutocompletionRequest,
  });

  useEffect(() => {
    setValue(value, false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const regionMatches = useMemo(() => filterCanadaRegions(inputValue), [inputValue]);

  const cityPredictions = status === "OK" && data.length > 0 ? data : [];

  useEffect(() => {
    return () => {
      if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current);
    };
  }, []);

  const cancelBlurClose = () => {
    if (blurCloseTimer.current) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  };

  const scheduleBlurClose = () => {
    cancelBlurClose();
    blurCloseTimer.current = setTimeout(() => setPanelOpen(false), 200);
  };

  const handleSelectCity = async (placeId: string, description: string) => {
    const cityName = description.split(",")[0].trim();
    setValue(cityName, false);
    clearSuggestions();
    onChange(cityName);
    setPanelOpen(false);

    const coords = await geocodePlaceId(placeId);
    onCoordsChange?.(coords);
  };

  const handleSelectRegion = async (regionId: string) => {
    const region = CANADA_REGIONS.find((r) => r.id === regionId);
    if (!region) return;
    const label = getRegionDisplayLabel(region, langIsEnglish);
    setValue(label, false);
    clearSuggestions();
    onChange(label);
    setPanelOpen(false);

    const coords = await geocodeCanadianLocation(label);
    onCoordsChange?.(coords);
  };

  const hasCities = cityPredictions.length > 0;
  const hasRegions = regionMatches.length > 0;
  const showPanel = panelOpen && ready && (hasRegions || hasCities);

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value);
            onCoordsChange?.(null);
          }}
          onFocus={() => {
            cancelBlurClose();
            setPanelOpen(true);
          }}
          onBlur={scheduleBlurClose}
          disabled={!ready}
          placeholder={ready ? (placeholder ?? "Ville...") : "Chargement…"}
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none ring-0 transition-colors placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-0 focus:shadow-none"
        />
        {inputValue && (
          <button
            type="button"
            title={t("listings.clear")}
            aria-label={t("listings.clear")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setValue("", false);
              clearSuggestions();
              onChange("");
              onCoordsChange?.(null);
            }}
            className="cursor-pointer absolute right-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showPanel && (
        <ul
          className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto overscroll-contain"
          aria-label={t("listings.location")}
        >
          {hasRegions && (
            <>
              <li
                role="presentation"
                className="px-3 py-1.5 text-xs font-semibold text-green-900 bg-green-50 border-b border-green-100"
              >
                {t("listings.locationRegions")}
              </li>
              {regionMatches.map((region) => {
                const disp = getRegionDisplayLabel(region, langIsEnglish);
                return (
                  <li
                    key={region.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      cancelBlurClose();
                      handleSelectRegion(region.id);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-green-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50"
                  >
                    <MapPin className="w-3.5 h-3.5 text-green-700 shrink-0" />
                    <span className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{disp}</span>
                      <span className="text-[10px] uppercase tracking-wide text-green-800 bg-green-50 px-1.5 py-0.5 rounded border border-green-200/80 shrink-0">
                        {t("listings.locationRegionBadge")}
                      </span>
                    </span>
                  </li>
                );
              })}
            </>
          )}

          {hasCities && (
            <>
              <li
                role="presentation"
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border-b border-gray-100"
              >
                {t("listings.locationCities")}
              </li>
              {cityPredictions.map(({ place_id, description }) => (
                <li
                  key={place_id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    cancelBlurClose();
                    handleSelectCity(place_id, description);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-green-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span>
                    <span className="font-medium">{description.split(",")[0].trim()}</span>
                    <span className="text-gray-400">{description.includes(",") ? "," + description.split(",").slice(1).join(",") : ""}</span>
                  </span>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}

export default function CityAutocomplete(props: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  if (!isLoaded) {
    return (
      <div className={cn("relative", props.className)}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          id={props.id}
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="Chargement…"
          disabled
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white opacity-60"
        />
      </div>
    );
  }

  return <CityInput {...props} />;
}
