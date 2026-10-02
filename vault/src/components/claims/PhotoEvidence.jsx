import { useEffect, useRef, useState } from "react";
import {
  uploadClaimItemPhoto,
  deleteClaimItemPhoto,
  getClaimItemPhotoSignedUrl,
  validateClaimItemPhoto,
  CLAIM_ITEM_PHOTOS_MAX_PER_ITEM,
} from "../../lib/api/claimItemPhotos.js";
import { formatDate, formatGps, googleMapsUrl } from "../../lib/format.js";

// Photo Evidence (internal name: vault-photos) — every photo here is tied
// to this ONE claim_item, never a general gallery. That link is the whole
// point of the feature (see the product spec): capture, link, store,
// export — no AI captioning, no angle-matching, none of that in v1.
export default function PhotoEvidence({ claimItemId, photos, userId, onPhotosChanged }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [urlsById, setUrlsById] = useState({});
  const inputRef = useRef(null);

  // Signed URLs are short-lived (5 min, same as review-files) — fetch once
  // per photo id we haven't already resolved, rather than re-fetching on
  // every render. A stale URL just means re-opening the item refreshes it;
  // nothing in this feature needs a URL to stay valid longer than a view.
  useEffect(() => {
    let active = true;
    const missing = photos.filter((p) => !urlsById[p.id]);
    if (missing.length === 0) return undefined;
    Promise.all(
      missing.map((p) => getClaimItemPhotoSignedUrl(p.storage_path).then((url) => [p.id, url])),
    ).then((pairs) => {
      if (!active) return;
      setUrlsById((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  async function handleFiles(fileList) {
    const incoming = Array.from(fileList);
    if (photos.length + incoming.length > CLAIM_ITEM_PHOTOS_MAX_PER_ITEM) {
      setError(`You can attach up to ${CLAIM_ITEM_PHOTOS_MAX_PER_ITEM} photos per item.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      for (const file of incoming) {
        const invalidReason = validateClaimItemPhoto(file);
        if (invalidReason) {
          setError(`${file.name}: ${invalidReason}`);
          continue;
        }
        // Missing/unreadable EXIF is handled inside uploadClaimItemPhoto —
        // this never throws for that reason, only for a real upload
        // failure (network, storage, RLS).
        await uploadClaimItemPhoto({ claimItemId, userId, file });
      }
      onPhotosChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(photo) {
    try {
      await deleteClaimItemPhoto({ id: photo.id, storagePath: photo.storage_path });
      onPhotosChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div
      className={`mt-3 rounded-xl border border-dashed p-3 transition ${
        dragOver ? "border-gold-500 bg-gold-500/5" : "border-navy-600"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">
          Photo evidence {photos.length > 0 && `(${photos.length})`}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-bold text-gold-500 hover:underline disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Add photo evidence"}
        </button>
      </div>

      {photos.length === 0 && !dragOver && (
        <p className="mt-1.5 text-xs text-white/30">Drag photos here, or use the button above.</p>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-red-400">{error}</p>}

      {photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {photos.map((photo) => (
            <PhotoThumb key={photo.id} photo={photo} url={urlsById[photo.id]} onRemove={() => handleRemove(photo)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoThumb({ photo, url, onRemove }) {
  const gps = formatGps(photo.gps_lat, photo.gps_lng);
  const mapsUrl = googleMapsUrl(photo.gps_lat, photo.gps_lng);

  return (
    <div className="w-28 shrink-0">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-navy-600 bg-navy-950/60">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt={photo.caption || photo.file_name} className="h-full w-full object-cover" />
          </a>
        ) : (
          <div className="flex h-full items-center justify-center text-white/20">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-navy-600 border-t-gold-500" />
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove photo"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy-950/80 text-white/70 hover:bg-red-500/80 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-tight text-white/50">{formatDate(photo.captured_at)}</p>
      {gps && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] leading-tight text-gold-500/80 hover:underline"
        >
          View on map ↗
        </a>
      )}
    </div>
  );
}
