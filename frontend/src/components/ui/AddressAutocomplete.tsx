"use client";

import { useEffect } from "react";
import usePlacesAutocomplete, { getGeocode } from "use-places-autocomplete";
import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMapsConfig";

export interface AddressResult {
  adresse: string;
  fullAddress: string;
  ville: string;
  province: string;
  postalCode: string;
  country: string;
}

interface Props {
  value: string;
  onChange: (raw: string) => void;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

function extractComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
  useShort = false
): string {
  const c = components.find((c) => c.types.includes(type));
  return c ? (useShort ? c.short_name : c.long_name) : "";
}

function AddressInput({ value, onChange, onSelect, placeholder, className, id }: Props) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    defaultValue: value,
    debounce: 300,
    requestOptions: {
      types: ["address"],
      componentRestrictions: { country: "ca" },
    },
  });

  useEffect(() => {
    setValue(value, false);
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value);
          }}
          disabled={!ready}
          placeholder={ready ? placeholder : "Chargement…"}
          autoComplete="off"
          className={cn(
            "flex h-12 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
      </div>

      {status === "OK" && data.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              className="flex items-center gap-2 px-4 py-3 hover:bg-green-50 cursor-pointer text-sm text-gray-700"
              onMouseDown={async (e) => {
                e.preventDefault();
                setValue(description, false);
                clearSuggestions();
                onChange(description);
                try {
                  const results = await getGeocode({ address: description });
                  const components = results[0].address_components;

                  const streetNumber = extractComponent(components, "street_number");
                  const route = extractComponent(components, "route");
                  const city =
                    extractComponent(components, "locality") ||
                    extractComponent(components, "sublocality_level_1") ||
                    extractComponent(components, "administrative_area_level_3");
                  const province = extractComponent(components, "administrative_area_level_1");
                  const postalCode = extractComponent(components, "postal_code");
                  const country = extractComponent(components, "country", true);
                  const adresse = [streetNumber, route].filter(Boolean).join(" ");

                  onSelect({ adresse, fullAddress: description, ville: city, province, postalCode, country });
                } catch {
                  // keep raw description if geocoding fails
                }
              }}
            >
              <MapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AddressAutocomplete(props: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  if (!isLoaded) {
    return (
      <div className={cn("relative", props.className)}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
        <input
          id={props.id}
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="Chargement…"
          disabled
          className={cn(
            "flex h-12 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm",
            "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
      </div>
    );
  }

  return <AddressInput {...props} />;
}
