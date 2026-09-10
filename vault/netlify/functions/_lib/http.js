// Shared by the functions in this directory. Files/folders prefixed with
// `_` are ignored by Netlify's function discovery, so this isn't itself
// deployed as an endpoint.
export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
