import { describe, expect, it } from "vitest";
import {
  locationLabelTokens,
  locationSearchMatches,
  normalizeLocationSearchKey,
  rankLocationSearchMatch,
} from "./locationSearchNormalize";

/** Generic cases — same rules for every city name, no hardcoded exceptions. */
const UNIVERSAL_MATCH_CASES: Array<{ label: string; queries: string[] }> = [
  { label: "Mercier - Hochelaga-Maisonneuve", queries: ["H", "Hoc", "Hochelaga", "M", "Maisonneuve"] },
  { label: "La Cité-Limoilou", queries: ["ci", "cit", "cité", "cite", "limoilou", "Limo"] },
  { label: "Dollard-des-Ormeaux", queries: ["D", "Dollard", "Ormeaux", "des"] },
  { label: "Trois-Rivières", queries: ["T", "Trois", "Riv", "Rivières"] },
  { label: "Saint-Laurent", queries: ["S", "Saint", "L", "Laurent"] },
  { label: "L'Assomption", queries: ["Ass", "Assomption", "L"] },
  { label: "Baie-d'Urfé", queries: ["Baie", "Urf", "Urfe"] },
  { label: "Mount Royal", queries: ["M", "Mount", "Royal"] },
  { label: "Cap-aux-Meules", queries: ["Cap", "Meules", "aux"] },
  { label: "Val-d'Or", queries: ["Val", "Or"] },
];

describe("locationSearchNormalize — universal rules for all cities", () => {
  it("ignores hyphens and spaces when comparing full keys", () => {
    expect(normalizeLocationSearchKey("Dollard-des-Ormeaux")).toBe(
      normalizeLocationSearchKey("Dollard des Ormeaux"),
    );
  });

  it("splits any compound label into word tokens", () => {
    const tokens = locationLabelTokens("Mercier - Hochelaga-Maisonneuve");
    expect(tokens).toContain("mercier");
    expect(tokens).toContain("hochelaga");
    expect(tokens).toContain("maisonneuve");
  });

  for (const { label, queries } of UNIVERSAL_MATCH_CASES) {
    describe(label, () => {
      for (const query of queries) {
        it(`matches "${query}"`, () => {
          expect(locationSearchMatches(label, query)).toBe(true);
        });
      }
    });
  }

  it("ranks the best token match higher than unrelated cities", () => {
    expect(rankLocationSearchMatch("Trois-Rivières", "riv")).toBeGreaterThan(
      rankLocationSearchMatch("Montréal", "riv"),
    );
    expect(rankLocationSearchMatch("Saint-Laurent", "lau")).toBeGreaterThan(
      rankLocationSearchMatch("Québec", "lau"),
    );
  });
});
