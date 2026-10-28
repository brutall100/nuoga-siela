// API sluoksnis: JSON in/out, jokių slapukų, jokių IP.
// Vienintelis identifikatorius — kliento atsiųstas X-Device UUID,
// kuris čia pat paverčiamas salted hash'u ir toliau niekur nekeliauja.

import { checkText, detectCrisis, isEmotion } from "./filter.ts";
import {
  checkRateLimit,
  createPost,
  deleteDeviceData,
  getStats,
  getWeeklyMood,
  hashDevice,
  hugPost,
  listFeed,
  listMine,
  listStories,
  type PostKind,
  reportPost,
} from "./store.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const SITE_URL = "https://nuogasiela.lt";
const INDEXNOW_KEY = Deno.env.get("INDEXNOW_KEY");

// IndexNow (Bing/Yandex): naujai paskelbta istorija pastumiama iš karto, o ne
// laukiant kito crawl'o. Tik "istorija" — "srautas" niekada netikslinga
// indeksuoti, jis pats išnyks per 24 val. Fire-and-forget: klaida čia niekada
// neturi sutrikdyti paties posto sukūrimo atsakymo vartotojui.
function pingIndexNow(storyId: string): void {
  if (!INDEXNOW_KEY) return;
  fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: "nuogasiela.lt",
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: [`${SITE_URL}/istorijos/${storyId}`],
    }),
  }).catch(() => {});
}

function badRequest(reason: string): Response {
  return json({ ok: false, reason }, 400);
}

async function deviceHashFrom(req: Request): Promise<string | null> {
  const uuid = req.headers.get("x-device");
  if (!uuid || uuid.length < 8 || uuid.length > 64) return null;
  return await hashDevice(uuid);
}

export async function handleApi(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = req.method;

  try {
    if (method === "GET" && path === "/api/posts") {
      const emotionParam = url.searchParams.get("emotion") ?? undefined;
      const emotion = isEmotion(emotionParam) ? emotionParam : undefined;
      const posts = await listFeed(emotion);
      return json({ ok: true, posts, now: Date.now() });
    }

    if (method === "GET" && path === "/api/stories") {
      const emotionParam = url.searchParams.get("emotion") ?? undefined;
      const emotion = isEmotion(emotionParam) ? emotionParam : undefined;
      const sort = url.searchParams.get("sort") === "naujausios" ? "naujausios" : "suprastos";
      const posts = await listStories(emotion, sort);
      return json({ ok: true, posts, now: Date.now() });
    }

    if (method === "GET" && path === "/api/stats") {
      const stats = await getStats();
      return json({ ok: true, ...stats });
    }

    if (method === "GET" && path === "/api/mood") {
      const mood = await getWeeklyMood();
      return json({ ok: true, ...mood });
    }

    if (method === "GET" && path === "/api/mine") {
      const deviceHash = await deviceHashFrom(req);
      if (!deviceHash) return badRequest("Trūksta įrenginio identifikatoriaus.");
      const posts = await listMine(deviceHash);
      return json({ ok: true, posts });
    }

    if (method === "POST" && path === "/api/posts") {
      const deviceHash = await deviceHashFrom(req);
      if (!deviceHash) return badRequest("Trūksta įrenginio identifikatoriaus.");

      let body: { text?: unknown; emotion?: unknown; kind?: unknown; alsoFeed?: unknown };
      try {
        body = await req.json();
      } catch {
        return badRequest("Neteisingas užklausos formatas.");
      }
      if (typeof body.text !== "string") return badRequest("Trūksta teksto.");
      if (!isEmotion(body.emotion)) return badRequest("Pasirink emociją.");
      const kind: PostKind = body.kind === "istorija" ? "istorija" : "srautas";

      const text = body.text.trim();
      const filter = checkText(text);
      if (!filter.ok) return badRequest(filter.reason);

      if (!(await checkRateLimit(deviceHash, kind))) {
        const reason = kind === "istorija"
          ? "Istorijos — apgalvoti tekstai: daugiausia 2 per parą."
          : "Šiek tiek lėčiau — daugiausia 5 paleidimai per valandą.";
        return json({ ok: false, reason }, 429);
      }

      // Istorija gali būti iškart paleista ir į srautą (24 val.) — tai antra, atskira kopija.
      // Jei srauto limitas išnaudotas, istorija vis tiek paskelbiama (feedSkipped).
      const alsoFeed = kind === "istorija" && body.alsoFeed === true;
      const feedAllowed = alsoFeed && await checkRateLimit(deviceHash, "srautas");

      const sos = detectCrisis(text);
      const post = await createPost(deviceHash, text, body.emotion, kind);
      if (kind === "istorija") pingIndexNow(post.id);
      if (feedAllowed) await createPost(deviceHash, text, body.emotion, "srautas", false);
      return json({
        ok: true,
        sos,
        alsoFeed: feedAllowed,
        feedSkipped: alsoFeed && !feedAllowed,
        post: {
          id: post.id,
          text: post.text,
          emotion: post.emotion,
          kind: post.kind,
          hugs: post.hugs,
          createdAt: post.createdAt,
          expiresAt: post.expiresAt,
        },
      }, 201);
    }

    const hugMatch = path.match(/^\/api\/posts\/([\w-]+)\/hug$/);
    if (method === "POST" && hugMatch) {
      const deviceHash = await deviceHashFrom(req);
      if (!deviceHash) return badRequest("Trūksta įrenginio identifikatoriaus.");
      const post = await hugPost(hugMatch[1], deviceHash);
      if (!post) return json({ ok: false, reason: "Šis tekstas jau išnyko." }, 404);
      return json({ ok: true, hugs: post.hugs });
    }

    const reportMatch = path.match(/^\/api\/posts\/([\w-]+)\/report$/);
    if (method === "POST" && reportMatch) {
      const deviceHash = await deviceHashFrom(req);
      if (!deviceHash) return badRequest("Trūksta įrenginio identifikatoriaus.");
      const post = await reportPost(reportMatch[1], deviceHash);
      if (!post) return json({ ok: false, reason: "Šis tekstas jau išnyko." }, 404);
      return json({ ok: true });
    }

    if (method === "POST" && path === "/api/mine/delete") {
      const deviceHash = await deviceHashFrom(req);
      if (!deviceHash) return badRequest("Trūksta įrenginio identifikatoriaus.");
      const deleted = await deleteDeviceData(deviceHash);
      return json({ ok: true, deleted });
    }

    return json({ ok: false, reason: "Nerasta." }, 404);
  } catch (err) {
    console.error(`[api] ${method} ${path} klaida:`, err instanceof Error ? err.message : err);
    return json({ ok: false, reason: "Serverio klaida." }, 500);
  }
}
