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
  event.respondWith(fetch(event.request));
});
