// Deno KV saugykla. Anonimiškumo garantijos čia:
//  - saugomas tik salted SHA-256 įrenginio hash'as, niekada UUID ar IP;
//  - srauto įrašai kuriami su expireIn, tad KV pats FIZIŠKAI ištrina
//    duomenis po 24 val. — ne slepia, o trina;
//  - istorijos gyvena be termino, bet tik kol autorius jų neištrina.

import type { Emotion } from "./filter.ts";

export const POST_TTL_MS = Number(Deno.env.get("POST_TTL_MS") ?? 24 * 60 * 60 * 1000);
export const RATE_LIMIT_PER_HOUR = 5;
export const STORY_LIMIT_PER_DAY = 2;
export const REPORTS_TO_HIDE = 3;
export const FEED_LIMIT = 100;
export const STORY_FEED_LIMIT = 50;

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
  if (!entry.value || entry.value.hidden) return null;
  return toPublic(entry.value);
}

export async function listStories(
  emotion?: Emotion,
  sort: "suprastos" | "naujausios" = "suprastos",
): Promise<PublicPost[]> {
  const kv = await getKv();
  const out: PublicPost[] = [];
  // Prefikso tvarka = naujausios pirmos; skaitome iki 500 ir rūšiuojame atmintyje.
  for await (const entry of kv.list<Post>({ prefix: ["story"] }, { limit: 500 })) {
    const p = entry.value;
    if (p.hidden) continue;
    if (emotion && p.emotion !== emotion) continue;
    out.push(toPublic(p));
  }
  if (sort === "suprastos") {
    out.sort((a, b) => b.hugs - a.hugs || b.createdAt - a.createdAt);
  }
  return out.slice(0, STORY_FEED_LIMIT);
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
  }
  return post;
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

// Mano tekstai su „suprantu" skaičiais — sugrįžimo banneriui.
export async function listMine(deviceHash: string): Promise<PublicPost[]> {
  const kv = await getKv();
  const out: PublicPost[] = [];
  for await (const entry of kv.list({ prefix: ["byDevice", deviceHash] })) {
    const postId = entry.key[2] as string;
    const kind: PostKind = entry.value === "istorija" ? "istorija" : "srautas";
    const post = await kv.get<Post>([keyRoot(kind), postId]);
    if (post.value && !post.value.hidden) out.push(toPublic(post.value));
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

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
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
