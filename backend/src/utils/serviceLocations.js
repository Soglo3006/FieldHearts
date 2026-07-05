import { normalizedLocationMatchClause, rankLocationSearchMatch } from "./locationSearchNormalize.js";

const MAX_LISTING_LOCATIONS = 5;

let schemaReady = false;
let schemaInitPromise = null;

export { MAX_LISTING_LOCATIONS };

export async function ensureServiceLocationsSchema(pool) {
  if (schemaReady) return;
  if (!schemaInitPromise) {
    schemaInitPromise = pool
      .query(`
        ALTER TABLE services ADD COLUMN IF NOT EXISTS locations jsonb NOT NULL DEFAULT '[]'::jsonb;

        UPDATE services
        SET locations = jsonb_build_array(
          jsonb_build_object(
            'address', COALESCE(NULLIF(trim(address), ''), NULLIF(trim(location), ''), ''),
            'city', COALESCE(NULLIF(trim(city), ''), NULLIF(trim(location), ''), ''),
            'lat', latitude,
            'lng', longitude,
            'location', COALESCE(NULLIF(trim(location), ''), NULLIF(trim(address), ''), '')
          )
        )
        WHERE (locations IS NULL OR locations = '[]'::jsonb)
          AND (
            latitude IS NOT NULL
            OR NULLIF(trim(location), '') IS NOT NULL
            OR NULLIF(trim(address), '') IS NOT NULL
          );
      `)
      .then(() => {
        schemaReady = true;
      });
  }
  await schemaInitPromise;
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeOneLocation(raw, fallbackLabel = "") {
  if (!raw || typeof raw !== "object") return null;

  const lat = toFiniteNumber(raw.lat ?? raw.latitude);
  const lng = toFiniteNumber(raw.lng ?? raw.longitude);
  if (lat == null || lng == null) return null;

  const address = String(raw.address ?? raw.location ?? fallbackLabel ?? "").trim();
  const city = String(raw.city ?? raw.location ?? address ?? "").trim();
  const location = String(raw.location ?? address ?? city ?? "").trim();

  if (!address && !city && !location) return null;

  return {
    address: address || city || location,
    city: city || address || location,
    lat,
    lng,
    location: location || address || city,
  };
}

export function normalizeLocationsInput(body, existing = null) {
  const rawList = Array.isArray(body?.locations) ? body.locations : null;

  if (rawList) {
    const normalized = rawList
      .map((item) => normalizeOneLocation(item))
      .filter(Boolean)
      .slice(0, MAX_LISTING_LOCATIONS);

    if (normalized.length === 0) {
      return { error: "At least one valid location is required" };
    }

    return { locations: normalized };
  }

  const single = normalizeOneLocation(
    {
      address: body?.address ?? existing?.address,
      city: body?.city ?? existing?.city,
      lat: body?.latitude ?? existing?.latitude,
      lng: body?.longitude ?? existing?.longitude,
      location: body?.location ?? existing?.location,
    },
    String(body?.location ?? existing?.location ?? ""),
  );

  if (!single) {
    return { error: "At least one valid location is required" };
  }

  return { locations: [single] };
}

export function primaryLocationFields(locations) {
  const first = locations?.[0];
  if (!first) {
    return {
      location: null,
      address: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }

  return {
    location: first.location ?? first.address ?? first.city ?? null,
    address: first.address ?? first.location ?? first.city ?? null,
    city: first.city ?? first.location ?? first.address ?? null,
    latitude: first.lat ?? null,
    longitude: first.lng ?? null,
  };
}

/** SQL fragment: text match on flat columns OR any entry in locations jsonb. */
export function locationTextMatchClause(paramRef) {
  const jsonCity = `loc.value->>'city'`;
  const jsonAddress = `loc.value->>'address'`;
  const jsonLocation = `loc.value->>'location'`;

  return `(
    ${normalizedLocationMatchClause("s.location", paramRef)}
    OR ${normalizedLocationMatchClause("s.city", paramRef)}
    OR ${normalizedLocationMatchClause("COALESCE(s.address, '')", paramRef)}
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(s.locations, '[]'::jsonb)) AS loc(value)
      WHERE ${normalizedLocationMatchClause(jsonCity, paramRef)}
         OR ${normalizedLocationMatchClause(jsonAddress, paramRef)}
         OR ${normalizedLocationMatchClause(jsonLocation, paramRef)}
    )
  )`;
}

/** Haversine distance in km using service flat coords OR any jsonb location. */
export function minDistanceExpr(userLatParam, userLngParam) {
  const flatDist = `(6371 * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(${userLatParam})) * cos(radians(s.latitude)) *
      cos(radians(s.longitude) - radians(${userLngParam})) +
      sin(radians(${userLatParam})) * sin(radians(s.latitude))
    ))
  ))`;

  const jsonDist = `(
    SELECT MIN(6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(${userLatParam})) * cos(radians((loc.value->>'lat')::double precision)) *
        cos(radians((loc.value->>'lng')::double precision) - radians(${userLngParam})) +
        sin(radians(${userLatParam})) * sin(radians((loc.value->>'lat')::double precision))
      ))
    ))
    FROM jsonb_array_elements(COALESCE(s.locations, '[]'::jsonb)) AS loc(value)
    WHERE (loc.value->>'lat') ~ '^-?[0-9]+(\\.[0-9]+)?$'
      AND (loc.value->>'lng') ~ '^-?[0-9]+(\\.[0-9]+)?$'
  )`;

  return `LEAST(
    CASE WHEN s.latitude IS NOT NULL AND s.longitude IS NOT NULL THEN ${flatDist} ELSE 999999 END,
    COALESCE(${jsonDist}, 999999)
  )`;
}

export function withinRadiusClause(userLatParam, userLngParam, radiusParam) {
  const flatMatch = `(s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND (6371 * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(${userLatParam})) * cos(radians(s.latitude)) *
      cos(radians(s.longitude) - radians(${userLngParam})) +
      sin(radians(${userLatParam})) * sin(radians(s.latitude))
    ))
  )) <= ${radiusParam})`;

  const jsonMatch = `EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(s.locations, '[]'::jsonb)) AS loc(value)
    WHERE (loc.value->>'lat') ~ '^-?[0-9]+(\\.[0-9]+)?$'
      AND (loc.value->>'lng') ~ '^-?[0-9]+(\\.[0-9]+)?$'
      AND (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${userLatParam})) * cos(radians((loc.value->>'lat')::double precision)) *
          cos(radians((loc.value->>'lng')::double precision) - radians(${userLngParam})) +
          sin(radians(${userLatParam})) * sin(radians((loc.value->>'lat')::double precision))
        ))
      )) <= ${radiusParam}
  )`;

  return `(${flatMatch} OR ${jsonMatch})`;
}

function textMatchScore(loc, searchText) {
  const values = [loc.city, loc.address, loc.location].filter(Boolean);
  let best = 0;
  for (const value of values) {
    best = Math.max(best, rankLocationSearchMatch(value, searchText));
  }
  return best;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceScoreKm(distKm) {
  if (distKm <= 5) return 50;
  if (distKm <= 25) return 45 - distKm * 0.4;
  if (distKm <= 50) return 30 - (distKm - 25) * 0.4;
  if (distKm <= 150) return Math.max(0, 15 - (distKm - 50) / 10);
  return 0;
}

function getServiceLocationsFromRow(service) {
  const resolved = [];
  const rawList = Array.isArray(service.locations)
    ? service.locations
    : typeof service.locations === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(service.locations);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  if (rawList.length > 0) {
    for (const loc of rawList) {
      const normalized = normalizeOneLocation(loc);
      if (normalized) resolved.push(normalized);
    }
    if (resolved.length > 0) return resolved;
  }

  const single = normalizeOneLocation(
    {
      address: service.address,
      city: service.city,
      lat: service.latitude,
      lng: service.longitude,
      location: service.location,
    },
    String(service.location ?? ""),
  );

  return single ? [single] : [];
}

function publicLabelForLocation(loc, hideExact) {
  if (hideExact) {
    return String(loc.city ?? loc.location ?? loc.address ?? "").trim();
  }
  return String(loc.address ?? loc.location ?? loc.city ?? "").trim();
}

function pickLocationIndex(locations, options = {}) {
  if (locations.length <= 1) return 0;

  const searchLat = toFiniteNumber(options.searchLat);
  const searchLng = toFiniteNumber(options.searchLng);
  const searchText = String(options.searchText ?? "").trim();
  const hasCoords = searchLat != null && searchLng != null;
  const hasText = Boolean(searchText);

  if (!hasCoords && !hasText) return 0;

  let bestIdx = 0;
  let bestScore = -1;

  locations.forEach((loc, idx) => {
    let score = 0;
    if (hasText) score += textMatchScore(loc, searchText) * 2;
    if (hasCoords) score += distanceScoreKm(haversineKm(searchLat, searchLng, loc.lat, loc.lng));
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestScore > 0 ? bestIdx : 0;
}

/** Pick the listing location label closest to a search query (text and/or coordinates). */
export function resolveListingLocationForSearch(service, options = {}) {
  const locations = getServiceLocationsFromRow(service);
  const hideExact = Boolean(service.hide_exact_location);

  if (locations.length === 0) {
    const fallback = hideExact
      ? String(service.city ?? service.location ?? service.address ?? "").trim()
      : String(service.address ?? service.location ?? service.city ?? "").trim();
    return { label: fallback, extraCount: 0 };
  }

  const idx = pickLocationIndex(locations, options);
  return {
    label: publicLabelForLocation(locations[idx], hideExact),
    extraCount: Math.max(0, locations.length - 1),
  };
}
