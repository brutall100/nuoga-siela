// Nuoga Siela — anoniminė emocinio išsiliejimo erdvė.
// Vienas serveris: statika iš /public + JSON API iš /api.
// Loguose sąmoningai NĖRA IP adresų ar header'ių — tik metodas, kelias, statusas.

import { handleApi } from "./server/api.ts";
import { getPublicStory, listStories } from "./server/store.ts";
import type { Emotion } from "./server/filter.ts";

const PUBLIC_DIR = new URL("./public/", import.meta.url);
const PORT = Number(Deno.env.get("PORT") ?? 8000);
const SITE_URL = "https://nuogasiela.lt";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
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
  "/nustatymai": {
    title: "Nustatymai — Nuoga Siela",
    description: "Kalba, švelnus srautas, duomenų trynimas ir privatumo politika.",
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

const STORY_PATH_RE = /^\/istorijos\/([\w-]+)$/;

const EMOTION_LABELS_LT: Record<Emotion, string> = {
  pyktis: "Pyktis",
  liudesys: "Liūdesys",
  nerimas: "Nerimas",
  kalte: "Kaltė",
  vienatve: "Vienatvė",
  viltis: "Viltis",
};

function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

function renderStoryPage(
  story: { id: string; text: string; emotion: Emotion; hugs: number },
): string {
  const description = escapeHtml(excerpt(story.text, 155));
  const title = escapeHtml(`${excerpt(story.text, 60)} — Nuoga Siela`);
  const url = `${SITE_URL}/istorijos/${story.id}`;
  const emotionLabel = escapeHtml(EMOTION_LABELS_LT[story.emotion]);
  return `<!DOCTYPE html>
<html lang="lt">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#0F1420">
    <meta name="description" content="${description}">
    <title>${title}</title>
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Nuoga Siela">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="lt_LT">
    <meta property="og:image" content="${SITE_URL}/icons/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/icons/og-image.png">
    <link rel="stylesheet" href="/css/main.css">
    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  </head>
  <body>
    <div class="story-page">
      <p class="promise">Mes nežinome, kas tu. Ir nenorime žinoti.</p>
      <p class="story-meta">${emotionLabel} · 🤍 ${story.hugs}</p>
      <p class="story-text">${escapeHtml(story.text)}</p>
      <a class="back-link empty-link" href="/istorijos">← Grįžti į Nuogą Sielą</a>
    </div>
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

const STATIC_SITEMAP_PATHS = [
  "/",
  "/rasyti",
  "/srautas",
  "/istorijos",
  "/sos",
  "/sauksmas",
  "/nustatymai",
  "/privatumas.html",
  "/privacy.html",
];

async function serveSitemap(): Promise<Response> {
  const stories = await listStories();
  const urls = [
    ...STATIC_SITEMAP_PATHS.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`),
    ...stories.map((s) => `  <url><loc>${SITE_URL}/istorijos/${s.id}</loc></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: { ...SECURITY_HEADERS, "content-type": MIME[".xml"], "cache-control": "no-cache" },
  });
}

// ---------- Statiniai failai ----------

async function serveStatic(pathname: string): Promise<Response> {
  if (pathname === "/") return serveIndexHtml("/");
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
      "cache-control": path === "/index.html" || path === "/sw.js"
        ? "no-cache"
        : "public, max-age=3600",
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
  } else if (req.method === "GET" && STORY_PATH_RE.test(url.pathname)) {
    res = await serveStoryPage(url.pathname);
  } else {
    res = await serveStatic(url.pathname);
  }
  console.log(`${req.method} ${url.pathname} ${res.status}`);
  return res;
});
