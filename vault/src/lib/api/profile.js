import { supabase } from "../supabaseClient.js";

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// Company logo — one per user, for exported PDFs (Remodel estimates first).
// Kept here rather than a dedicated api file: it's a single field on
// profiles, same scope as the rest of this file.
const LOGO_BUCKET = "company-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const LOGO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateLogoFile(file) {
  if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
    return "Logo must be a JPG, PNG, or WEBP image.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return `Logo is too large — max 2 MB (this one is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
  }
  return null;
}

// Fixed filename (not a generated one) so a re-upload overwrites the same
// object via upsert instead of leaving the old file orphaned in storage.
export async function uploadLogo({ userId, file }) {
  const invalidReason = validateLogoFile(file);
  if (invalidReason) throw new Error(invalidReason);

  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "png";
  const storagePath = `${userId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage.from(LOGO_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  return updateProfile(userId, { logo_path: storagePath });
}

export async function removeLogo(userId, storagePath) {
  if (storagePath) {
    await supabase.storage.from(LOGO_BUCKET).remove([storagePath]);
  }
  return updateProfile(userId, { logo_path: null });
}

// Bucket is private — every view needs a short-lived signed URL.
export async function getLogoSignedUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(storagePath, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
