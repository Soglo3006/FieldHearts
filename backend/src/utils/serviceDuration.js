/**
 * services.duration should describe job duration/scope (e.g. "2 hours", "1 day"),
 * not a pricing mode ("hourly", "/h", etc.).
 */
const RATE_ONLY_EXACT = new Set([
  "hourly",
  "hour",
  "/hourly",
  "/hr",
  "/h",
  "per hour",
  "per hr",
  "par heure",
  "a l'heure",
  "l'heure",
  "hrly",
  "$/h",
  "$/hr",
  "$ / h",
  "$ / hr",
  "hr",
  "h",
  "p/h",
  "par hr",
]);

/**
 * @param {unknown} duration
 * @returns {string | null}
 */
export function normalizeDurationForStorage(duration) {
  if (duration == null) return null;
  const value = String(duration).trim();
  if (!value) return null;

  const collapsed = value.replace(/\s+/g, " ");
  const key = collapsed.toLowerCase();

  if (RATE_ONLY_EXACT.has(key)) return null;

  // Bare rate suffix only (usually entered as pricing mode).
  if (/^\/\s*hr?$/i.test(collapsed)) return null;

  return value;
}
