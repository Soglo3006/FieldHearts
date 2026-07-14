import { describe, expect, it } from "vitest";
import { resolveListingLocationForSearch } from "../src/utils/serviceLocations.js";

const multiLocationService = {
  location: "Dollard-des-Ormeaux",
  address: "Dollard-des-Ormeaux, QC",
  city: "Dollard-des-Ormeaux",
  latitude: 45.494,
  longitude: -73.8241,
  locations: [
    {
      address: "Dollard-des-Ormeaux, QC",
      city: "Dollard-des-Ormeaux",
      lat: 45.494,
      lng: -73.8241,
      location: "Dollard-des-Ormeaux",
    },
    {
      address: "La Cité-Limoilou, Québec, QC",
      city: "La Cité-Limoilou",
      lat: 46.8139,
      lng: -71.208,
      location: "La Cité-Limoilou",
    },
    {
      address: "Mercier - Hochelaga-Maisonneuve, Montréal, QC",
      city: "Mercier - Hochelaga-Maisonneuve",
      lat: 45.5888,
      lng: -73.5434,
      location: "Mercier - Hochelaga-Maisonneuve",
    },
  ],
};

describe("resolveListingLocationForSearch", () => {
  it("picks closest location for text search", () => {
    const result = resolveListingLocationForSearch(multiLocationService, {
      searchText: "La Cité-Limoilou",
    });
    expect(result.label).toMatch(/Limoilou/);
    expect(result.extraCount).toBe(2);
  });

  it("picks closest location for coordinates", () => {
    const result = resolveListingLocationForSearch(multiLocationService, {
      searchLat: 46.8139,
      searchLng: -71.208,
    });
    expect(result.label).toMatch(/Limoilou/);
    expect(result.extraCount).toBe(2);
  });
});
