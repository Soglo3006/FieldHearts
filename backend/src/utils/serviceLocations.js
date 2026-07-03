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
  return `(
    s.location ILIKE ${paramRef}
    OR s.city ILIKE ${paramRef}
    OR COALESCE(s.address, '') ILIKE ${paramRef}
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(s.locations, '[]'::jsonb)) AS loc(value)
      WHERE loc.value->>'city' ILIKE ${paramRef}
         OR loc.value->>'address' ILIKE ${paramRef}
         OR loc.value->>'location' ILIKE ${paramRef}
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
