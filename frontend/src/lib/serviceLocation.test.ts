import { describe, expect, it } from "vitest";
import { resolveListingLocationDisplay } from "./serviceLocation";

function multiLocationFixture(
  locations: Array<{ city: string; address: string; lat: number; lng: number }>,
) {
  return {
    location: locations[0].city,
    address: locations[0].address,
    city: locations[0].city,
    latitude: locations[0].lat,
    longitude: locations[0].lng,
    locations: locations.map((loc) => ({
      address: loc.address,
      city: loc.city,
      lat: loc.lat,
      lng: loc.lng,
      location: loc.city,
    })),
  };
}

const GENERIC_MULTI_LOCATION = multiLocationFixture([
  {
    city: "Dollard-des-Ormeaux",
    address: "Dollard-des-Ormeaux, QC",
    lat: 45.494,
    lng: -73.8241,
  },
  {
    city: "La Cité-Limoilou",
    address: "La Cité-Limoilou, Québec, QC",
    lat: 46.8139,
    lng: -71.208,
  },
  {
    city: "Mercier - Hochelaga-Maisonneuve",
    address: "Mercier - Hochelaga-Maisonneuve, Montréal, QC",
    lat: 45.5888,
    lng: -73.5434,
  },
]);

describe("resolveListingLocationDisplay — universal word-part search", () => {
  it("shows the primary location when no search context is provided", () => {
    const result = resolveListingLocationDisplay(GENERIC_MULTI_LOCATION);
    expect(result.label).toContain("Dollard");
    expect(result.extraCount).toBe(2);
  });

  const pickCases = [
    { query: "Hoc", expect: /Hochelaga/i },
    { query: "ci", expect: /Limoilou/i },
    { query: "Maisonneuve", expect: /Maisonneuve/i },
    { query: "Ormeaux", expect: /Ormeaux/i },
  ];

  for (const { query, expect: pattern } of pickCases) {
    it(`picks the closest address when searching "${query}"`, () => {
      const result = resolveListingLocationDisplay(GENERIC_MULTI_LOCATION, {
        searchText: query,
      });
      expect(result.label).toMatch(pattern);
    });
  }
});
