// Nuoga Siela — anoniminė emocinio išsiliejimo erdvė.
// Vienas serveris: statika iš /public + JSON API iš /api.
// Loguose sąmoningai NĖRA IP adresų ar header'ių — tik metodas, kelias, statusas.

import { handleApi } from "./server/api.ts";
import { getPublicStory, listStories, SITEMAP_STORY_LIMIT } from "./server/store.ts";
import type { Emotion } from "./server/filter.ts";

const PUBLIC_DIR = new URL("./public/", import.meta.url);
const PORT = Number(Deno.env.get("PORT") ?? 8000);
const SITE_URL = "https://nuogasiela.lt";
// IndexNow (Bing/Yandex) — nustatoma tik jei INDEXNOW_KEY aplinkos kintamasis
// paduotas; lokaliame dev'e paprastai neduodamas, tad ping'ai tyliai nevyksta.
const INDEXNOW_KEY = Deno.env.get("INDEXNOW_KEY");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "media-src 'self' blob:; connect-src 'self'; manifest-src 'self'; " +
    "base-uri 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  // Mikrofonas leidžiamas tik savai kilmei — Šauksmo kambariui. Garsas
  // niekada nepalieka naršyklės (žr. public/js/scream.js).
  "permissions-policy": "camera=(), microphone=(self), geolocation=()",
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ---------- SPA ekranų meta žymos (be templating variklio — tik string replace) ----------

interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  "/rasyti": {
    title: "Rašyk laisvai — Nuoga Siela",
    description: "Anoniminė erdvė išsilieti. Parašyk, ką jauti — niekas nežinos, kad tai tu.",
  },
  "/srautas": {
    title: "Srautas — Nuoga Siela",
    description: "Skaityk, ką kiti žmonės paleido anonimiškai. Tekstai gyvena 24 valandas.",
  },
  "/istorijos": {
    title: "Istorijos — Nuoga Siela",
    description:
      "Tekstai, kuriuos žmonės paliko ilgam. Anoniminės istorijos apie pyktį, liūdesį, viltį.",
  },
  "/sos": {
    title: "SOS pagalba — Nuoga Siela",
    description:
      "Jei dabar sunku — čia yra nemokamos, anoniminės pagalbos linijos, veikiančios visą parą.",
  },
  "/sauksmas": {
    title: "Šauksmo kambarys — Nuoga Siela",
    description: "Išrėk. Garso įrašas gyvena tik tavo telefono atmintyje — niekur nesiunčiamas.",
  },
  "/kalendorius": {
    title: "Emocijų kalendorius — Nuoga Siela",
    description:
      "Kaip jauteisi šią savaitę ir kaip jaučiasi visi. Tavo emocijos saugomos tik tavo įrenginyje.",
  },
  "/nustatymai": {
    title: "Nustatymai — Nuoga Siela",
    description: "Kalba, švelnus srautas, apie projektą, privatumas ir duomenų trynimas.",
  },
};

function swapTagContent(html: string, selector: RegExp, value: string): string {
  return html.replace(
    selector,
    (_match, prefix: string, suffix: string) => prefix + value + suffix,
  );
}

function applyRouteMeta(html: string, routePath: string): string {
  const meta = ROUTE_META[routePath];
  if (!meta) return html;
  const canonical = `${SITE_URL}${routePath}`;
  let out = html;
  out = swapTagContent(out, /(<title>)[^<]*(<\/title>)/, meta.title);
  out = swapTagContent(out, /(name="description"[^>]*?content=")[^"]*(")/, meta.description);
  out = swapTagContent(out, /(property="og:title"[^>]*?content=")[^"]*(")/, meta.title);
  out = swapTagContent(out, /(property="og:description"[^>]*?content=")[^"]*(")/, meta.description);
  out = swapTagContent(out, /(property="og:url"[^>]*?content=")[^"]*(")/, canonical);
  out = swapTagContent(out, /(name="twitter:title"[^>]*?content=")[^"]*(")/, meta.title);
  out = swapTagContent(
    out,
    /(name="twitter:description"[^>]*?content=")[^"]*(")/,
    meta.description,
  );
  out = swapTagContent(out, /(rel="canonical" href=")[^"]*(")/, canonical);
  return out;
}

let indexHtmlCache: string | null = null;

async function getIndexHtml(): Promise<string> {
  if (indexHtmlCache === null) {
    indexHtmlCache = await Deno.readTextFile(new URL("./index.html", PUBLIC_DIR));
  }
  return indexHtmlCache;
}

async function serveIndexHtml(routePath: string): Promise<Response> {
  const html = applyRouteMeta(await getIndexHtml(), routePath);
  return new Response(html, {
    headers: { ...SECURITY_HEADERS, "content-type": MIME[".html"], "cache-control": "no-cache" },
  });
}

// ---------- Istorijos permalink'as (SSR — tekstas matomas be JS) ----------

// Tas pats ženklas kaip programėlės viršuje (public/index.html .brand-mark).
const BRAND_MARK_SVG = `<svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path class="mark-flame" d="M12 3.2c-2.3 2.6-3.6 4.4-3.6 6.4a3.6 3.6 0 007.2 0c0-1.3-.6-2.3-1.5-3.3-.2 1.1-.8 1.8-1.5 2 .3-1.8.1-3.4-.6-5.1z" />
          <path class="mark-water" d="M4 16.4c1.3-.9 2.7-.9 4 0s2.7.9 4 0 2.7-.9 4 0 2.7.9 4 0" />
          <path class="mark-water" opacity="0.6" d="M4 19.8c1.3-.9 2.7-.9 4 0s2.7.9 4 0 2.7-.9 4 0 2.7.9 4 0" />
        </svg>`;

const STORY_PATH_RE = /^\/istorijos\/([\w-]+)$/;

const EMOTION_LABELS_LT: Record<Emotion, string> = {
  pyktis: "Pyktis",
  liudesys: "Liūdesys",
  nerimas: "Nerimas",
  kalte: "Kaltė",
  vienatve: "Vienatvė",
  viltis: "Viltis",
};

// Ramūs emocijų simboliai — kopija iš public/js/icons.js (EMO[...].calm); keičiant vieną,
// keisk abu. Spalva — currentColor (main.css [data-emo]), šešėlis — .emo-mask.
const F = 'fill="currentColor"';
const EMOTION_ICONS: Record<Emotion, [string, string]> = {
  pyktis: [
    "1.6",
    `<circle cx="8" cy="14" r="5" ${F} fill-opacity="0.18"/>` +
    `<circle cx="15" cy="9.5" r="3.5" ${F} fill-opacity="0.18"/>` +
    `<path d="M10.6 8.8L9.7 7.4M13.8 13.8L14.7 15.2"/>` +
    `<circle cx="7.6" cy="7.6" r="0.75" ${F} stroke="none"/>` +
    `<circle cx="16.6" cy="14.4" r="0.75" ${F} stroke="none"/>`,
  ],
  liudesys: [
    "1.6",
    `<path d="M19.6 4.4L16 8" stroke-opacity="0.22"/>` +
    `<path d="M16 8L12.2 11.8" stroke-opacity="0.5"/>` +
    `<path d="M12.2 11.8L9 15" stroke-opacity="0.85"/>` +
    `<circle cx="7.4" cy="16.6" r="3.6" ${F} fill-opacity="0.16" stroke="none"/>` +
    `<circle cx="7.4" cy="16.6" r="2" ${F} stroke="none"/>` +
    `<circle cx="18" cy="16.5" r="0.7" ${F} fill-opacity="0.55" stroke="none"/>` +
    `<circle cx="5.2" cy="6" r="0.6" ${F} fill-opacity="0.45" stroke="none"/>`,
  ],
  nerimas: [
    "1.4",
    `<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(-28 12 12)"/>` +
    `<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(32 12 12)" stroke-opacity="0.5"/>` +
    `<circle cx="12" cy="12" r="2.6" ${F} stroke="none"/>` +
    `<circle cx="19.3" cy="6.7" r="1.3" ${F} stroke="none"/>`,
  ],
  kalte: [
    "1.4",
    `<circle cx="11" cy="12.5" r="8.4" stroke-opacity="0.3" stroke-dasharray="1.5 2.6"/>` +
    `<circle cx="11" cy="12.5" r="6" ${F} stroke="none"/>` +
    `<circle class="emo-mask" cx="13.7" cy="11" r="5.6" stroke-opacity="0.5"/>`,
  ],
  vienatve: [
    "1.4",
    `<circle cx="8.5" cy="15.5" r="3.4" ${F} fill-opacity="0.22"/>` +
    `<ellipse cx="8.5" cy="15.5" rx="6" ry="1.8" transform="rotate(-16 8.5 15.5)"/>` +
    `<path d="M18.5 3.6V7.4M16.6 5.5H20.4" stroke-width="1.2"/>`,
  ],
  viltis: [
    "1.5",
    `<circle cx="12" cy="11" r="2.6" ${F} stroke="none"/>` +
    `<path d="M12 4.6V6.2M7.6 6.6L8.7 7.7M16.4 6.6L15.3 7.7M5.6 11H7.2M16.8 11H18.4" stroke-opacity="0.85"/>` +
    `<path class="emo-mask" d="M1.5 21Q12 14.6 22.5 21V24H1.5Z" stroke="none"/>` +
    `<path d="M1.5 21Q12 14.6 22.5 21V24H1.5Z" ${F} fill-opacity="0.14" stroke="none"/>` +
    `<path d="M1.5 21Q12 14.6 22.5 21"/>`,
  ],
};

function emotionIcon(emotion: Emotion): string {
  const [strokeWidth, body] = EMOTION_ICONS[emotion];
  return `<span class="emo-icon" data-emo="${emotion}" aria-hidden="true">` +
    `<svg class="emo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg></span>`;
}

const HEART_ICON = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">` +
  `<path d="M12 19.5s-7.2-4.4-7.2-9.6a4 4 0 017.2-2.4 4 4 0 017.2 2.4c0 5.2-7.2 9.6-7.2 9.6z"/></svg>`;

function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

// JSON-LD <script> blokai nėra CSP script-src taikymo objektas (naršyklės jų
// nevykdo kaip JS), bet "</script>" sekoje esantis tekstas vis tiek nulaužtų
// HTML parsinimą — todėl "</" pakeičiama į "<\/" prieš įterpiant.
function jsonLdScript(data: unknown): string {
  return `<script type="application/ld+json">${
    JSON.stringify(data).replaceAll("</", "<\\/")
  }</script>`;
}

function renderStoryPage(
  story: { id: string; text: string; emotion: Emotion; hugs: number; createdAt: number },
): string {
  const description = escapeHtml(excerpt(story.text, 155));
  const title = escapeHtml(`${excerpt(story.text, 60)} — Nuoga Siela`);
  const url = `${SITE_URL}/istorijos/${story.id}`;
  const emotionLabel = escapeHtml(EMOTION_LABELS_LT[story.emotion]);
  const jsonLd = jsonLdScript({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "headline": excerpt(story.text, 60),
    "text": story.text,
    "url": url,
    "datePublished": new Date(story.createdAt).toISOString(),
    "inLanguage": "lt",
    "isAccessibleForFree": true,
    "publisher": { "@type": "Organization", "name": "Nuoga Siela", "url": SITE_URL },
  });
  return `<!DOCTYPE html>
<html lang="lt">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#08171C">
    <meta name="description" content="${description}">
    <title>${title}</title>
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Nuoga Siela">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="lt_LT">
    <meta property="og:image" content="${SITE_URL}/images/og-image.webp">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/images/og-image.webp">
    <link rel="stylesheet" href="/css/main.css">
    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
    <script src="/js/theme.js"></script>
    <script src="/js/river.js" defer></script>
    ${jsonLd}
  </head>
  <body>
    <main class="story-page">
      <a class="legal-brand" href="/">
        ${BRAND_MARK_SVG}
        <span>Nuoga Siela</span>
      </a>
      <p class="promise">Mes nežinome, kas tu. Ir nenorime žinoti.</p>
      <p class="story-meta" data-emotion="${story.emotion}">
        ${emotionIcon(story.emotion)}<span>${emotionLabel}</span>
        <span class="story-hugs" aria-label="Suprantu tave: ${story.hugs}">${HEART_ICON}${story.hugs}</span>
      </p>
      <p class="story-text">${escapeHtml(story.text)}</p>
      <a class="back-link empty-link" href="/istorijos">← Grįžti į Nuogą Sielą</a>
    </main>
  </body>
</html>
`;
}

async function serveStoryPage(pathname: string): Promise<Response> {
  const id = pathname.match(STORY_PATH_RE)![1];
  const story = await getPublicStory(id);
  if (!story) return new Response("Nerasta.", { status: 404, headers: SECURITY_HEADERS });
  return new Response(renderStoryPage(story), {
    headers: { ...SECURITY_HEADERS, "content-type": MIME[".html"], "cache-control": "no-cache" },
  });
}

// ---------- Dinaminis sitemap.xml (statiniai keliai + gyvos istorijos) ----------

interface SitemapAlternate {
  hreflang: string;
  href: string;
}

interface SitemapEntry {
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
  alternates?: SitemapAlternate[];
}

// Ta pati data, kuri jau rodoma pačiuose puslapiuose ("Paskutinį kartą
// atnaujinta:") — nekuriame naujos, tik pakartojame jau tikslią.
const LEGAL_PAGES_UPDATED = "2026-10-29";

const STATIC_SITEMAP_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/rasyti", changefreq: "daily", priority: "0.8" },
  { path: "/srautas", changefreq: "daily", priority: "0.8" },
  { path: "/istorijos", changefreq: "daily", priority: "0.8" },
  { path: "/sos", changefreq: "monthly", priority: "0.5" },
  { path: "/sauksmas", changefreq: "monthly", priority: "0.5" },
  { path: "/kalendorius", changefreq: "weekly", priority: "0.4" },
  { path: "/nustatymai", changefreq: "monthly", priority: "0.4" },
  {
    path: "/privatumas",
    changefreq: "monthly",
    priority: "0.3",
    lastmod: LEGAL_PAGES_UPDATED,
    alternates: [
      { hreflang: "lt", href: `${SITE_URL}/privatumas` },
      { hreflang: "en", href: `${SITE_URL}/privacy` },
      { hreflang: "x-default", href: `${SITE_URL}/privatumas` },
    ],
  },
  {
    path: "/privacy",
    changefreq: "monthly",
    priority: "0.3",
    lastmod: LEGAL_PAGES_UPDATED,
    alternates: [
      { hreflang: "en", href: `${SITE_URL}/privacy` },
      { hreflang: "lt", href: `${SITE_URL}/privatumas` },
      { hreflang: "x-default", href: `${SITE_URL}/privatumas` },
    ],
  },
];

function sitemapUrlXml(loc: string, entry: Omit<SitemapEntry, "path">): string {
  const lines = [`  <url>`, `    <loc>${loc}</loc>`];
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  lines.push(
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
  );
  for (const alt of entry.alternates ?? []) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`);
  }
  lines.push(`  </url>`);
  return lines.join("\n");
}

async function serveSitemap(): Promise<Response> {
  const stories = await listStories(undefined, "naujausios", SITEMAP_STORY_LIMIT);
  const urls = [
    ...STATIC_SITEMAP_ENTRIES.map((e) => sitemapUrlXml(`${SITE_URL}${e.path}`, e)),
    ...stories.map((s) =>
      sitemapUrlXml(`${SITE_URL}/istorijos/${s.id}`, {
        changefreq: "monthly",
        priority: "0.6",
        lastmod: new Date(s.createdAt).toISOString().slice(0, 10),
      })
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: { ...SECURITY_HEADERS, "content-type": MIME[".xml"], "cache-control": "no-cache" },
  });
}

// ---------- Atom feed (naujausios istorijos) ----------

const FEED_ENTRY_LIMIT = 30;

async function serveStoriesFeed(): Promise<Response> {
  const stories = await listStories(undefined, "naujausios", FEED_ENTRY_LIMIT);
  const updated = stories[0]
    ? new Date(stories[0].createdAt).toISOString()
    : new Date().toISOString();
  const entries = stories.map((s) => {
    const url = `${SITE_URL}/istorijos/${s.id}`;
    const iso = new Date(s.createdAt).toISOString();
    return `  <entry>
    <title>${escapeHtml(excerpt(s.text, 60))}</title>
    <link href="${url}"/>
    <id>${url}</id>
    <published>${iso}</published>
    <updated>${iso}</updated>
    <summary type="text">${escapeHtml(s.text)}</summary>
  </entry>`;
  }).join("\n");
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Nuoga Siela — Istorijos</title>
  <subtitle>Naujausios anoniminės istorijos</subtitle>
  <link href="${SITE_URL}/istorijos/feed.xml" rel="self"/>
  <link href="${SITE_URL}/istorijos"/>
  <id>${SITE_URL}/istorijos</id>
  <updated>${updated}</updated>
  <author><name>Nuoga Siela</name></author>
${entries}
</feed>
`;
  return new Response(xml, {
    headers: {
      ...SECURITY_HEADERS,
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}

// ---------- Statiniai failai ----------

// Kas keičiasi su kiekvienu diegimu (HTML, JS, CSS, manifest) — `no-cache`, kad naujas
// diegimas matytųsi iškart (kartu su public/sw.js network-first). Šriftai, garsai ir
// paveikslėliai nesikeičia — juos naršyklė gali laikyti valandą.
const REVALIDATE_EXT = new Set([".html", ".js", ".css", ".webmanifest", ".json"]);

// Teisiniai puslapiai turi švarius kelius be .html (Play Console ir nuorodos naudoja juos);
// senieji .html adresai nukreipiami 301, kad išliktų jau pasidalintos nuorodos ir indeksas.
const CLEAN_PAGES: Record<string, string> = {
  "/privatumas": "/privatumas.html",
  "/privacy": "/privacy.html",
};
const CLEAN_REDIRECTS = new Map(Object.entries(CLEAN_PAGES).map(([clean, file]) => [file, clean]));

async function serveStatic(pathname: string): Promise<Response> {
  if (pathname === "/") return serveIndexHtml("/");
  const redirectTo = CLEAN_REDIRECTS.get(pathname);
  if (redirectTo) {
    return new Response(null, {
      status: 301,
      headers: { ...SECURITY_HEADERS, location: redirectTo },
    });
  }
  if (CLEAN_PAGES[pathname]) pathname = CLEAN_PAGES[pathname];
  const path = pathname;
  // Apsauga nuo path traversal: leidžiami tik paprasti segmentai.
  if (path.includes("..") || path.includes("//") || path.includes("\\")) {
    return new Response("Nerasta.", { status: 404 });
  }
  const fileUrl = new URL("." + path, PUBLIC_DIR);
  if (!fileUrl.pathname.startsWith(PUBLIC_DIR.pathname)) {
    return new Response("Nerasta.", { status: 404 });
  }
  try {
    const file = await Deno.readFile(fileUrl);
    const ext = path.slice(path.lastIndexOf("."));
    const headers: Record<string, string> = {
      ...SECURITY_HEADERS,
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": REVALIDATE_EXT.has(ext) ? "no-cache" : "public, max-age=3600",
    };
    return new Response(file, { headers });
  } catch {
    // SPA: nežinomi keliai be taško (pvz. /rasyti, /srautas) grąžina index.html
    // su tam ekranui pritaikytomis meta žymomis (žr. applyRouteMeta), naršant
    // toliau kliento pusėje per History API (žr. public/js/app.js).
    if (!path.includes(".")) return serveIndexHtml(path);
    return new Response("Nerasta.", { status: 404, headers: SECURITY_HEADERS });
  }
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  let res: Response;
  if (url.pathname.startsWith("/api/")) {
    res = await handleApi(req, url);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  } else if (req.method === "GET" && url.pathname === "/sitemap.xml") {
    res = await serveSitemap();
  } else if (req.method === "GET" && url.pathname === "/istorijos/feed.xml") {
    res = await serveStoriesFeed();
  } else if (req.method === "GET" && STORY_PATH_RE.test(url.pathname)) {
    res = await serveStoryPage(url.pathname);
  } else if (INDEXNOW_KEY && req.method === "GET" && url.pathname === `/${INDEXNOW_KEY}.txt`) {
    res = new Response(INDEXNOW_KEY, {
      headers: { ...SECURITY_HEADERS, "content-type": MIME[".txt"] },
    });
  } else {
    res = await serveStatic(url.pathname);
  }
  console.log(`${req.method} ${url.pathname} ${res.status}`);
  return res;
});
