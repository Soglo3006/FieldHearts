import { supabase } from "@/lib/supabaseClient";

const BUCKET = "listing-images";

/**
 * Marks the untouched version of a photo. Cropping only decides how a listing is
 * framed on cards and in the hero: the full photo is uploaded alongside it so the
 * lightbox can always show what the poster actually shot.
 */
const FULL_SUFFIX = "__full";

/** Decodes a data: URL produced by the crop pipeline into a Blob ready to upload. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/webp";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function upload(path: string, blob: Blob): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads a listing photo and returns the URL to display on cards.
 *
 * `framed` is what the poster cropped; `full` is the whole photo. When they are
 * the same image (the poster skipped cropping) a single file is stored, already
 * carrying the full-size marker.
 *
 * Files are never deleted when removed from the form: a listing being edited
 * still points at its stored file until the save actually goes through, so
 * deleting early would break a live listing if the edit is cancelled.
 */
export async function uploadListingImage(framed: string, full: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const framedBlob = dataUrlToBlob(framed);
  const ext = framedBlob.type === "image/webp" ? "webp" : "jpg";
  // RLS requires the first folder segment to match the uploader's uid.
  const base = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (framed === full) {
    return upload(`${base}${FULL_SUFFIX}.${ext}`, framedBlob);
  }

  await upload(`${base}${FULL_SUFFIX}.${ext}`, dataUrlToBlob(full));
  return upload(`${base}.${ext}`, framedBlob);
}

/**
 * Maps a card image URL to its uncropped companion. Returns the URL unchanged for
 * anything we did not upload this way (legacy base64 listings, or photos stored
 * before full versions were kept) — callers should fall back to it if it 404s.
 */
export function fullListingImageUrl(url: string): string {
  if (!url.includes(`/${BUCKET}/`)) return url;
  if (url.includes(FULL_SUFFIX)) return url;
  return url.replace(/\.(webp|jpg|jpeg|png)$/i, `${FULL_SUFFIX}.$1`);
}
