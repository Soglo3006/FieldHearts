import { describe, expect, it } from "vitest";
import {
  locationLabelTokens,
  locationSearchMatches,
  rankLocationSearchMatch,
} from "../src/utils/locationSearchNormalize.js";

const UNIVERSAL_MATCH_CASES = [
  { label: "Mercier - Hochelaga-Maisonneuve", queries: ["H", "Hoc", "Maisonneuve"] },
  { label: "La Cité-Limoilou", queries: ["ci", "cit", "cité", "limoilou"] },
  { label: "Dollard-des-Ormeaux", queries: ["D", "Ormeaux"] },
  { label: "Trois-Rivières", queries: ["T", "Riv", "Rivières"] },
  { label: "Saint-Laurent", queries: ["L", "Laurent"] },
  { label: "L'Assomption", queries: ["Ass", "Assomption"] },
  { label: "Baie-d'Urfé", queries: ["Baie", "Urf"] },
  { label: "Cap-aux-Meules", queries: ["Cap", "Meules"] },
];

describe("locationSearchMatches", () => {
  for (const { label, queries } of UNIVERSAL_MATCH_CASES) {
    for (const query of queries) {
      it(`"${query}" matches "${label}"`, () => {
        expect(locationSearchMatches(label, query)).toBe(true);
      });
    }
  }
});

describe("locationLabelTokens", () => {
  it("splits any compound label into word tokens", () => {
    const tokens = locationLabelTokens("Mercier - Hochelaga-Maisonneuve");
    expect(tokens).toContain("mercier");
    expect(tokens).toContain("hochelaga");
    expect(tokens).toContain("maisonneuve");
  });
});

describe("rankLocationSearchMatch", () => {
  it("ranks token-prefix matches higher for any city", () => {
    expect(rankLocationSearchMatch("Trois-Rivières", "riv")).toBeGreaterThan(
      rankLocationSearchMatch("Montréal", "riv"),
    );
  });
});
