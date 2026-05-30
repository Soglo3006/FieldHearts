/** Rayon par défaut pour la recherche d'annonces autour d'une ville (km). */
export const LOCATION_SEARCH_RADIUS_KM = 50;

export type LatLng = { lat: number; lng: number };

export async function geocodeCanadianLocation(label: string): Promise<LatLng | null> {
  const trimmed = label.trim();
  if (!trimmed || typeof google === "undefined" || !google.maps?.Geocoder) {
    return null;
  }

  const geocoder = new google.maps.Geocoder();

  const tryGeocode = (address: string) =>
    new Promise<google.maps.GeocoderResult | null>((resolve) => {
      geocoder.geocode(
        { address, componentRestrictions: { country: "ca" } },
        (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        },
      );
    });

  const result =
    (await tryGeocode(`${trimmed}, Canada`)) ?? (await tryGeocode(trimmed));
  if (!result?.geometry?.location) return null;

  const loc = result.geometry.location;
  return { lat: loc.lat(), lng: loc.lng() };
}

export async function geocodePlaceId(placeId: string): Promise<LatLng | null> {
  if (!placeId || typeof google === "undefined" || !google.maps?.places) {
    return null;
  }

  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    service.getDetails(
      { placeId, fields: ["geometry"] },
      (place, status) => {
        const loc = place?.geometry?.location;
        if (status === google.maps.places.PlacesServiceStatus.OK && loc) {
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          resolve(null);
        }
      },
    );
  });
}
