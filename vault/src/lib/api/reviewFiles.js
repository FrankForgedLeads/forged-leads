import { supabase } from "../supabaseClient.js";
import { logEvent } from "./analyticsEvents.js";

// Must match the storage.buckets row in supabase/migration.sql — kept here
// too so the UI can reject an oversized/wrong-type file with a clear
// message before ever hitting the network, instead of surfacing whatever
// error Supabase Storage happens to return.
export const REVIEW_FILE_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
export const REVIEW_FILE_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
// A soft cap on files per review — not a hard product limit, just a sane
// ceiling so nobody accidentally uploads hundreds of photos to one claim
// against the Storage free tier.
export const REVIEW_FILES_MAX_PER_CLAIM = 30;

const BUCKET = "review-files";

export function validateReviewFile(file) {
  if (!REVIEW_FILE_ALLOWED_TYPES.includes(file.type)) {
    return "Only PDF, JPG, PNG, WEBP, or HEIC files are supported.";
  }
  if (file.size > REVIEW_FILE_MAX_BYTES) {
    return `File is too large — max 15 MB (this one is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
  }
  return null;
}

export async function fetchReviewFiles(claimId) {
  const { data, error } = await supabase
    .from("review_files")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// Uploads straight from the browser to Storage (never through a Netlify
// Function — see the Phase 2 architecture notes: functions have a ~6MB
// request-body ceiling on the free tier, so routing file bytes through one
// would break on anything but the smallest photos), then records the
// review_files row. Storage path is prefixed with the uploader's own user
// id, matching the storage.objects RLS policies in the migration.
export async function uploadReviewFile({ claimId, userId, file, fileType }) {
  const invalidReason = validateReviewFile(file);
  if (invalidReason) throw new Error(invalidReason);

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const safeName = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const storagePath = `${userId}/${claimId}/${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("review_files")
    .insert({
      claim_id: claimId,
      file_type: fileType,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    // Row insert failed after the upload succeeded — clean up the orphaned
    // object rather than leaving unreferenced bytes in the bucket.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  if (fileType === "estimate") logEvent("estimate_uploaded", userId, { claim_id: claimId });
  if (fileType === "photo") logEvent("photos_uploaded", userId, { claim_id: claimId });

  return data;
}

export async function deleteReviewFile({ id, storagePath }) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("review_files").delete().eq("id", id);
  if (error) throw error;
}

// Bucket is private — every view/download needs a short-lived signed URL
// rather than a public path.
export async function getReviewFileSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
