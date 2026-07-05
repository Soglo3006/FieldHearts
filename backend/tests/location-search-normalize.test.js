import test from "node:test";
import assert from "node:assert/strict";
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

for (const { label, queries } of UNIVERSAL_MATCH_CASES) {
  for (const query of queries) {
    test(`"${query}" matches "${label}"`, () => {
      assert.equal(locationSearchMatches(label, query), true);
    });
  }
}

test("splits any compound label into word tokens", () => {
  const tokens = locationLabelTokens("Mercier - Hochelaga-Maisonneuve");
  assert.ok(tokens.includes("mercier"));
  assert.ok(tokens.includes("hochelaga"));
  assert.ok(tokens.includes("maisonneuve"));
});

test("ranks token-prefix matches higher for any city", () => {
  assert.ok(rankLocationSearchMatch("Trois-Rivières", "riv") > rankLocationSearchMatch("Montréal", "riv"));
});
