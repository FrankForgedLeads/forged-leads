import { getClaimItemPhotoSignedUrl } from "../api/claimItemPhotos.js";
import { formatDate, formatGps } from "../format.js";

// Print-reasonable size, not full page — matches the product spec's "a
// reasonable print size (not full page)" requirement for the exported PDF.
const MAX_EMBED_WIDTH_PX = 480;

// Turns a claim_item_photos row into pixel data jsPDF can actually embed
// (doc.addImage needs real image bytes, not a URL). Fetches the signed
// URL, decodes it via a browser <img>, and re-encodes through a canvas as
// JPEG — this also normalizes every format (PNG/WEBP/HEIC-where-supported)
// to the one format jsPDF embeds reliably, and doubles as the resize step.
// Returns null on ANY failure (a HEIC the browser can't decode, a network
// blip, a revoked signed URL) rather than throwing — one bad photo must
// never abort the whole export; the caller just skips it.
async function loadEmbeddablePhoto(photo) {
  try {
    const url = await getClaimItemPhotoSignedUrl(photo.storage_path);
    const img = await loadImage(url);

    const scale = Math.min(1, MAX_EMBED_WIDTH_PX / img.naturalWidth);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    return {
      dataUrl,
      width,
      height,
      dateLabel: formatDate(photo.captured_at),
      gpsLabel: formatGps(photo.gps_lat, photo.gps_lng),
      caption: photo.caption || null,
    };
  } catch {
    return null;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

// photosByClaimItemId: { [claimItemId]: photoRow[] } -> same shape but each
// row replaced with its embeddable version (nulls filtered out). Loads
// every item's photos in parallel since a claim rarely has more than a
// handful of photos total.
export async function loadPhotosForPdf(photosByClaimItemId) {
  const entries = await Promise.all(
    Object.entries(photosByClaimItemId).map(async ([claimItemId, photos]) => {
      const loaded = await Promise.all(photos.map(loadEmbeddablePhoto));
      return [claimItemId, loaded.filter(Boolean)];
    }),
  );
  return Object.fromEntries(entries);
}
