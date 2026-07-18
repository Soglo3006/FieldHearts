"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CANADA_REGIONS, filterCanadaRegions, getRegionDisplayLabel } from "@/lib/canadaRegions";
import { geocodeCanadianLocation, geocodePlaceId, type LatLng } from "@/lib/geocodeCanadianLocation";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMapsConfig";
import { locationSearchMatches, rankLocationSearchMatch } from "@/lib/locationSearchNormalize";
import { Spinner } from "@/components/ui/Spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PlatformLocationSuggestion {
  label: string;
  lat?: number | null;
  lng?: number | null;
}

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
  const [platformSuggestions, setPlatformSuggestions] = useState<PlatformLocationSuggestion[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);
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
      componentRestrictions: { country: "ca" },
      language: i18n.language?.startsWith("en") ? "en" : "fr",
    } as google.maps.places.AutocompletionRequest,
  });

  useEffect(() => {
    setValue(value, false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = inputValue.trim();
    if (q.length < 1) {
      setPlatformSuggestions([]);
      setPlatformLoading(false);
      return;
    }

    setPlatformLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/services/location-suggestions?q=${encodeURIComponent(q)}&limit=8`,
        );
        if (res.ok) {
          const rows = (await res.json()) as PlatformLocationSuggestion[];
          const sorted = Array.isArray(rows)
            ? [...rows]
                .filter((row) => locationSearchMatches(row.label, q))
                .sort(
                  (a, b) => rankLocationSearchMatch(b.label, q) - rankLocationSearchMatch(a.label, q),
                )
            : [];
          setPlatformSuggestions(sorted);
        } else {
          setPlatformSuggestions([]);
        }
      } catch {
        setPlatformSuggestions([]);
      } finally {
        setPlatformLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [inputValue]);

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

  const applySelection = async (label: string, coords?: LatLng | null) => {
    setValue(label, false);
    clearSuggestions();
    onChange(label);
    setPanelOpen(false);

    if (coords?.lat != null && coords?.lng != null) {
      onCoordsChange?.(coords);
      return;
    }

    const geocoded = await geocodeCanadianLocation(label);
    onCoordsChange?.(geocoded);
  };

  const handleSelectCity = async (placeId: string, description: string) => {
    const cityName = description.split(",")[0].trim();
    const coords = await geocodePlaceId(placeId);
    await applySelection(cityName, coords);
  };

  const handleSelectRegion = async (regionId: string) => {
    const region = CANADA_REGIONS.find((r) => r.id === regionId);
    if (!region) return;
    const label = getRegionDisplayLabel(region, langIsEnglish);
    const coords = await geocodeCanadianLocation(label);
    await applySelection(label, coords);
  };

  const handleSelectPlatform = async (suggestion: PlatformLocationSuggestion) => {
    const coords =
      suggestion.lat != null &&
      suggestion.lng != null &&
      Number.isFinite(Number(suggestion.lat)) &&
      Number.isFinite(Number(suggestion.lng))
        ? { lat: Number(suggestion.lat), lng: Number(suggestion.lng) }
        : null;
    await applySelection(suggestion.label, coords);
  };

  const hasPlatform = platformSuggestions.length > 0;
  const hasCities = cityPredictions.length > 0;
  const hasRegions = regionMatches.length > 0;
  const showPanel =
    panelOpen &&
    ready &&
    inputValue.trim().length > 0 &&
    (platformLoading || hasPlatform || hasRegions || hasCities);

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
            setPanelOpen(true);
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
        {(platformLoading || inputValue) && (
          <div className="absolute right-8 flex items-center">
            {platformLoading && <Spinner size="xs" />}
          </div>
        )}
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
              setPlatformSuggestions([]);
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
          {platformLoading && !hasPlatform && !hasRegions && !hasCities && (
            <li className="px-3 py-3 text-sm text-gray-500">{t("listings.locationSearching")}</li>
          )}

          {hasPlatform && (
            <>
              <li
                role="presentation"
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border-b border-gray-100"
              >
                {t("listings.locationPlatform")}
              </li>
              {platformSuggestions.map((suggestion) => (
                <li
                  key={suggestion.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    cancelBlurClose();
                    void handleSelectPlatform(suggestion);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-green-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50"
                >
                  <MapPin className="w-3.5 h-3.5 text-green-700 shrink-0" />
                  <span className="font-medium truncate">{suggestion.label}</span>
                </li>
              ))}
            </>
          )}

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
                      void handleSelectRegion(region.id);
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
                    void handleSelectCity(place_id, description);
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
  const { t } = useTranslation();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
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
          placeholder={t("common.loading")}
          disabled
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white opacity-60"
        />
      </div>
    );
  }

  return <CityInput {...props} />;
}
