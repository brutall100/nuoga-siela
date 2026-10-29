import {
  createPost,
  listPushSubscriptions,
  type PushRecord,
  savePushSubscription,
  setKvForTesting,
} from "./store.ts";
import {
  countSince,
  DAILY_HOUR,
  INSTANT_GAP_MS,
  isDue,
  isQuietHour,
  messageFor,
  runPushRound,
  vilniusHour,
} from "./notify.ts";
import type { SendResult } from "./webpush.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function freshKv(): Promise<Deno.Kv> {
  const kv = await Deno.openKv(":memory:");
  setKvForTesting(kv);
  return kv;
}

const KEYS = { publicKey: "pub", privateKey: "priv", subject: "https://nuogasiela.lt" };

function rec(mode: PushRecord["mode"], lastSentAt = 0): PushRecord {
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/x",
    p256dh: "",
    auth: "",
    mode,
    lang: "lt",
    since: 0,
    lastSentAt,
    expiresAt: Date.now() + 1000,
  };
}

// Laikas, kai Vilniuje yra nurodyta valanda (šiandien).
function atVilniusHour(hour: number): number {
  const base = Date.now() - (Date.now() % 3_600_000);
  for (let i = 0; i < 24; i++) {
    const t = base + i * 3_600_000;
    if (vilniusHour(t) === hour) return t;
  }
  throw new Error("nerasta valanda");
}

Deno.test("messageFor: lietuviškos daugiskaitos formos, be teksto turinio", () => {
  assert(messageFor("lt", 1).body === "Sraute 1 naujas tekstas", "1");
  assert(messageFor("lt", 3).body === "Sraute 3 nauji tekstai", "3");
  assert(messageFor("lt", 11).body === "Sraute 11 naujų tekstų", "11");
  assert(messageFor("lt", 15).body === "Sraute 15 naujų tekstų", "15");
  assert(messageFor("lt", 20).body === "Sraute 20 naujų tekstų", "20");
  assert(messageFor("lt", 21).body === "Sraute 21 naujas tekstas", "21");
  assert(messageFor("lt", 22).body === "Sraute 22 nauji tekstai", "22");
  assert(messageFor("en", 1).body === "1 new text in the stream", "en 1");
  assert(messageFor("en", 4).body === "4 new texts in the stream", "en 4");
  assert(messageFor("lt", 2).url === "/srautas", "atidaro srautą");
});

Deno.test("tylos valandos 22–8", () => {
  assert(isQuietHour(22) && isQuietHour(3) && isQuietHour(7), "naktis tyli");
  assert(!isQuietHour(8) && !isQuietHour(21), "diena ne");
});

Deno.test("countSince: tik po paskutinio pranešimo", () => {
  assert(countSince([500, 400, 300], 350) === 2, "du nauji");
  assert(countSince([500], 500) === 0, "lygus laikas — ne naujas");
});

Deno.test("isDue: daily tik 19 val. per cron, instant — ne dažniau nei kas valandą", () => {
  const now = 10 * INSTANT_GAP_MS;
  assert(!isDue(rec("daily"), 0, now, DAILY_HOUR, "tick"), "be naujų — nieko");
  assert(isDue(rec("daily"), 2, now, DAILY_HOUR, "tick"), "daily 19 val.");
  assert(!isDue(rec("daily"), 2, now, 12, "tick"), "daily ne 12 val.");
  assert(!isDue(rec("daily"), 2, now, DAILY_HOUR, "post"), "daily ne iš karto po posto");
  assert(isDue(rec("instant"), 1, now, 12, "post"), "instant iškart");
  assert(!isDue(rec("instant", now - 1000), 1, now, 12, "post"), "instant ne dažniau nei kas val.");
  assert(isDue(rec("instant", now - INSTANT_GAP_MS), 3, now, 12, "tick"), "po valandos — sujungta");
  assert(!isDue(rec("instant"), 1, now, 23, "post"), "instant tyli naktį");
});

Deno.test("runPushRound: siunčia tik kam laikas, gone → ištrina", async () => {
  const kv = await freshKv();
  const sub = (id: string) => ({
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    p256dh: "p",
    auth: "a",
  });
  await savePushSubscription(sub("dienai"), "daily", "lt");
  await savePushSubscription(sub("iskart"), "instant", "en");
  await savePushSubscription(sub("dinges"), "instant", "lt");
  // Tekstai turi būti vėlesni už prenumeratą (since), ne tą pačią milisekundę.
  await new Promise((r) => setTimeout(r, 5));
  await createPost("dev", "pirmas tekstas", "viltis");
  await createPost("dev", "antras tekstas", "nerimas");

  const sent: { endpoint: string; payload: { body: string } }[] = [];
  const sender = (r: PushRecord, payload: unknown): Promise<SendResult> => {
    if (r.endpoint.endsWith("dinges")) return Promise.resolve("gone");
    sent.push({ endpoint: r.endpoint, payload: payload as { body: string } });
    return Promise.resolve("ok");
  };

  const noon = atVilniusHour(12);
  const n = await runPushRound("post", noon, sender, KEYS);
  assert(n === 1, "tik instant (daily laukia 19 val.)");
  assert(sent[0].endpoint.endsWith("iskart"), "instant prenumeratorius");
  assert(sent[0].payload.body === "2 new texts in the stream", "skaičius, ne tekstas");
  const left = await listPushSubscriptions();
  assert(left.length === 2, "nebegaliojanti prenumerata ištrinta");
  assert(left.find((r) => r.mode === "instant")!.lastSentAt === noon, "pažymėta išsiųsta");

  // Ta pati valanda — instant jau gavo, naujų nėra.
  assert((await runPushRound("tick", noon + 60_000, sender, KEYS)) === 0, "kartojimas — nieko");

  // Be VAPID raktų — nieko nesiunčiama.
  assert((await runPushRound("tick", noon, sender, null)) === 0, "be raktų");
  kv.close();
});
