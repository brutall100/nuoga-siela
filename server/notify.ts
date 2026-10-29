// Kada ir kam siųsti pranešimą apie naujus srauto tekstus.
// Pranešime NIEKADA nėra teksto turinio — tik skaičius (užrakinto telefono
// ekrane kito žmogaus krizės tekstas neturi būti matomas).
//  - "daily": kartą per dieną DAILY_HOUR val. Vilniaus laiku, tik jei yra naujų;
//  - "instant": pirmas naujas tekstas — iškart, kiti sujungiami ne dažniau nei
//    kas valandą; tylos valandomis (22–8) nesiunčiama — sukaupta ateina ryte.

import {
  deletePushSubscription,
  listFeedTimes,
  listPushSubscriptions,
  markPushSent,
  type PushLang,
  type PushRecord,
} from "./store.ts";
import { sendPush, type SendResult, type VapidKeys } from "./webpush.ts";

export const DAILY_HOUR = 19;
export const QUIET_FROM = 22;
export const QUIET_TO = 8;
// Valanda su minutės atsarga: cron'as ne visada paleidžiamas lygiai :00.
export const INSTANT_GAP_MS = 59 * 60 * 1000;

export type Trigger = "tick" | "post";

export function vapidFromEnv(): VapidKeys | null {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: Deno.env.get("VAPID_SUBJECT") ?? "https://nuogasiela.lt",
  };
}

const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Vilnius",
  hour: "numeric",
  hourCycle: "h23",
});

export function vilniusHour(at: number): number {
  return Number(hourFormat.format(at));
}

export function isQuietHour(hour: number): boolean {
  return hour >= QUIET_FROM || hour < QUIET_TO;
}

export function countSince(times: number[], since: number): number {
  return times.filter((t) => t > since).length;
}

export function isDue(
  rec: PushRecord,
  newCount: number,
  now: number,
  hour: number,
  trigger: Trigger,
): boolean {
  if (newCount === 0) return false;
  if (rec.mode === "daily") return trigger === "tick" && hour === DAILY_HOUR;
  return !isQuietHour(hour) && now - rec.lastSentAt >= INSTANT_GAP_MS;
}

// 1 naujas tekstas, 2–9 nauji tekstai, 10–20 naujų tekstų, 21 naujas tekstas...
function ltNewTexts(n: number): string {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return "naujas tekstas";
  if (d >= 2 && !(h >= 12 && h <= 19)) return "nauji tekstai";
  return "naujų tekstų";
}

export function messageFor(
  lang: PushLang,
  n: number,
): { title: string; body: string; url: string } {
  const body = lang === "en"
    ? `${n} new ${n === 1 ? "text" : "texts"} in the stream`
    : `Sraute ${n} ${ltNewTexts(n)}`;
  return { title: "Nuoga Siela", body, url: "/srautas" };
}

type Sender = (rec: PushRecord, payload: unknown, keys: VapidKeys) => Promise<SendResult>;

let running = false;

// Vienas pranešimų ratas: kam laikas — siunčiam, nebegaliojančias prenumeratas trinam.
// Grąžina išsiųstų pranešimų skaičių.
export async function runPushRound(
  trigger: Trigger,
  now = Date.now(),
  send: Sender = sendPush,
  keys: VapidKeys | null = vapidFromEnv(),
): Promise<number> {
  if (!keys || running) return 0;
  running = true;
  try {
    const hour = vilniusHour(now);
    const subs = await listPushSubscriptions();
    if (subs.length === 0) return 0;
    const times = await listFeedTimes();
    const due = subs.flatMap((rec) => {
      const n = countSince(times, rec.since);
      return isDue(rec, n, now, hour, trigger) ? [{ rec, n }] : [];
    });
    let sent = 0;
    for (let i = 0; i < due.length; i += 10) {
      await Promise.all(
        due.slice(i, i + 10).map(async ({ rec, n }) => {
          let result: SendResult;
          try {
            result = await send(rec, messageFor(rec.lang, n), keys);
          } catch {
            result = "error";
          }
          if (result === "ok") {
            await markPushSent(rec.endpoint, now);
            sent++;
          } else if (result === "gone") {
            await deletePushSubscription(rec.endpoint);
          }
        }),
      );
    }
    return sent;
  } finally {
    running = false;
  }
}
