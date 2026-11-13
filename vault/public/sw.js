// Deliberately minimal — a network pass-through, not a cache.
//
// Browsers require an active service worker with a fetch handler before
// they'll treat a site as "installable" (the thing that makes Add to
// Home Screen produce a real standalone app icon instead of a browser
// bookmark). This app's data changes constantly and redeploys often —
// caching responses here risks serving a stale JS bundle or stale
// claim/vault data after a deploy, which is worse than the few hundred
// milliseconds a real cache would save. So this SW exists only to
// satisfy that installability requirement; every request still goes
// straight to the network, same as if there were no service worker at
// all for caching purposes.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Only intervene on GET — POST/PUT/DELETE (login, Stripe checkout,
  // every write in this app) have a request body, and re-wrapping those
  // through respondWith(fetch(event.request)) is unreliable across
  // browsers (confirmed: it broke login in Safari with a
  // "FetchEvent.respondWith received an error" failure). Not calling
  // respondWith() at all lets the browser handle the request exactly as
  // if there were no service worker — which is also fine for GETs here,
  // this was never meant to cache anything.
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
