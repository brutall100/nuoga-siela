// Deno KV saugykla. Anonimiškumo garantijos čia:
//  - saugomas tik salted SHA-256 įrenginio hash'as, niekada UUID ar IP;
//  - srauto įrašai kuriami su expireIn, tad KV pats FIZIŠKAI ištrina
//    duomenis po 24 val. — ne slepia, o trina;
//  - istorijos gyvena be termino, bet tik kol autorius jų neištrina;
//  - autorius gali savo srauto tekstą „perkelti į istorijas": tada sukuriama
//    istorija, kuri tampa matoma tik srauto tekstui išnykus (publishAt). Srauto
//    įrašas vis tiek ištrinamas po 24 val. — tai autoriaus sprendimas palikti tekstą.

import { type Emotion, EMOTIONS } from "./filter.ts";

export const POST_TTL_MS = Number(Deno.env.get("POST_TTL_MS") ?? 24 * 60 * 60 * 1000);
export const RATE_LIMIT_PER_HOUR = 5;
export const STORY_LIMIT_PER_DAY = 2;
export const REPORTS_TO_HIDE = 3;
export const FEED_LIMIT = 100;
export const STORY_FEED_LIMIT = 50;
// sitemap.xml/feed.xml turi matyti visas istorijas, ne tik UI srauto ekrano
// STORY_FEED_LIMIT viršūnę — kitaip senesnės/mažiau "suprastos" istorijos
// taptų nepasiekiamos paieškos sistemoms. Gerokai po sitemap protokolo
// 50000 URL riba; jei kada pasiekiama, kitas žingsnis — sitemap index skaidymas.
export const SITEMAP_STORY_LIMIT = 5000;
// Bendros savaitės nuotaikos langas (Emocijų kalendoriaus ekranui).
export const MOOD_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PostKind = "srautas" | "istorija";

export interface Post {
  id: string;
  deviceHash: string;
  text: string;
  emotion: Emotion;
  kind: PostKind;
  hugs: number;
  reports: number;
  createdAt: number;
  expiresAt: number; // 0 = niekada (istorija)
  hidden: boolean;
  keptAs?: string; // srauto įrašas: istorijos id, į kurią persikels po 24 val.
  publishAt?: number; // istorija: iki šio laiko nematoma (laukia, kol išnyks srauto tekstas)
}

// Istorija, kuri dar laukia savo laiko (perkelta iš srauto, bet srautas dar gyvas).
function isPending(p: Post, now = Date.now()): boolean {
  return (p.publishAt ?? 0) > now;
}

export interface PublicPost {
  id: string;
  text: string;
  emotion: Emotion;
  kind: PostKind;
  hugs: number;
  createdAt: number;
  expiresAt: number;
}

let kvPromise: Promise<Deno.Kv> | null = null;

export function getKv(path?: string): Promise<Deno.Kv> {
  if (!kvPromise) kvPromise = Deno.openKv(path ?? Deno.env.get("KV_PATH"));
  return kvPromise;
}

// Testams: leidžia pakeisti KV egzempliorių (pvz., ":memory:").
export function setKvForTesting(kv: Deno.Kv): void {
  kvPromise = Promise.resolve(kv);
}

const SALT = Deno.env.get("DEVICE_SALT") ?? "nuoga-siela-dev-salt";

export async function hashDevice(deviceUuid: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + ":" + deviceUuid);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ID prasideda atvirkštiniu laiko žymeniu, tad KV list pagal prefiksą
// natūraliai grąžina naujausius pirmiausia — be jokio papildomo indekso.
function newPostId(now: number): string {
  const reverse = String(1e15 - now).padStart(16, "0");
  return `${reverse}-${crypto.randomUUID().slice(0, 8)}`;
}

function keyRoot(kind: PostKind): string {
  return kind === "istorija" ? "story" : "post";
}

function toPublic(p: Post): PublicPost {
  return {
    id: p.id,
    text: p.text,
    emotion: p.emotion,
    kind: p.kind ?? "srautas",
    hugs: p.hugs,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
  };
}

export async function createPost(
  deviceHash: string,
  text: string,
  emotion: Emotion,
  kind: PostKind = "srautas",
): Promise<Post> {
  const kv = await getKv();
  const now = Date.now();
  const isStory = kind === "istorija";
  const post: Post = {
    id: newPostId(now),
    deviceHash,
    text,
    emotion,
    kind,
    hugs: 0,
    reports: 0,
    createdAt: now,
    expiresAt: isStory ? 0 : now + POST_TTL_MS,
    hidden: false,
  };
  const ttl = isStory ? undefined : { expireIn: POST_TTL_MS };
  await kv.atomic()
    .set([keyRoot(kind), post.id], post, ttl)
    .set(["byDevice", deviceHash, post.id], kind, ttl)
    .commit();
  await bumpStat("posts");
  await bumpEmotionStat(emotion);
  return post;
}

export async function listFeed(emotion?: Emotion): Promise<PublicPost[]> {
  const kv = await getKv();
  const out: PublicPost[] = [];
  const now = Date.now();
  for await (const entry of kv.list<Post>({ prefix: ["post"] }, { limit: FEED_LIMIT * 2 })) {
    const p = entry.value;
    if (p.hidden || (p.expiresAt > 0 && p.expiresAt <= now)) continue;
    if (emotion && p.emotion !== emotion) continue;
    out.push(toPublic(p));
    if (out.length >= FEED_LIMIT) break;
  }
  return out;
}

// Vienos istorijos paskyra (SSR permalink'ui) — tik "story" prefikse, ne
// findPost() abiejų prefiksų paieška, nes "srautas" postai neturi permalink'o.
// Grąžina null jei nerasta arba paslėpta — todėl ištrinta/paslėpta istorija
// permalink'e iškart 404, be atskiro cache invalidavimo.
export async function getPublicStory(id: string): Promise<PublicPost | null> {
  const kv = await getKv();
  const entry = await kv.get<Post>(["story", id]);
  if (!entry.value || entry.value.hidden || isPending(entry.value)) return null;
  return toPublic(entry.value);
}

export async function listStories(
  emotion?: Emotion,
  sort: "suprastos" | "naujausios" = "suprastos",
  limit: number = STORY_FEED_LIMIT,
): Promise<PublicPost[]> {
  const kv = await getKv();
  const out: PublicPost[] = [];
  const now = Date.now();
  // Prefikso tvarka = naujausios pirmos; skaitome iki limit*2 ir rūšiuojame
  // atmintyje (marža dėl hidden/emotion/laukiančių filtro, kaip ir listFeed()).
  for await (const entry of kv.list<Post>({ prefix: ["story"] }, { limit: limit * 2 })) {
    const p = entry.value;
    if (p.hidden || isPending(p, now)) continue;
    if (emotion && p.emotion !== emotion) continue;
    out.push(toPublic(p));
  }
  if (sort === "suprastos") {
    out.sort((a, b) => b.hugs - a.hugs || b.createdAt - a.createdAt);
  }
  return out.slice(0, limit);
}

// Postas gali būti sraute arba istorijose — randame pagal id abiejuose.
async function findPost(
  kv: Deno.Kv,
  id: string,
): Promise<Deno.KvEntryMaybe<Post>> {
  const post = await kv.get<Post>(["post", id]);
  if (post.value) return post;
  return await kv.get<Post>(["story", id]);
}

// Atominis atnaujinimas su likusio TTL išsaugojimu (kv.set be expireIn
// srauto įrašą paverstų amžinu — tai laužytų 24 val. pažadą).
async function updatePost(
  id: string,
  mutate: (post: Post) => Post,
): Promise<Post | null> {
  const kv = await getKv();
  for (let attempt = 0; attempt < 5; attempt++) {
    const entry = await findPost(kv, id);
    if (!entry.value) return null;
    const updated = mutate(entry.value);
    let ttl: { expireIn: number } | undefined;
    if (updated.expiresAt > 0) {
      const remaining = updated.expiresAt - Date.now();
      if (remaining <= 0) return null;
      ttl = { expireIn: remaining };
    }
    const res = await kv.atomic()
      .check(entry)
      .set([keyRoot(updated.kind), id], updated, ttl)
      .commit();
    if (res.ok) return updated;
  }
  return null;
}

// Pagalbinis raktas su tuo pačiu gyvavimo laiku kaip postas.
function markTtl(post: Post): { expireIn: number } | undefined {
  if (post.expiresAt === 0) return undefined;
  return { expireIn: Math.max(post.expiresAt - Date.now(), 1000) };
}

export async function hugPost(id: string, deviceHash: string): Promise<Post | null> {
  const kv = await getKv();
  const hugKey = ["hug", id, deviceHash];
  const existing = await kv.get(hugKey);
  if (existing.value) {
    return (await findPost(kv, id)).value;
  }
  const post = await updatePost(id, (p) => ({ ...p, hugs: p.hugs + 1 }));
  if (post) {
    await kv.set(hugKey, true, markTtl(post));
    await bumpStat("hugs");
    // „Suprantu tave" keliauja kartu į būsimą istoriją.
    if (post.keptAs) await updatePost(post.keptAs, (s) => ({ ...s, hugs: s.hugs + 1 }));
  }
  return post;
}

export async function reportPost(id: string, deviceHash: string): Promise<Post | null> {
  const kv = await getKv();
  const reportKey = ["report", id, deviceHash];
  const existing = await kv.get(reportKey);
  if (existing.value) {
    return (await findPost(kv, id)).value;
  }
  const post = await updatePost(id, (p) => {
    const reports = p.reports + 1;
    return { ...p, reports, hidden: reports >= REPORTS_TO_HIDE };
  });
  if (post) {
    await kv.set(reportKey, true, markTtl(post));
    // Paslėptas srauto tekstas neturi „prasmukti" į istorijas.
    if (post.hidden && post.keptAs) {
      await updatePost(post.keptAs, (s) => ({ ...s, hidden: true }));
    }
  }
  return post;
}

// „Į istorijas" savo srauto tekstui: istorija sukuriama dabar, bet matoma tik nuo
// srauto teksto išnykimo momento (publishAt = expiresAt). Tik autoriui (deviceHash).
export async function keepAsStory(
  id: string,
  deviceHash: string,
  // Istorijų limitas tikrinamas tik tada, kai istorija iš tikrųjų bus kuriama.
  allowed: () => Promise<boolean> = () => Promise.resolve(true),
): Promise<{ ok: true; publishAt: number } | { ok: false; reason: string }> {
  const kv = await getKv();
  const entry = await kv.get<Post>(["post", id]);
  const post = entry.value;
  const now = Date.now();
  if (!post || post.hidden || post.expiresAt <= now) {
    return { ok: false, reason: "Šis tekstas jau išnyko." };
  }
  if (post.deviceHash !== deviceHash) return { ok: false, reason: "Tai ne tavo tekstas." };
  if (post.keptAs) return { ok: true, publishAt: post.expiresAt };
  if (!(await allowed())) {
    return { ok: false, reason: "Istorijos — apgalvoti tekstai: daugiausia 2 per parą." };
  }

  const story: Post = {
    id: newPostId(post.expiresAt),
    deviceHash,
    text: post.text,
    emotion: post.emotion,
    kind: "istorija",
    hugs: post.hugs,
    reports: 0,
    createdAt: post.expiresAt,
    expiresAt: 0,
    hidden: false,
    publishAt: post.expiresAt,
  };
  const res = await kv.atomic()
    .check(entry)
    .set(["story", story.id], story)
    .set(["byDevice", deviceHash, story.id], "istorija")
    .set(["post", id], { ...post, keptAs: story.id }, markTtl(post))
    .commit();
  if (!res.ok) return { ok: false, reason: "Nepavyko — pabandyk dar kartą." };
  return { ok: true, publishAt: post.expiresAt };
}

// Atšaukti „Į istorijas", kol srauto tekstas dar gyvas: laukianti istorija ištrinama.
export async function unkeepStory(id: string, deviceHash: string): Promise<boolean> {
  const kv = await getKv();
  const entry = await kv.get<Post>(["post", id]);
  const post = entry.value;
  if (!post || post.deviceHash !== deviceHash || post.expiresAt <= Date.now()) return false;
  if (!post.keptAs) return true;
  const { keptAs, ...rest } = post;
  const res = await kv.atomic()
    .check(entry)
    .delete(["story", keptAs])
    .delete(["byDevice", deviceHash, keptAs])
    .set(["post", id], rest, markTtl(post))
    .commit();
  return res.ok;
}

// „Ištrinti mano duomenis": fiziškai trinami visi įrenginio postai ir istorijos.
export async function deleteDeviceData(deviceHash: string): Promise<number> {
  const kv = await getKv();
  let deleted = 0;
  for await (const entry of kv.list({ prefix: ["byDevice", deviceHash] })) {
    const postId = entry.key[2] as string;
    const kind: PostKind = entry.value === "istorija" ? "istorija" : "srautas";
    await kv.atomic().delete([keyRoot(kind), postId]).delete(entry.key).commit();
    deleted++;
  }
  return deleted;
}

// Mano tekstai su „suprantu" skaičiais — sugrįžimo banneriui ir „Į istorijas" mygtukui
// (kept — srauto tekstas jau pažymėtas persikelti). Laukiančios istorijos neįtraukiamos:
// jų „suprantu" dar skaičiuojami srauto įraše.
export async function listMine(deviceHash: string): Promise<(PublicPost & { kept: boolean })[]> {
  const kv = await getKv();
  const out: (PublicPost & { kept: boolean })[] = [];
  for await (const entry of kv.list({ prefix: ["byDevice", deviceHash] })) {
    const postId = entry.key[2] as string;
    const kind: PostKind = entry.value === "istorija" ? "istorija" : "srautas";
    const post = await kv.get<Post>([keyRoot(kind), postId]);
    const p = post.value;
    if (p && !p.hidden && !isPending(p)) out.push({ ...toPublic(p), kept: Boolean(p.keptAs) });
  }
  return out;
}

export async function checkRateLimit(deviceHash: string, kind: PostKind): Promise<boolean> {
  const kv = await getKv();
  const isStory = kind === "istorija";
  const windowMs = isStory ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const limit = isStory ? STORY_LIMIT_PER_DAY : RATE_LIMIT_PER_HOUR;
  const bucket = Math.floor(Date.now() / windowMs);
  const key = ["rate", kind, deviceHash, bucket];
  const entry = await kv.get<number>(key);
  const count = entry.value ?? 0;
  if (count >= limit) return false;
  await kv.set(key, count + 1, { expireIn: windowMs });
  return true;
}

// ---- Dienos statistika (socialiniam įrodymui). Tik skaičiai, jokių sąsajų. ----

function dayKey(at = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10);
}

async function bumpStat(name: "posts" | "hugs"): Promise<void> {
  const kv = await getKv();
  const key = ["stats", dayKey(), name];
  const entry = await kv.get<number>(key);
  await kv.set(key, (entry.value ?? 0) + 1, { expireIn: 48 * 60 * 60 * 1000 });
}

export async function getStats(): Promise<{ postsToday: number; hugsToday: number }> {
  const kv = await getKv();
  const [posts, hugs] = await Promise.all([
    kv.get<number>(["stats", dayKey(), "posts"]),
    kv.get<number>(["stats", dayKey(), "hugs"]),
  ]);
  return { postsToday: posts.value ?? 0, hugsToday: hugs.value ?? 0 };
}

// Savaitės nuotaika: kiek kartų per dieną pažymėta kiekviena emocija. Tik
// suminiai skaičiai be jokio ryšio su postu ar įrenginiu; raktai patys
// išnyksta praėjus langui.
async function bumpEmotionStat(emotion: Emotion): Promise<void> {
  const kv = await getKv();
  const key = ["stats", dayKey(), "emo", emotion];
  const entry = await kv.get<number>(key);
  await kv.set(key, (entry.value ?? 0) + 1, { expireIn: (MOOD_WINDOW_DAYS + 1) * DAY_MS });
}

export async function getWeeklyMood(): Promise<
  { counts: Record<Emotion, number>; total: number }
> {
  const kv = await getKv();
  const now = Date.now();
  const days = Array.from({ length: MOOD_WINDOW_DAYS }, (_, i) => dayKey(now - i * DAY_MS));
  // getMany priima iki 10 raktų — viena užklausa vienai dienai (6 emocijos).
  const perDay = await Promise.all(
    days.map((day) => kv.getMany<number[]>(EMOTIONS.map((e) => ["stats", day, "emo", e]))),
  );
  const counts = Object.fromEntries(EMOTIONS.map((e) => [e, 0])) as Record<Emotion, number>;
  let total = 0;
  for (const entries of perDay) {
    entries.forEach((entry, i) => {
      const n = entry.value ?? 0;
      counts[EMOTIONS[i]] += n;
      total += n;
    });
  }
  return { counts, total };
}
