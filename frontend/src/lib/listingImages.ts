import { supabase } from "@/lib/supabaseClient";

const BUCKET = "listing-images";

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

/**
 * Uploads a cropped/full data URL to Supabase Storage and returns its public URL.
 * Listing images used to be embedded as base64 inside services.image_urls, which
 * made every row read by the listing grid needlessly heavy.
 *
 * Images are never deleted when removed from the form: a listing being edited
 * still points at its stored file until the save actually goes through, so
 * deleting early would break a live listing if the edit is cancelled.
 */
export async function uploadListingImage(dataUrl: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  // RLS requires the first folder segment to match the uploader's uid.
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
