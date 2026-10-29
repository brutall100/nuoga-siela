// Service worker: leidžia programėlę atidaryti be ryšio, bet niekada neužlaiko senos
// versijos. HTML, JS ir CSS — pirma iš tinklo (talpykla — tik kai nėra ryšio), todėl
// kiekvienas diegimas matosi iškart, nekeliant CACHE versijos. Šriftai, garsai ir
// paveikslėliai nesikeičia — juos imam iš talpyklos. CACHE kelk tik pakeitus SHELL sąrašą.
const CACHE = "nuoga-siela-v10";
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
  "/js/icons.js",
  "/js/mood.js",
  "/js/sounds.js",
  "/fonts/lora-latin.woff2",
  "/fonts/lora-latin-ext.woff2",
  "/fonts/nunito-latin.woff2",
  "/fonts/nunito-latin-ext.woff2",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];
const CACHE_FIRST_RE = /\.(woff2|mp3|png|svg|webp|ico)$/;
// Niekada į talpyklą: API (srautas tik gyvai), istorijų puslapiai (ištrinta istorija turi
// iškart tapti 404 ir šiame įrenginyje) ir XML (sitemap, Atom).
const NEVER_CACHE_RE = /^\/api\/|^\/istorijos\/.|\.xml$/;

self.addEventListener("install", (e) => {
  // cache: "reload" — ne iš naršyklės HTTP talpyklos, kur gali gulėti sena versija.
  const fresh = SHELL.map((url) => new Request(url, { cache: "reload" }));
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(fresh)));
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
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (NEVER_CACHE_RE.test(url.pathname)) return;
  e.respondWith(
    CACHE_FIRST_RE.test(url.pathname) ? cacheFirst(e.request) : networkFirst(e.request),
  );
});

function remember(req, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

async function networkFirst(req) {
  try {
    // "no-cache" — visada paklausti serverio, net jei HTTP talpykloje dar „šviežia“ kopija.
    // Navigacijos užklausos init'o nepriima, bet HTML serveris ir taip siunčia no-cache.
    const res = req.mode === "navigate"
      ? await fetch(req)
      : await fetch(req, { cache: "no-cache" });
    return remember(req, res);
  } catch {
    // Be ryšio: tas pats failas iš talpyklos, o bet kuris ekranas — karkasas "/".
    const cached = await caches.match(req) ??
      (req.mode === "navigate" ? await caches.match("/") : undefined);
    return cached ?? Response.error();
  }
}

async function cacheFirst(req) {
  return (await caches.match(req)) ?? remember(req, await fetch(req));
}

// Web Push: serveris siunčia tik pavadinimą, skaičių ir kelią — niekada teksto turinio.
// Tas pats tag: naujas pranešimas pakeičia seną, užrakto ekrane nesikaupia krūva.
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    // Netikėtas turinys — rodom bendrą pranešimą.
  }
  e.waitUntil(
    self.registration.showNotification(data.title || "Nuoga Siela", {
      body: data.body || "",
      icon: "/icons/icon-512.png",
      tag: "srautas",
      renotify: true,
      data: {
        // Tik savos svetainės kelias (ne "//kitas.lt").
        url: typeof data.url === "string" && /^\/(?!\/)/.test(data.url) ? data.url : "/srautas",
      },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/srautas", location.origin).href;
  e.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((c) => new URL(c.url).origin === location.origin);
    if (open) {
      await open.focus();
      return open.navigate(url).catch(() => {});
    }
    return self.clients.openWindow(url);
  })());
});
