/* RVA Miles service worker — hand-written on purpose (next-pwa is
   webpack-only and Next 16 builds with Turbopack). Bump CACHE to ship a new
   shell; the activate handler deletes every other rva-miles-* cache. */

const CACHE = "rva-miles-v2-1";
const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Individually, so one 404 can't fail the whole install.
      await Promise.all(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("rva-miles-") && n !== CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    /\.(?:png|svg|ico|webp|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached app shell so a cold
  // offline launch still boots (the ledger lives in IndexedDB, not the network).
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put("/", fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return (
            (await caches.match(req)) ||
            (await caches.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  if (!isStaticAsset(url)) return;

  // Immutable build output and icons: cache-first.
  event.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok && res.type === "basic") {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })(),
  );
});
