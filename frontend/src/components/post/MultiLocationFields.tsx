"use client";

import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import LocationAutocomplete, {
  type LocationDetails,
  isResolvedLocationDetails,
} from "@/components/post/LocationAutocomplete";

export const MAX_LISTING_LOCATIONS = 5;

export interface LocationEntry {
  id: string;
  value: string;
  details: LocationDetails | null;
}

interface Props {
  entries: LocationEntry[];
  onChange: (entries: LocationEntry[]) => void;
  idPrefix: string;
  required?: boolean;
}

function newEntryId() {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyLocationEntry(): LocationEntry {
  return { id: newEntryId(), value: "", details: null };
}

export function locationsFromEntries(entries: LocationEntry[]) {
  return entries
    .filter((e) => isResolvedLocationDetails(e.details))
    .map((e) => ({
      address: e.details!.address,
      city: e.details!.city,
      lat: e.details!.lat,
      lng: e.details!.lng,
      location: e.value.trim() || e.details!.address,
    }));
}

export function entriesFromServiceLocations(
  locations: Array<{ address?: string; city?: string; lat?: number; lng?: number; location?: string }> | undefined,
  fallback?: { location?: string; address?: string; city?: string; latitude?: number | null; longitude?: number | null },
): LocationEntry[] {
  const list = Array.isArray(locations) && locations.length > 0 ? locations : null;

  if (list) {
    return list.map((loc) => {
      const lat = loc.lat != null ? Number(loc.lat) : NaN;
      const lng = loc.lng != null ? Number(loc.lng) : NaN;
      const value = loc.location ?? loc.address ?? loc.city ?? "";
      const details =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? {
              address: loc.address ?? value,
              city: loc.city ?? value,
              lat,
              lng,
            }
          : null;
      return { id: newEntryId(), value, details };
    });
  }

  if (fallback) {
    const lat = fallback.latitude != null ? Number(fallback.latitude) : NaN;
    const lng = fallback.longitude != null ? Number(fallback.longitude) : NaN;
    const value = fallback.location ?? fallback.address ?? fallback.city ?? "";
    if (value) {
      return [
        {
          id: newEntryId(),
          value,
          details:
            Number.isFinite(lat) && Number.isFinite(lng)
              ? {
                  address: fallback.address ?? value,
                  city: fallback.city ?? value,
                  lat,
                  lng,
                }
              : null,
        },
      ];
    }
  }

  return [createEmptyLocationEntry()];
}

export default function MultiLocationFields({ entries, onChange, idPrefix, required }: Props) {
  const { t } = useTranslation();

  const updateEntry = (id: string, value: string, details?: LocationDetails) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, value, details: details ?? null } : e)));
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    onChange(entries.filter((e) => e.id !== id));
  };

  const addEntry = () => {
    if (entries.length >= MAX_LISTING_LOCATIONS) return;
    onChange([...entries, createEmptyLocationEntry()]);
  };

  const canAdd = entries.length < MAX_LISTING_LOCATIONS;

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={entry.id} className="space-y-1">
          {index > 0 && (
            <div className="flex items-center justify-between">
              <Label htmlFor={`${idPrefix}-${entry.id}`} className="text-sm font-medium text-gray-700">
                {t("post.additionalLocationNumber", { number: index })}
              </Label>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                aria-label={t("post.removeLocation")}
              >
                <X className="h-3.5 w-3.5" />
                {t("post.removeLocation")}
              </button>
            </div>
          )}
          <LocationAutocomplete
            id={`${idPrefix}-${entry.id}`}
            value={entry.value}
            onChange={(val, details) => updateEntry(entry.id, val, details)}
            placeholder={t("post.locationPlaceholder")}
            required={required && index === 0}
          />
          {entry.value.trim() !== "" && !isResolvedLocationDetails(entry.details) && (
            <p className="text-sm font-medium text-red-600">{t("post.locationMustSelectSuggestion")}</p>
          )}
        </div>
      ))}

      {canAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
        >
          <Plus className="h-4 w-4" />
          {t("post.addLocation")}
        </Button>
      )}

      {!canAdd && (
        <p className="text-xs text-gray-500">{t("post.maxLocations", { count: MAX_LISTING_LOCATIONS })}</p>
      )}
    </div>
  );
}
