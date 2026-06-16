// Lexicanum 40K — Service Worker
// Caches the app shell so it installs as a PWA and opens fast / offline.
// Wiki API requests are NEVER cached — they must always be live.

const CACHE = "lexicanum-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept wiki API / external requests — always go to network.
  const isExternal = url.origin !== self.location.origin;
  if (isExternal || event.request.method !== "GET") {
    return; // let the browser handle it normally
  }

  // App shell: cache-first, fall back to network.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((res) => {
          // Cache same-origin GET responses for next time.
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        }).catch(() => cached)
      );
    })
  );
});
