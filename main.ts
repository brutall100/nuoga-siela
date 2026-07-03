// Nuoga Siela — anoniminė emocinio išsiliejimo erdvė.
// Vienas serveris: statika iš /public + JSON API iš /api.
// Loguose sąmoningai NĖRA IP adresų ar header'ių — tik metodas, kelias, statusas.

import { handleApi } from "./server/api.ts";

const PUBLIC_DIR = new URL("./public/", import.meta.url);
const PORT = Number(Deno.env.get("PORT") ?? 8000);

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
};

const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "connect-src 'self'; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

async function serveStatic(pathname: string): Promise<Response> {
  let path = pathname === "/" ? "/index.html" : pathname;
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
    // SPA: nežinomi keliai be taško grąžina index.html (hash routing'as kliente).
    if (!path.includes(".")) return serveStatic("/");
    return new Response("Nerasta.", { status: 404, headers: SECURITY_HEADERS });
  }
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  let res: Response;
  if (url.pathname.startsWith("/api/")) {
    res = await handleApi(req, url);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  } else {
    res = await serveStatic(url.pathname);
  }
  console.log(`${req.method} ${url.pathname} ${res.status}`);
  return res;
});
