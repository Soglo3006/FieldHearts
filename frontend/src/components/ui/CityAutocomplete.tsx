"use client";

import { useEffect } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { useJsApiLoader, type Libraries } from "@react-google-maps/api";
import { MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LIBRARIES: Libraries = ["places"];

interface Props {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}

function CityInput({ value, onChange, placeholder, className }: Props) {
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
      language: "fr",
    } as google.maps.places.AutocompletionRequest,
  });

  useEffect(() => {
    setValue(value, false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (description: string) => {
    // Extract just the city name (before the first comma)
    const cityName = description.split(",")[0].trim();
    setValue(cityName, false);
    clearSuggestions();
    onChange(cityName);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value);
          }}
          disabled={!ready}
          placeholder={ready ? (placeholder ?? "Ville...") : "Chargement…"}
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => { setValue("", false); clearSuggestions(); onChange(""); }}
            className="cursor-pointer absolute right-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {status === "OK" && data.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(description); }}
              className="flex items-center gap-2 px-3 py-2.5 hover:bg-green-50 cursor-pointer text-sm text-gray-700"
            >
              <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span>
                <span className="font-medium">{description.split(",")[0]}</span>
                <span className="text-gray-400">{description.includes(",") ? "," + description.split(",").slice(1).join(",") : ""}</span>
              </span>
            </li>
          ))}
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
