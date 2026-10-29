import {
  b64urlDecode,
  b64urlEncode,
  encryptPayload,
  isAllowedEndpoint,
  sendPush,
} from "./webpush.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
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

// Naršyklės pusė: prenumeratos raktai ir RFC 8291 iššifravimas.
async function browserSide() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  ) as CryptoKeyPair;
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));

  async function decrypt(body: Uint8Array<ArrayBuffer>): Promise<string> {
    const salt = body.slice(0, 16);
    const idlen = body[20];
    const asPublic = body.slice(21, 21 + idlen);
    const cipher = body.slice(21 + idlen);
    const asKey = await crypto.subtle.importKey(
      "raw",
      asPublic,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
    const ecdh = new Uint8Array(
      await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, pair.privateKey, 256),
    );
    const info = new Uint8Array([...enc.encode("WebPush: info\0"), ...uaPublic, ...asPublic]);
    const ikm = await hkdf(auth, ecdh, info, 32);
    const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
    const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
    const plain = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, cipher),
    );
    assert(plain[plain.length - 1] === 2, "paskutinio įrašo skirtukas 0x02");
    return new TextDecoder().decode(plain.slice(0, -1));
  }

  return {
    sub: {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      p256dh: b64urlEncode(uaPublic),
      auth: b64urlEncode(auth),
    },
    decrypt,
  };
}

async function vapidKeys() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {
    keys: { publicKey: b64urlEncode(pub), privateKey: jwk.d!, subject: "https://nuogasiela.lt" },
    verifyKey: pair.publicKey,
  };
}

Deno.test("base64url: pirmyn ir atgal", () => {
  const bytes = crypto.getRandomValues(new Uint8Array(65));
  const text = b64urlEncode(bytes);
  assert(!/[+/=]/.test(text), "be +, / ir =");
  assert(b64urlDecode(text).join() === bytes.join(), "tie patys baitai");
});

Deno.test("aes128gcm: naršyklė iššifruoja tą patį tekstą", async () => {
  const { sub, decrypt } = await browserSide();
  const body = await encryptPayload(sub, enc.encode('{"body":"Sraute 3 nauji tekstai"}'));
  assert(new DataView(body.buffer).getUint32(16) === 4096, "rs = 4096");
  assert(body[20] === 65, "keyid — 65 baitų viešasis raktas");
  assert((await decrypt(body)) === '{"body":"Sraute 3 nauji tekstai"}', "iššifruota");
});

Deno.test("isAllowedEndpoint: tik žinomos push tarnybos per https", () => {
  assert(isAllowedEndpoint("https://fcm.googleapis.com/fcm/send/x"), "FCM");
  assert(isAllowedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"), "Mozilla");
  assert(isAllowedEndpoint("https://web.push.apple.com/x"), "Apple");
  assert(!isAllowedEndpoint("http://fcm.googleapis.com/x"), "ne http");
  assert(!isAllowedEndpoint("https://fcm.googleapis.com.evil.lt/x"), "ne apgaulingas domenas");
  assert(!isAllowedEndpoint("https://localhost/x"), "ne vidinis adresas");
  assert(!isAllowedEndpoint("nesąmonė"), "ne URL");
});

Deno.test("sendPush: VAPID parašas galioja, 410 → gone", async () => {
  const { sub, decrypt } = await browserSide();
  const { keys, verifyKey } = await vapidKeys();
  const realFetch = globalThis.fetch;
  let status = 201;
  let captured: Request | null = null;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    captured = new Request(input, init);
    return Promise.resolve(new Response(null, { status }));
  };
  try {
    assert((await sendPush(sub, { n: 1 }, keys)) === "ok", "201 → ok");
    const req = captured! as Request;
    assert(req.headers.get("content-encoding") === "aes128gcm", "aes128gcm");
    assert(req.headers.get("topic") === "srautas", "topic");
    const auth = req.headers.get("authorization")!;
    const [, jwt, k] = auth.match(/^vapid t=([^,]+), k=(.+)$/)!;
    assert(k === keys.publicKey, "k — viešasis raktas");
    const [h, c, s] = jwt.split(".");
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(c)));
    assert(claims.aud === "https://fcm.googleapis.com", "aud — push tarnybos kilmė");
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifyKey,
      b64urlDecode(s),
      enc.encode(`${h}.${c}`),
    );
    assert(ok, "ES256 parašas galioja");
    const body = new Uint8Array(await req.arrayBuffer());
    assert((await decrypt(body)) === '{"n":1}', "turinys iššifruojamas");

    status = 410;
    assert((await sendPush(sub, { n: 1 }, keys)) === "gone", "410 → gone");
    status = 500;
    assert((await sendPush(sub, { n: 1 }, keys)) === "error", "500 → error");
  } finally {
    globalThis.fetch = realFetch;
  }
});
