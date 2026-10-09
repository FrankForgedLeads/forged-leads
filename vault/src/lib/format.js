const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return currencyFormatter.format(amount);
}

export function formatRange(low, high, unit) {
  const parts = [];
  if (low !== null && low !== undefined) parts.push(formatCurrency(low));
  if (high !== null && high !== undefined) parts.push(formatCurrency(high));
  const range = parts.length === 2 ? parts.join(" – ") : parts[0] ?? "—";
  return unit ? `${range} / ${unit}` : range;
}

export function midpoint(low, high) {
  if (low === null || low === undefined) return high ?? 0;
  if (high === null || high === undefined) return low ?? 0;
  return (Number(low) + Number(high)) / 2;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Plain "lat, lng" text — good enough for v1 per the product spec (no map
// needed), paired with googleMapsUrl() below for the one-click "View on
// map" link. Six decimals is roughly 10cm precision, more than enough for
// a property photo and matches common GPS-tag display conventions.
export function formatGps(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function googleMapsUrl(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
