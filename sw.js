// Lexicanum 40K — Service Worker
// Caches the app shell so it installs as a PWA and opens fast.
// Wiki API requests are NEVER cached — they must always be live.

const CACHE = "lexicanum-shell-v2";
const SHELL = [
  "./",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Cache each file individually; a single missing file must NOT abort
      // the whole install (that would break the app).
      Promise.all(
        SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("Skip caching", url, err);
          })
        )
      )
    ).then(() => self.skipWaiting())
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

  // App shell: network-first so updates always come through, cache as fallback.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
