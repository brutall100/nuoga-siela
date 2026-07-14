import {
  checkRateLimit,
  createPost,
  deleteDeviceData,
  getPublicStory,
  getStats,
  hashDevice,
  hugPost,
  listFeed,
  listMine,
  listStories,
  reportPost,
  setKvForTesting,
  STORY_LIMIT_PER_DAY,
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

Deno.test("istorijos: be termino, atskirtos nuo srauto, rūšiuojamos pagal hugs", async () => {
  const kv = await freshKv();
  const dev = await hashDevice("d1");

  const story1 = await createPost(dev, "pirma istorija", "liudesys", "istorija");
  await new Promise((r) => setTimeout(r, 5));
  const story2 = await createPost(dev, "antra istorija", "viltis", "istorija");
  await createPost(dev, "srauto tekstas", "pyktis", "srautas");

  assert(story1.expiresAt === 0, "istorija be termino");

  const feed = await listFeed();
  assert(feed.length === 1 && feed[0].text === "srauto tekstas", "sraute tik srauto tekstai");

  // Be hugs — naujausios pirmos pagal antrinį kriterijų.
  let stories = await listStories();
  assert(stories.length === 2, "abi istorijos matomos");
  assert(stories[0].text === "antra istorija", "naujausia pirmesnė kai hugs lygūs");

  // Pirmajai daugiau hugs — ji iškyla į viršų.
  await hugPost(story1.id, await hashDevice("kitas"));
  stories = await listStories();
  assert(stories[0].id === story1.id, "daugiausia suprasta iškyla");

  stories = await listStories(undefined, "naujausios");
  assert(stories[0].id === story2.id, "rūšiavimas 'naujausios' veikia");

  // Istorija dalyvauja "mano" sąraše ir trynime.
  const mine = await listMine(dev);
  assert(mine.length === 3, "mano sąraše postas ir istorijos");
  const deleted = await deleteDeviceData(dev);
  assert(deleted === 3, "trinamos ir istorijos");
  assert((await listStories()).length === 0, "istorijų neliko");

  kv.close();
});

Deno.test("listStories: limit parametras atskiria sitemap nuo UI srauto ribos", async () => {
  const kv = await freshKv();
  const dev = await hashDevice("d1");

  await createPost(dev, "istorija A", "liudesys", "istorija");
  await createPost(dev, "istorija B", "viltis", "istorija");
  await createPost(dev, "istorija C", "nerimas", "istorija");

  const capped = await listStories(undefined, "naujausios", 1);
  assert(capped.length === 1, "eksplicitinis limit apkarpo rezultatą");

  const uncapped = await listStories(undefined, "naujausios");
  assert(uncapped.length === 3, "numatytas limit (STORY_FEED_LIMIT) neapkarpo mažo kiekio");

  const sitemapSized = await listStories(undefined, "naujausios", 5000);
  assert(sitemapSized.length === 3, "didelis limit (sitemap atvejis) grąžina visas istorijas");

  kv.close();
});

Deno.test("istorijų rate limit: atskiras nuo srauto", async () => {
  const kv = await freshKv();
  const dev = await hashDevice("d1");

  for (let i = 0; i < STORY_LIMIT_PER_DAY; i++) {
    assert(await checkRateLimit(dev, "istorija"), `istorija ${i + 1} leidžiama`);
  }
  assert(!(await checkRateLimit(dev, "istorija")), "trečia istorija per parą blokuojama");
  assert(await checkRateLimit(dev, "srautas"), "srauto limitas nepriklausomas");

  kv.close();
});

Deno.test("getPublicStory: SSR permalink'ui — 404 elgesys ištrintai/paslėptai/srauto įrašui", async () => {
  const kv = await freshKv();
  const dev = await hashDevice("d1");

  const story = await createPost(dev, "mano istorija", "viltis", "istorija");
  const post = await createPost(dev, "srauto tekstas", "pyktis", "srautas");

  const found = await getPublicStory(story.id);
  assert(found?.text === "mano istorija", "istorija randama pagal id");

  assert((await getPublicStory(post.id)) === null, "srauto postas neturi permalink'o");
  assert((await getPublicStory("nera-tokio")) === null, "neegzistuojantis id → null");

  // 3 pranešimai → paslėpta → permalink'as turi iškart dingti.
  await reportPost(story.id, await hashDevice("r1"));
  await reportPost(story.id, await hashDevice("r2"));
  await reportPost(story.id, await hashDevice("r3"));
  assert((await getPublicStory(story.id)) === null, "paslėpta istorija → null");

  kv.close();
});

Deno.test("statistika: skaičiuoja postus ir hugs", async () => {
  const kv = await freshKv();
  const dev = await hashDevice("d1");

  const post = await createPost(dev, "tekstas", "pyktis");
  await hugPost(post.id, await hashDevice("kitas"));

  const stats = await getStats();
  assert(stats.postsToday === 1, "postai skaičiuojami");
  assert(stats.hugsToday === 1, "hugs skaičiuojami");

  kv.close();
});
