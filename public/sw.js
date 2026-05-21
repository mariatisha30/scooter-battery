// Minimal service worker for app-shell offline support.
// - HTML / Next data requests: network-first, fall back to cache (so when
//   online you always see fresh data, but offline you see the last visit).
// - JS / CSS / fonts / images: cache-first, populated as you browse.
// - Server actions (POST) and Supabase API calls: passed through untouched.

const CACHE = "scooter-v3";

self.addEventListener("install", (event) => {
  // Pre-cache the entry routes so a cold offline open still boots.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/", "/trips"]).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isSameOrigin(url) {
  return new URL(url).origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!isSameOrigin(req.url)) return;

  const url = new URL(req.url);

  // Never cache server actions / RSC payload requests — they're per-session.
  if (url.pathname.startsWith("/_next/data") || url.searchParams.has("_rsc")) return;

  const accept = req.headers.get("accept") || "";
  const isNavigation = req.mode === "navigate" || accept.includes("text/html");

  if (isNavigation) {
    // network-first for pages
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = (await caches.match(req)) || (await caches.match("/"));
          if (cached) return cached;
          return new Response("Offline and no cached page available.", {
            status: 503,
            headers: { "content-type": "text/plain" },
          });
        }
      })()
    );
    return;
  }

  // cache-first for static assets
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return new Response("", { status: 504 });
      }
    })()
  );
});
