import {
  createPost,
  deleteDeviceData,
  hashDevice,
  hugPost,
  listFeed,
  reportPost,
  setKvForTesting,
} from "./store.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function freshKv(): Promise<Deno.Kv> {
  const kv = await Deno.openKv(":memory:");
  setKvForTesting(kv);
  return kv;
}

Deno.test("hashDevice: negrįžtamas ir stabilus", async () => {
  const a = await hashDevice("uuid-vienas");
  const b = await hashDevice("uuid-vienas");
  const c = await hashDevice("uuid-kitas");
  assert(a === b, "tas pats įvestis → tas pats hash");
  assert(a !== c, "skirtingos įvestys → skirtingi hash");
  assert(!a.includes("uuid"), "hash'e nėra originalo");
});

Deno.test("pilnas ciklas: sukurti → srautas → suprantu → pranešti → paslėpti", async () => {
  const kv = await freshKv();
  const dev = await hashDevice("d1");

  const post = await createPost(dev, "sunki diena", "liudesys");
  let feed = await listFeed();
  assert(feed.length === 1 && feed[0].id === post.id, "postas sraute");

  // Suprantu tave — antras kartas iš to paties įrenginio nesiskaičiuoja.
  await hugPost(post.id, await hashDevice("d2"));
  const afterDup = await hugPost(post.id, await hashDevice("d2"));
  assert(afterDup?.hugs === 1, "dublikatas nesiskaičiuoja");

  // 3 pranešimai iš skirtingų įrenginių → paslėpta.
  await reportPost(post.id, await hashDevice("r1"));
  await reportPost(post.id, await hashDevice("r2"));
  feed = await listFeed();
  assert(feed.length === 1, "po 2 pranešimų dar matomas");
  await reportPost(post.id, await hashDevice("r3"));
  feed = await listFeed();
  assert(feed.length === 0, "po 3 pranešimų paslėptas");

  kv.close();
});

Deno.test("srauto tvarka: naujausi viršuje, filtras pagal emociją", async () => {
  const kv = await freshKv();
  const dev = await hashDevice("d1");
  await createPost(dev, "pirmas", "pyktis");
  await new Promise((r) => setTimeout(r, 5));
  await createPost(dev, "antras", "viltis");

  const feed = await listFeed();
  assert(feed[0].text === "antras", "naujausias pirmas");

  const tikPyktis = await listFeed("pyktis");
  assert(tikPyktis.length === 1 && tikPyktis[0].text === "pirmas", "filtras veikia");

  kv.close();
});

Deno.test("ištrinti mano duomenis: dingsta tik to įrenginio postai", async () => {
  const kv = await freshKv();
  const mano = await hashDevice("mano");
  const kito = await hashDevice("kito");
  await createPost(mano, "mano tekstas", "pyktis");
  await createPost(kito, "kito tekstas", "viltis");

  const deleted = await deleteDeviceData(mano);
  assert(deleted === 1, "ištrintas vienas");
  const feed = await listFeed();
  assert(feed.length === 1 && feed[0].text === "kito tekstas", "kito liko");

  kv.close();
});
