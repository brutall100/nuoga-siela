// Web Push protokolas be priklausomybių — tik WebCrypto:
//  - RFC 8291 (aes128gcm): turinį užšifruojame naršyklės raktu, tad push tarnyba
//    (Google FCM, Mozilla, Apple) mato tik užšifruotus baitus, ne pranešimo tekstą;
//  - RFC 8292 (VAPID): ES256 JWT, kuriuo push tarnybai įrodome, kad siunčiame mes.
// Nežino nei apie KV, nei apie tai, kas ir kada siunčiama — tik kaip.

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string; // naršyklės ECDH viešasis raktas, base64url (65 baitai)
  auth: string; // autentifikacijos paslaptis, base64url (16 baitų)
}

export interface VapidKeys {
  publicKey: string; // base64url, nesuspaustas P-256 taškas (65 baitai)
  privateKey: string; // base64url, P-256 "d" (32 baitai)
  subject: string; // mailto: arba https: kontaktas push tarnybai
}

// Leidžiamos tik žinomos push tarnybos — kitaip /api/push/subscribe leistų
// priversti serverį siųsti užklausas bet kur (SSRF).
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.apple\.com$/,
];

export function isAllowedEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
}

export function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function b64urlDecode(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replaceAll("-", "+").replaceAll("_", "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

const enc = new TextEncoder();

async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  bytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    bytes * 8,
  );
  return new Uint8Array(bits);
}

// Vienas aes128gcm įrašas (RFC 8188): antraštė salt|rs|idlen|keyid + šifrotekstas.
export async function encryptPayload(
  sub: PushSubscriptionData,
  plaintext: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = b64urlDecode(sub.p256dh);
  const authSecret = b64urlDecode(sub.auth);

  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  ) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, ephemeral.privateKey, 256),
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 — paskutinio įrašo skirtukas, be papildomo užpildo.
  const padded = concat(plaintext, new Uint8Array([2]));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

async function vapidAuthorization(endpoint: string, keys: VapidKeys): Promise<string> {
  const pub = b64urlDecode(keys.publicKey);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: b64urlEncode(pub.slice(1, 33)),
    y: b64urlEncode(pub.slice(33, 65)),
    d: keys.privateKey,
  };
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64urlEncode(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: keys.subject,
  })));
  const unsigned = `${header}.${claims}`;
  // WebCrypto ECDSA parašas jau yra r||s (64 baitai) — būtent toks, kokio reikia JWS.
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)),
  );
  return `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${keys.publicKey}`;
}

export type SendResult = "ok" | "gone" | "error";

// "gone" — prenumerata nebegalioja (404/410), ją reikia ištrinti.
export async function sendPush(
  sub: PushSubscriptionData,
  payload: unknown,
  keys: VapidKeys,
): Promise<SendResult> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(payload)));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      authorization: await vapidAuthorization(sub.endpoint, keys),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      // Neįteiktas pranešimas po 12 val. nebeaktualus; to paties „topic" naujas
      // pranešimas pakeičia dar neįteiktą seną (telefonas buvo išjungtas).
      ttl: String(12 * 60 * 60),
      urgency: "normal",
      topic: "srautas",
    },
    body,
  });
  await res.body?.cancel();
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok ? "ok" : "error";
}
