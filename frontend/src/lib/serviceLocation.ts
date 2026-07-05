import { rankLocationSearchMatch } from "./locationSearchNormalize";

export interface StoredLocation {
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  location?: string;
}

interface ServiceLocationFields {
  location?: string | null;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean | null;
  locations?: StoredLocation[] | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface ListingLocationDisplayOptions {
  searchLat?: number;
  searchLng?: number;
  searchText?: string;
}

function cleanLocation(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type ResolvedLocation = {
  address: string;
  city: string;
  lat: number;
  lng: number;
  location?: string;
};

export function getServiceLocations(service: ServiceLocationFields): ResolvedLocation[] {
  const resolved: ResolvedLocation[] = [];
  const locationsList = parseLocationsField(service.locations);

  if (locationsList && locationsList.length > 0) {
    for (const loc of locationsList) {
      const lat = toFiniteNumber(loc.lat);
      const lng = toFiniteNumber(loc.lng);
      if (lat == null || lng == null) continue;
      const address = cleanLocation(loc.address) ?? cleanLocation(loc.location) ?? cleanLocation(loc.city);
      const city = cleanLocation(loc.city) ?? cleanLocation(loc.address) ?? cleanLocation(loc.location);
      if (!address && !city) continue;
      resolved.push({
        address: address ?? city!,
        city: city ?? address!,
        lat,
        lng,
        location: cleanLocation(loc.location) ?? address ?? city ?? undefined,
      });
    }
    if (resolved.length > 0) return resolved;
  }

  const lat = toFiniteNumber(service.latitude);
  const lng = toFiniteNumber(service.longitude);
  if (lat != null && lng != null) {
    const address = cleanLocation(service.address) ?? cleanLocation(service.location) ?? cleanLocation(service.city);
    const city = cleanLocation(service.city) ?? cleanLocation(service.location) ?? cleanLocation(service.address);
    if (address || city) {
      return [
        {
          address: address ?? city!,
          city: city ?? address!,
          lat,
          lng,
          location: cleanLocation(service.location) ?? address ?? city ?? undefined,
        },
      ];
    }
  }

  return [];
}

function publicLabelForLocation(
  loc: ResolvedLocation,
  hideExact: boolean,
): string {
  if (hideExact) {
    return cleanLocation(loc.city) ?? cleanLocation(loc.location) ?? cleanLocation(loc.address) ?? "";
  }
  return cleanLocation(loc.address) ?? cleanLocation(loc.location) ?? cleanLocation(loc.city) ?? "";
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function textMatchScore(loc: ResolvedLocation, searchText: string): number {
  const values = [loc.city, loc.address, loc.location].filter(Boolean) as string[];
  let best = 0;
  for (const value of values) {
    best = Math.max(best, rankLocationSearchMatch(value, searchText));
  }
  return best;
}

function distanceScoreKm(distKm: number): number {
  if (distKm <= 5) return 50;
  if (distKm <= 25) return 45 - distKm * 0.4;
  if (distKm <= 50) return 30 - (distKm - 25) * 0.4;
  if (distKm <= 150) return Math.max(0, 15 - (distKm - 50) / 10);
  return 0;
}

function pickLocationIndex(
  locations: ResolvedLocation[],
  options?: ListingLocationDisplayOptions,
): number {
  if (locations.length <= 1) return 0;

  const searchLat = toFiniteNumber(options?.searchLat);
  const searchLng = toFiniteNumber(options?.searchLng);
  const searchText = options?.searchText?.trim();
  const hasCoords = searchLat != null && searchLng != null;
  const hasText = Boolean(searchText);

  if (!hasCoords && !hasText) return 0;

  let bestIdx = 0;
  let bestScore = -1;

  locations.forEach((loc, idx) => {
    let score = 0;
    if (hasText && searchText) {
      score += textMatchScore(loc, searchText) * 2;
    }
    if (hasCoords && searchLat != null && searchLng != null) {
      score += distanceScoreKm(haversineKm(searchLat, searchLng, loc.lat, loc.lng));
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestScore > 0 ? bestIdx : 0;
}

function parseLocationsField(raw: unknown): StoredLocation[] | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as StoredLocation[]) : null;
    } catch {
      return null;
    }
  }
  return Array.isArray(raw) ? raw : null;
}

export interface ListingLocationDisplayResult {
  label: string;
  extraCount: number;
}

export function resolveListingLocationDisplay(
  service: ServiceLocationFields & {
    display_location_label?: string | null;
    display_location_extra_count?: number | string | null;
  },
  options?: ListingLocationDisplayOptions,
): ListingLocationDisplayResult {
  const apiLabel = service.display_location_label?.trim();
  if (apiLabel) {
    const extraRaw = Number(service.display_location_extra_count ?? 0);
    return {
      label: apiLabel,
      extraCount: Number.isFinite(extraRaw) ? Math.max(0, extraRaw) : 0,
    };
  }

  const locations = getServiceLocations(service);
  const hideExact = Boolean(service.hide_exact_location);

  if (locations.length === 0) {
    return { label: getPublicServiceLocation(service), extraCount: 0 };
  }

  const idx = pickLocationIndex(locations, options);
  const label = publicLabelForLocation(locations[idx], hideExact);
  const extraCount = Math.max(0, locations.length - 1);

  return { label, extraCount };
}

export function getExactServiceLocation(service: ServiceLocationFields): string {
  const locations = getServiceLocations(service);
  if (locations.length > 0) {
    return publicLabelForLocation(locations[0], false);
  }
  return cleanLocation(service.address) ?? cleanLocation(service.location) ?? cleanLocation(service.city) ?? "";
}

export function getPublicServiceLocation(service: ServiceLocationFields): string {
  const locations = getServiceLocations(service);
  if (locations.length > 0) {
    return publicLabelForLocation(locations[0], Boolean(service.hide_exact_location));
  }

  if (service.hide_exact_location) {
    return cleanLocation(service.city) ?? cleanLocation(service.location) ?? cleanLocation(service.address) ?? "";
  }

  return getExactServiceLocation(service);
}

export function hasApproximateServiceLocation(service: ServiceLocationFields): boolean {
  return Boolean(service.hide_exact_location);
}

export type ServiceLocationEntry = {
  label: string;
  lat: number;
  lng: number;
  mapsUrl: string;
};

export function buildGoogleMapsUrl(label: string, lat: number, lng: number): string {
  const query = label.trim() || `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getServiceLocationEntries(service: ServiceLocationFields): ServiceLocationEntry[] {
  const hideExact = Boolean(service.hide_exact_location);
  return getServiceLocations(service).map((loc) => {
    const label = publicLabelForLocation(loc, hideExact);
    return {
      label,
      lat: loc.lat,
      lng: loc.lng,
      mapsUrl: buildGoogleMapsUrl(label, loc.lat, loc.lng),
    };
  });
}
