const NEXT_IMAGE_OPTIMIZER_MAX_URL_LENGTH = 2048;

// Matches Supabase Storage object URLs:
// https://<project>.supabase.co/storage/v1/object/public/<bucket>/...
const SUPABASE_STORAGE_RE = /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object)(\/public\/.+)$/;

function normalizeImageSrc(src: string | null | undefined): string {
  return typeof src === "string" ? src.trim() : "";
}

export function shouldBypassImageOptimization(src: string | null | undefined): boolean {
  const normalizedSrc = normalizeImageSrc(src);

  if (!normalizedSrc) return false;
  if (normalizedSrc.startsWith("blob:") || normalizedSrc.startsWith("data:")) return true;

  return normalizedSrc.length > NEXT_IMAGE_OPTIMIZER_MAX_URL_LENGTH;
}

export function getSafeMetadataImageUrl(src: string | null | undefined): string | null {
  const normalizedSrc = normalizeImageSrc(src);

  if (!normalizedSrc) return null;
  if (shouldBypassImageOptimization(normalizedSrc)) return null;
  if (!/^https?:\/\//i.test(normalizedSrc)) return null;

  return normalizedSrc;
}

/**
 * Converts a Supabase Storage URL to a Supabase Image Transform URL.
 * Supabase serves resized + compressed images from the render/image path,
 * which avoids downloading the full-resolution original.
 *
 * Non-Supabase URLs (Unsplash, data:, blob:) are returned unchanged.
 */
export function getOptimizedImageUrl(
  src: string | null | undefined,
  width: number,
  quality = 75
): string {
  const normalizedSrc = normalizeImageSrc(src);
  if (!normalizedSrc) return normalizedSrc;

  const match = normalizedSrc.match(SUPABASE_STORAGE_RE);
  if (!match) return normalizedSrc;

  // e.g. https://xxx.supabase.co/storage/v1/render/image/public/<bucket>/file.jpg?width=800&quality=75
  return `${match[1].replace("/object", "/render/image")}${match[2]}?width=${width}&quality=${quality}`;
}
