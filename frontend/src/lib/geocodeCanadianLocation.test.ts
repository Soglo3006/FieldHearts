import { describe, expect, it } from "vitest";
import { MIN_AUTO_GEOCODE_LENGTH, shouldAutoGeocodeLocation } from "./geocodeCanadianLocation";

describe("shouldAutoGeocodeLocation", () => {
  it("skips auto-geocode for short partial queries", () => {
    expect(shouldAutoGeocodeLocation("cit", false)).toBe(false);
    expect(shouldAutoGeocodeLocation("ci", false)).toBe(false);
    expect(shouldAutoGeocodeLocation("H", false)).toBe(false);
  });

  it("auto-geocodes longer typed queries", () => {
    expect(shouldAutoGeocodeLocation("cité", false)).toBe(true);
    expect(shouldAutoGeocodeLocation("cite", false)).toBe(true);
    expect(shouldAutoGeocodeLocation("Montreal", false)).toBe(true);
  });

  it("always geocodes when user picked a suggestion", () => {
    expect(shouldAutoGeocodeLocation("ci", true)).toBe(true);
  });

  it("uses minimum length constant", () => {
    expect(MIN_AUTO_GEOCODE_LENGTH).toBe(4);
  });
});
