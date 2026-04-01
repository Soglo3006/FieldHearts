const NEXT_IMAGE_OPTIMIZER_MAX_URL_LENGTH = 2048;

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
