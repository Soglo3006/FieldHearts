/** Strip accents, hyphens, spaces — used for forgiving city/location matching. */
export function normalizeLocationSearchKey(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const TOKEN_SPLIT_RE = /[\s,/\-–—+.;:'’'"()[\]]+/;

function addNormalizedToken(tokens: Set<string>, raw: string) {
  const key = raw.replace(/[^a-z0-9]/g, "");
  if (key) tokens.add(key);
}

/**
 * Split any location label into searchable word parts.
 * Works for all cities: hyphenated, multi-word, with articles (La, Saint), apostrophes, etc.
 */
export function locationLabelTokens(label: string): string[] {
  const normalized = String(label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const tokens = new Set<string>();

  for (const part of normalized.split(TOKEN_SPLIT_RE).filter(Boolean)) {
    addNormalizedToken(tokens, part);
    for (const sub of part.split(/[\-–—]+/).filter(Boolean)) {
      addNormalizedToken(tokens, sub);
    }
  }

  const full = normalizeLocationSearchKey(label);
  if (full) tokens.add(full);

  return [...tokens];
}

function tokenMatchesQuery(token: string, queryKey: string): boolean {
  if (!token || !queryKey) return false;
  if (token === queryKey) return true;
  if (token.startsWith(queryKey)) return true;
  if (queryKey.length >= 2 && token.includes(queryKey)) return true;
  return false;
}

/** True when any word-part of the label matches the query (any position, ignores hyphens/accents). */
export function locationSearchMatches(haystack: string, needle: string): boolean {
  const queryKey = normalizeLocationSearchKey(needle);
  if (!queryKey) return true;

  const full = normalizeLocationSearchKey(haystack);
  if (full.includes(queryKey)) return true;

  return locationLabelTokens(haystack).some((token) => tokenMatchesQuery(token, queryKey));
}

export function rankLocationSearchMatch(haystack: string, needle: string): number {
  const queryKey = normalizeLocationSearchKey(needle);
  if (!queryKey || !haystack) return 0;

  const full = normalizeLocationSearchKey(haystack);
  let best = 0;

  if (full === queryKey) best = 100;
  else if (full.startsWith(queryKey)) best = Math.max(best, 90);
  else if (full.includes(queryKey)) best = Math.max(best, 50);

  for (const token of locationLabelTokens(haystack)) {
    if (token === queryKey) best = Math.max(best, 98);
    else if (token.startsWith(queryKey)) best = Math.max(best, 88);
    else if (queryKey.length >= 2 && token.includes(queryKey)) best = Math.max(best, 72);
  }

  return best;
}
