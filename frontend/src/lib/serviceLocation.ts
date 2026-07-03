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

  if (Array.isArray(service.locations) && service.locations.length > 0) {
    for (const loc of service.locations) {
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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function textMatchScore(loc: ResolvedLocation, searchText: string): number {
  const needle = normalizeSearchText(searchText);
  if (!needle) return 0;

  const haystacks = [loc.city, loc.address, loc.location].map((v) => normalizeSearchText(v ?? ""));
  let best = 0;
  for (const hay of haystacks) {
    if (!hay) continue;
    if (hay === needle) best = Math.max(best, 100);
    else if (hay.startsWith(needle) || needle.startsWith(hay)) best = Math.max(best, 80);
    else if (hay.includes(needle) || needle.includes(hay)) best = Math.max(best, 60);
  }
  return best;
}

function pickLocationIndex(
  locations: ResolvedLocation[],
  options?: ListingLocationDisplayOptions,
): number {
  if (locations.length <= 1) return 0;

  const searchLat = toFiniteNumber(options?.searchLat);
  const searchLng = toFiniteNumber(options?.searchLng);
  if (searchLat != null && searchLng != null) {
    let bestIdx = 0;
    let bestDist = Infinity;
    locations.forEach((loc, idx) => {
      const dist = haversineKm(searchLat, searchLng, loc.lat, loc.lng);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  const searchText = options?.searchText?.trim();
  if (searchText) {
    let bestIdx = 0;
    let bestScore = -1;
    locations.forEach((loc, idx) => {
      const score = textMatchScore(loc, searchText);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestScore > 0) return bestIdx;
  }

  return 0;
}

export function resolveListingLocationDisplay(
  service: ServiceLocationFields,
  options?: ListingLocationDisplayOptions,
): { label: string; extraCount: number } {
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
