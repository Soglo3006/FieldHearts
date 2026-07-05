/** Strip accents, hyphens, spaces — used for forgiving city/location matching. */
export function normalizeLocationSearchKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const TOKEN_SPLIT_RE = /[\s,/\-–—+.;:'’'"()[\]]+/;

function addNormalizedToken(tokens, raw) {
  const key = raw.replace(/[^a-z0-9]/g, "");
  if (key) tokens.add(key);
}

/** Split any location label into searchable word parts. */
export function locationLabelTokens(label) {
  const normalized = String(label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const tokens = new Set();

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

function tokenMatchesQuery(token, queryKey) {
  if (!token || !queryKey) return false;
  if (token === queryKey) return true;
  if (token.startsWith(queryKey)) return true;
  if (queryKey.length >= 2 && token.includes(queryKey)) return true;
  return false;
}

export function locationSearchMatches(haystack, needle) {
  const queryKey = normalizeLocationSearchKey(needle);
  if (!queryKey) return true;

  const full = normalizeLocationSearchKey(haystack);
  if (full.includes(queryKey)) return true;

  return locationLabelTokens(haystack).some((token) => tokenMatchesQuery(token, queryKey));
}

export function rankLocationSearchMatch(haystack, needle) {
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

const SQL_ACCENT_FROM = "éèêëàâäùûüôöîïçœÉÈÊËÀÂÄÙÛÜÔÖÎÏÇŒ";
const SQL_ACCENT_TO = "eeeeaaauuuooiicoEEEEAAAUUUOOIICO";

/** SQL expression: normalized searchable key for a text column. */
export function normalizedLocationKeySql(columnSql) {
  return `regexp_replace(lower(translate(coalesce(${columnSql}, ''), '${SQL_ACCENT_FROM}', '${SQL_ACCENT_TO}')), '[^a-z0-9]', '', 'g')`;
}

function normalizedNeedleSql(paramRef) {
  return `regexp_replace(lower(translate(${paramRef}, '${SQL_ACCENT_FROM}', '${SQL_ACCENT_TO}')), '[^a-z0-9]', '', 'g')`;
}

/** Match any token in a label that starts with (or contains) the search key. */
export function normalizedLocationTokenMatchClause(columnSql, paramRef) {
  const needle = normalizedNeedleSql(paramRef);
  return `EXISTS (
    SELECT 1
    FROM unnest(
      regexp_split_to_array(
        lower(translate(coalesce(${columnSql}, ''), '${SQL_ACCENT_FROM}', '${SQL_ACCENT_TO}')),
        '[[:space:][:punct:]]+'
      )
    ) AS token(raw_part)
    WHERE regexp_replace(raw_part, '[^a-z0-9]', '', 'g') LIKE ${needle} || '%'
       OR (
         length(${needle}) >= 2
         AND regexp_replace(raw_part, '[^a-z0-9]', '', 'g') LIKE '%' || ${needle} || '%'
       )
  )`;
}

/** SQL clause: column matches normalized search key param ($N holds raw user text). */
export function normalizedLocationMatchClause(columnSql, paramRef) {
  const col = normalizedLocationKeySql(columnSql);
  const needle = normalizedNeedleSql(paramRef);
  return `(
    ${col} LIKE '%' || ${needle} || '%'
    OR ${normalizedLocationTokenMatchClause(columnSql, paramRef)}
  )`;
}
