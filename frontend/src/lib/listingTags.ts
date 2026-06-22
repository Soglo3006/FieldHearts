import { formatListingTagsDisplay } from "./categories";

export const MAX_LISTING_TAGS = 5;

export function parseListingTags(service: {
  listing_tags?: unknown;
  subcategory?: string | null;
}): string[] {
  const raw = service.listing_tags;
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  if (service.subcategory) {
    return service.subcategory
      .split(/\s*[·|]\s*|\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function formatListingCategoryLine(
  categoryName: string | null | undefined,
  service: { listing_tags?: unknown; subcategory?: string | null },
  t: (key: string, options?: { defaultValue?: string }) => string,
  separator = " · ",
): string {
  const tags = parseListingTags(service);
  return formatListingTagsDisplay(categoryName, tags, service.subcategory, t, separator);
}
