// API sluoksnis: JSON in/out, jokių slapukų, jokių IP.
// Vienintelis identifikatorius — kliento atsiųstas X-Device UUID,
// kuris čia pat paverčiamas salted hash'u ir toliau niekur nekeliauja.

import { checkText, detectCrisis, isEmotion } from "./filter.ts";
import {
  checkRateLimit,
  createPost,
  deleteDeviceData,
  deletePushSubscription,
  getStats,
  getWeeklyMood,
  hashDevice,
  hugPost,
  keepAsStory,
  listFeed,
  listMine,
  listStories,
  type PostKind,
  type PushMode,
  reportPost,
  savePushSubscription,
  unkeepStory,
} from "./store.ts";
import { runPushRound, vapidFromEnv } from "./notify.ts";
import { b64urlDecode, isAllowedEndpoint } from "./webpush.ts";

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

// Prenumeratos raktų tikrinimas: p256dh — 65 baitų P-256 taškas, auth — 16 baitų.
function decodedLength(value: unknown): number {
  if (typeof value !== "string" || value.length > 200) return -1;
  try {
    return b64urlDecode(value).length;
  } catch {
    return -1;
  }
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

      let body: { text?: unknown; emotion?: unknown; kind?: unknown };
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

      const sos = detectCrisis(text);
      const post = await createPost(deviceHash, text, body.emotion, kind);
      if (kind === "istorija") pingIndexNow(post.id);
      // „Iškart" prenumeratoriams — fire-and-forget, kaip ir IndexNow.
      else runPushRound("post").catch(() => {});
      return json({
        ok: true,
        sos,
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

    // Autoriaus „Į istorijas" savo srauto tekstui (ir atšaukimas, kol tekstas dar sraute).
    const keepMatch = path.match(/^\/api\/posts\/([\w-]+)\/(keep|unkeep)$/);
    if (method === "POST" && keepMatch) {
      const deviceHash = await deviceHashFrom(req);
      if (!deviceHash) return badRequest("Trūksta įrenginio identifikatoriaus.");
      if (keepMatch[2] === "unkeep") {
        const ok = await unkeepStory(keepMatch[1], deviceHash);
        return ok
          ? json({ ok: true })
          : json({ ok: false, reason: "Šis tekstas jau išnyko." }, 404);
      }
      const res = await keepAsStory(
        keepMatch[1],
        deviceHash,
        () => checkRateLimit(deviceHash, "istorija"),
      );
      return res.ok ? json(res) : json(res, 400);
    }

    const reportMatch = path.match(/^\/api\/posts\/([\w-]+)\/report$/);
    if (method === "POST" && reportMatch) {
      const deviceHash = await deviceHashFrom(req);
      if (!deviceHash) return badRequest("Trūksta įrenginio identifikatoriaus.");
      const post = await reportPost(reportMatch[1], deviceHash);
      if (!post) return json({ ok: false, reason: "Šis tekstas jau išnyko." }, 404);
      return json({ ok: true });
    }

    // Push pranešimai: be X-Device — prenumerata neturi jokio ryšio su įrenginio hash'u.
    if (method === "GET" && path === "/api/push/key") {
      return json({ ok: true, publicKey: vapidFromEnv()?.publicKey ?? null });
    }

    if (method === "POST" && path === "/api/push/subscribe") {
      if (!vapidFromEnv()) return json({ ok: false, reason: "Pranešimai išjungti." }, 503);
      let body: {
        subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
        mode?: unknown;
        lang?: unknown;
      };
      try {
        body = await req.json();
      } catch {
        return badRequest("Neteisingas užklausos formatas.");
      }
      const endpoint = body.subscription?.endpoint;
      const p256dh = body.subscription?.keys?.p256dh;
      const auth = body.subscription?.keys?.auth;
      if (
        typeof endpoint !== "string" || endpoint.length > 1024 || !isAllowedEndpoint(endpoint) ||
        decodedLength(p256dh) !== 65 || decodedLength(auth) !== 16
      ) {
        return badRequest("Netinkama prenumerata.");
      }
      if (body.mode !== "daily" && body.mode !== "instant") {
        return badRequest("Netinkamas režimas.");
      }
      const mode: PushMode = body.mode;
      const lang = body.lang === "en" ? "en" : "lt";
      await savePushSubscription(
        { endpoint, p256dh: p256dh as string, auth: auth as string },
        mode,
        lang,
      );
      return json({ ok: true });
    }

    if (method === "POST" && path === "/api/push/unsubscribe") {
      let body: { endpoint?: unknown };
      try {
        body = await req.json();
      } catch {
        return badRequest("Neteisingas užklausos formatas.");
      }
      if (typeof body.endpoint !== "string" || body.endpoint.length > 1024) {
        return badRequest("Netinkama prenumerata.");
      }
      await deletePushSubscription(body.endpoint);
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
