import test from "node:test";
import assert from "node:assert/strict";
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

test("resolveListingLocationForSearch picks closest location for text search", () => {
  const result = resolveListingLocationForSearch(multiLocationService, {
    searchText: "La Cité-Limoilou",
  });
  assert.match(result.label, /Limoilou/);
  assert.equal(result.extraCount, 2);
});

test("resolveListingLocationForSearch picks closest location for coordinates", () => {
  const result = resolveListingLocationForSearch(multiLocationService, {
    searchLat: 46.8139,
    searchLng: -71.208,
  });
  assert.match(result.label, /Limoilou/);
  assert.equal(result.extraCount, 2);
});
