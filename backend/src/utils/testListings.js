/** Listings whose title starts with [TEST] are dev fixtures — hidden from public prod browse. */
export function isTestListingTitle(title) {
  return typeof title === "string" && title.trim().toUpperCase().startsWith("[TEST]");
}

export function shouldHideTestListingsFromPublic() {
  if (process.env.EXCLUDE_TEST_LISTINGS === "true" || process.env.EXCLUDE_TEST_LISTINGS === "1") {
    return true;
  }
  if (process.env.EXCLUDE_TEST_LISTINGS === "false" || process.env.EXCLUDE_TEST_LISTINGS === "0") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

/** SQL fragment + params for public listing queries (alias = services table alias). */
export function publicTestListingFilter(alias = "s") {
  if (!shouldHideTestListingsFromPublic()) return "";
  return ` AND ${alias}.title NOT ILIKE '[TEST]%'`;
}
