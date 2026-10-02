import { supabase } from "../supabaseClient.js";

// Must match the storage.buckets row in supabase/migration.sql — kept here
// too so the UI can reject an oversized/wrong-type file with a clear
// message before ever hitting the network, same convention as
// reviewFiles.js. Image types only — this bucket is strictly photo
// evidence, not general documents.
export const CLAIM_ITEM_PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const CLAIM_ITEM_PHOTO_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
// A soft cap per line item, not a hard product limit — just a sane ceiling
// so nobody accidentally attaches hundreds of photos to one item against
// the Storage free tier (Supabase free tier is 1 GB total; flag it to
// Frankie if real usage starts approaching that — see README).
export const CLAIM_ITEM_PHOTOS_MAX_PER_ITEM = 20;

const BUCKET = "claim-item-photos";

export function validateClaimItemPhoto(file) {
  if (!CLAIM_ITEM_PHOTO_ALLOWED_TYPES.includes(file.type)) {
    return "Only JPG, PNG, WEBP, or HEIC photos are supported.";
  }
  if (file.size > CLAIM_ITEM_PHOTO_MAX_BYTES) {
    return `Photo is too large — max 10 MB (this one is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
  }
  return null;
}

// Best-effort EXIF read, client-side only (no backend image processing per
// the product spec). Never throws and never blocks the upload — a photo
// with no EXIF (screenshot, stripped metadata, a format exifr can't fully
// parse) just comes back with everything null, and the caller falls back
// to upload time. This is the ONE place that decides "missing EXIF is not
// an error," so every call site downstream can stay simple.
async function extractPhotoMeta(file) {
  try {
    const exifr = await import("exifr");
    const data = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"],
      gps: true,
    });
    const capturedAt = data?.DateTimeOriginal || data?.CreateDate || null;
    const lat = typeof data?.latitude === "number" ? data.latitude : null;
    const lng = typeof data?.longitude === "number" ? data.longitude : null;
    return {
      capturedAt: capturedAt instanceof Date && !Number.isNaN(capturedAt.getTime()) ? capturedAt : null,
      gpsLat: lat,
      gpsLng: lng,
    };
  } catch {
    // exifr throws on some inputs (corrupt EXIF block, a format it doesn't
    // fully support) rather than returning an empty result — treat that
    // identically to "no EXIF found," never surface it to the user.
    return { capturedAt: null, gpsLat: null, gpsLng: null };
  }
}

// One query for the whole claim rather than one per line item — the caller
// (ClaimDetail) already has every claim_items id loaded, so this fetches
// every linked photo in a single round trip and the caller groups by
// claim_item_id.
export async function fetchPhotosForClaimItems(claimItemIds) {
  if (!claimItemIds || claimItemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("claim_item_photos")
    .select("*")
    .in("claim_item_id", claimItemIds)
    .order("uploaded_at", { ascending: true });
  if (error) throw error;
  return data;
}

// Uploads straight from the browser to Storage (same reasoning as
// uploadReviewFile — Netlify Functions have a ~6MB request-body ceiling on
// the free tier), extracts EXIF client-side, then records the
// claim_item_photos row. Storage path is prefixed with the uploader's own
// user id, matching the storage.objects RLS policies in the migration.
export async function uploadClaimItemPhoto({ claimItemId, userId, file, caption }) {
  const invalidReason = validateClaimItemPhoto(file);
  if (invalidReason) throw new Error(invalidReason);

  const { capturedAt, gpsLat, gpsLng } = await extractPhotoMeta(file);

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const safeName = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const storagePath = `${userId}/${claimItemId}/${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("claim_item_photos")
    .insert({
      claim_item_id: claimItemId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      // Falls back to "now" when EXIF has no capture timestamp — the column
      // is not-null so the row always has a real date to show/export,
      // without the UI needing to know which source it came from.
      captured_at: (capturedAt ?? new Date()).toISOString(),
      uploaded_by: userId,
      caption: caption || null,
    })
    .select("*")
    .single();

  if (error) {
    // Row insert failed after the upload succeeded — clean up the orphaned
    // object rather than leaving unreferenced bytes in the bucket.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
  return data;
}

export async function deleteClaimItemPhoto({ id, storagePath }) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("claim_item_photos").delete().eq("id", id);
  if (error) throw error;
}

// Bucket is private — every view/download needs a short-lived signed URL
// rather than a public path, same as review-files.
export async function getClaimItemPhotoSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
