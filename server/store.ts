// Deno KV saugykla. Anonimiškumo garantijos čia:
//  - saugomas tik salted SHA-256 įrenginio hash'as, niekada UUID ar IP;
//  - kiekvienas įrašas kuriamas su expireIn, tad KV pats FIZIŠKAI ištrina
//    duomenis po 24 val. — ne slepia, o trina.

import type { Emotion } from "./filter.ts";

export const POST_TTL_MS = Number(Deno.env.get("POST_TTL_MS") ?? 24 * 60 * 60 * 1000);
export const RATE_LIMIT_PER_HOUR = 5;
export const REPORTS_TO_HIDE = 3;
export const FEED_LIMIT = 100;

export interface Post {
  id: string;
  deviceHash: string;
  text: string;
  emotion: Emotion;
  hugs: number;
  reports: number;
  createdAt: number;
  expiresAt: number;
  hidden: boolean;
}

export interface PublicPost {
  id: string;
  text: string;
  emotion: Emotion;
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

// ID prasideda atvirkštiniu laiko žymeniu, tad KV list pagal ["post"] prefiksą
// natūraliai grąžina naujausius pirmiausia — be jokio papildomo indekso.
function newPostId(now: number): string {
  const reverse = String(1e15 - now).padStart(16, "0");
  return `${reverse}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createPost(
  deviceHash: string,
  text: string,
  emotion: Emotion,
): Promise<Post> {
  const kv = await getKv();
  const now = Date.now();
  const post: Post = {
    id: newPostId(now),
    deviceHash,
    text,
    emotion,
    hugs: 0,
    reports: 0,
    createdAt: now,
    expiresAt: now + POST_TTL_MS,
    hidden: false,
  };
  await kv.atomic()
    .set(["post", post.id], post, { expireIn: POST_TTL_MS })
    .set(["byDevice", deviceHash, post.id], true, { expireIn: POST_TTL_MS })
    .commit();
  return post;
}

export async function listFeed(emotion?: Emotion): Promise<PublicPost[]> {
  const kv = await getKv();
  const out: PublicPost[] = [];
  const now = Date.now();
  for await (const entry of kv.list<Post>({ prefix: ["post"] }, { limit: FEED_LIMIT * 2 })) {
    const p = entry.value;
    if (p.hidden || p.expiresAt <= now) continue;
    if (emotion && p.emotion !== emotion) continue;
    out.push({
      id: p.id,
      text: p.text,
      emotion: p.emotion,
      hugs: p.hugs,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    });
    if (out.length >= FEED_LIMIT) break;
  }
  return out;
}

// Atominis posto atnaujinimas su likusio TTL išsaugojimu (kv.set be expireIn
// paverstų įrašą amžinu — tai laužytų 24 val. pažadą).
async function updatePost(
  id: string,
  mutate: (post: Post) => Post | null,
): Promise<Post | null> {
  const kv = await getKv();
  for (let attempt = 0; attempt < 5; attempt++) {
    const entry = await kv.get<Post>(["post", id]);
    if (!entry.value) return null;
    const updated = mutate(entry.value);
    if (updated === null) return entry.value;
    const remaining = updated.expiresAt - Date.now();
    if (remaining <= 0) return null;
    const res = await kv.atomic()
      .check(entry)
      .set(["post", id], updated, { expireIn: remaining })
      .commit();
    if (res.ok) return updated;
  }
  return null;
}

export async function hugPost(id: string, deviceHash: string): Promise<Post | null> {
  const kv = await getKv();
  const hugKey = ["hug", id, deviceHash];
  const existing = await kv.get(hugKey);
  if (existing.value) {
    return (await kv.get<Post>(["post", id])).value;
  }
  const post = await updatePost(id, (p) => ({ ...p, hugs: p.hugs + 1 }));
  if (post) {
    await kv.set(hugKey, true, { expireIn: Math.max(post.expiresAt - Date.now(), 1000) });
  }
  return post;
}

export async function reportPost(id: string, deviceHash: string): Promise<Post | null> {
  const kv = await getKv();
  const reportKey = ["report", id, deviceHash];
  const existing = await kv.get(reportKey);
  if (existing.value) {
    return (await kv.get<Post>(["post", id])).value;
  }
  const post = await updatePost(id, (p) => {
    const reports = p.reports + 1;
    return { ...p, reports, hidden: reports >= REPORTS_TO_HIDE };
  });
  if (post) {
    await kv.set(reportKey, true, { expireIn: Math.max(post.expiresAt - Date.now(), 1000) });
  }
  return post;
}

// „Ištrinti mano duomenis": fiziškai trinami visi įrenginio postai.
export async function deleteDeviceData(deviceHash: string): Promise<number> {
  const kv = await getKv();
  let deleted = 0;
  for await (const entry of kv.list({ prefix: ["byDevice", deviceHash] })) {
    const postId = entry.key[2] as string;
    await kv.atomic().delete(["post", postId]).delete(entry.key).commit();
    deleted++;
  }
  return deleted;
}

export async function checkRateLimit(deviceHash: string): Promise<boolean> {
  const kv = await getKv();
  const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const key = ["rate", deviceHash, bucket];
  const entry = await kv.get<number>(key);
  const count = entry.value ?? 0;
  if (count >= RATE_LIMIT_PER_HOUR) return false;
  await kv.set(key, count + 1, { expireIn: 60 * 60 * 1000 });
  return true;
}
