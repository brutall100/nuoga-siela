// Service worker: statinis karkasas iš cache, API visada iš tinklo.
const CACHE = "nuoga-siela-v6";
const SHELL = [
  "/",
  "/css/main.css",
  "/js/app.js",
  "/js/i18n.js",
  "/js/profanity.js",
  "/js/burn.js",
  "/js/breathe.js",
  "/js/scream.js",
  "/js/theme.js",
  "/js/river.js",
  "/js/ui.js",
  "/fonts/lora-latin.woff2",
  "/fonts/lora-latin-ext.woff2",
  "/fonts/nunito-sans-latin.woff2",
  "/fonts/nunito-sans-latin-ext.woff2",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return; // srautas — tik gyvai
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        if (res.ok && e.request.method === "GET") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
    ),
  );
});
