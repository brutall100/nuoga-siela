# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Versijos ir changelog

Kiekvienas commit'as gauna versijos prefiksą commit žinutėje, pvz. `v1.6: Trumpas aprašymas` — net
smulkūs tooling/CI pakeitimai, ne tik pilni feature release'ai. Versiją didink nuo paskutinio
`git log` matomo `vX.Y` prefikso (paskutinis komponentas +1; jei reikia naujo minor/major lygio,
spręsk pagal pakeitimo apimtį). Prieš commit'ą papildyk `CHANGELOG.md` — arba nauja `## [vX.Y]`
sekcija su tuo pačiu numeriu, arba įrašu `[Unreleased]` sekcijoje, jei versija dar neapsisprendus
apie release'ą.

## Komandos

```bash
deno task dev    # http://localhost:8000, --watch, unstable KV
deno task start  # be --watch (produkcinis paleidimas)
deno task test   # visi testai server/ kataloge
deno task lint   # deno lint tik main.ts + server/ (public/ — naršyklės kodas, žr. žemiau)
```

Vieno testo paleidimas (naudok `--filter` su testo pavadinimo dalimi):

```bash
deno test --unstable-kv --allow-read --allow-env server/store_test.ts --filter "istorijos"
```

Type-check be paleidimo: `deno check main.ts server/*.ts`. Formatavimas: `deno fmt` (nustatymai
`deno.json` faile — 100 stulpelių, dvi tarpo įtraukos, dvigubos kabutės netaikomos, nes
`singleQuote: false` reiškia dvigubas).

Prieš commit'ą paleisk `deno fmt`, `deno task lint` ir `deno task test` — CI
(`.github/workflows/ci.yml`) juos visus tikrina push/PR metu. `deno lint` global'us paleidimas (be
`deno task`) klaidingai taikytų Deno runtime taisykles (`no-window` ir pan.) `public/js/*.js`
naršyklės kodui, todėl `public/` išskirtas `deno.json` → `lint.exclude` — visada naudok
`deno task
lint`, ne grynas `deno lint`.

## Architektūra

Vienas Deno procesas (`main.ts`) tarnauja ir statiką iš `/public`, ir JSON API iš `/api/*` — jokio
atskiro build žingsnio, jokio bundler'io, jokių priklausomybių (`deno.json` neturi `imports`
mapping'o į išorinius paketus). Klientas — vanilla JS, IIFE moduliai `public/js/*.js`, įkeliami
tiesiogiai `<script>` tag'ais (žr. `public/index.html` tvarką) — ne ES modules, susitarimas yra
`window.xxx` eksportai (`window.t`, `window.i18n`, `window.maskProfanity`, `window.burnText`,
`window.breatheStart/Stop`, `window.scream*`).

Serverio sluoksniai griežtai atskirti:

- `server/filter.ts` — grynos funkcijos, jokio I/O. Sprendžia, ar tekstas praeina (spam/PII/ilgis)
  ir ar jame yra krizės žodžių. Neturi žinoti apie KV ar HTTP.
- `server/store.ts` — visa Deno KV logika ir vienintelis failas, žinantis apie duomenų raktų schemą.
- `server/api.ts` — HTTP↔JSON sluoksnis, kviečia `filter.ts` ir `store.ts`, niekada tiesiogiai
  neliečia KV.

### Anonimiškumas yra architektūrinis apribojimas, ne feature

Tai svarbiausia taisyklė koduojant šiame projekte: **anonimiškumo garantijos turi būti techninės, ne
pažado lygio**. Kai keiti kodą, laikykis šių invariantų:

- Vienintelis kliento identifikatorius yra `crypto.randomUUID()` naršyklėje (`public/js/app.js`,
  `DEVICE_KEY`). Serveris jo **niekada** nemato originalo pavidalu — `deviceHashFrom()`
  (`server/api.ts`) iš karto paverčia `sha256(SALT + uuid)` (`hashDevice()` `server/store.ts`), ir
  originalus UUID toliau niekur nekeliauja, nesaugomas, neloginamas.
- Jokių IP adresų niekur. Log'ai (`main.ts` paskutinė eilutė) sąmoningai apsiriboja
  `metodas kelias statusas` — nepridėk header'ių ar IP į log'us net debug'inimo tikslais.
- Srauto (`kind: "srautas"`) įrašai **visada** kuriami su `expireIn: POST_TTL_MS` KV raktui — tai
  reiškia fizinį (ne "hidden" flag'u imituotą) ištrynimą paties Deno KV. Bet koks naujas mutuojantis
  `store.ts` kodas (pvz. `updatePost`), kuris perrašo įrašą, **privalo** perskaičiuoti ir išsaugoti
  likusį TTL (`markTtl()`/`updatePost` logika) — `kv.set` be `expireIn` paverstų srauto įrašą amžinu
  ir sulaužytų 24 val. pažadą.
- Istorijos (`kind: "istorija"`) neturi TTL (`expiresAt: 0`) — gyvena kol autorius pats netrina per
  `/api/mine/delete`.
- Naujų API endpoint'ų negalima projektuoti taip, kad reikalautų slapukų, sesijų ar bet kokio
  serverio pusėje saugomo identifikatoriaus, kuris susietų kelis veiksmus su konkrečiu asmeniu
  daugiau nei leidžia `deviceHash`.

### Duomenų modelis (Deno KV raktai)

`server/store.ts` viršuje esantis komentaras aprašo kodėl, čia — kaip: postai ir istorijos guli
atskiruose prefiksuose (`["post", id]` / `["story", id]`), nes jiems reikia skirtingos
trynimo/rūšiavimo logikos, bet abu tipus reprezentuoja tas pats `Post` interface'as su `kind` lauku.
`newPostId()` generuoja ID su **atvirkštiniu laiko žymeniu priešakyje** (`1e15 - now`), todėl
`kv.list({prefix: [...]})` natūraliai grąžina naujausius pirmiausia be papildomo indekso — jei keisi
ID formatą, ši savybė dings ir `listFeed`/`listStories` rūšiavimas suirs.

Kiti raktų prefiksai: `["byDevice", deviceHash, postId]` (kam priklauso postas, naudojamas
`/api/mine` ir trynimui), `["hug", postId, deviceHash]` / `["report", postId, deviceHash]`
(idempotencijos žymės — vienas įrenginys = vienas balsas), `["rate", kind, deviceHash, timeBucket]`
(rate limit), `["stats", dayKey, "posts"|"hugs"]` (dienos statistika socialiniam įrodymui).

Testuose (`server_test.ts` failai) KV pakeičiamas `:memory:` egzemplioriumi per `setKvForTesting()`
— niekada netestuok su realiu disko KV.

### Filtro filosofija (`server/filter.ts`)

Keiksmažodžiai yra **sąmoningai leidžiami** produkto lygmenyje — tai išsiliejimo erdvė, ne
moderuojama bendruomenė. Filtras blokuoja tik: tuščią/per ilgą tekstą, nuorodas, el. paštus,
telefonus (išskyrus `HELPLINE_NUMBERS` sąrašą), akivaizdų spam žodyną ir pasikartojančių simbolių
virtines. Nepridėk keiksmažodžių blokavimo į `checkText()` — tam skirtas atskiras, tik-rodymo-lygio
mechanizmas (`public/js/profanity.js`, `maskProfanity()`), kuris tekstą maskuoja kliento pusėje, jei
įjungtas „švelnaus srauto" nustatymas; serveryje tekstas visada saugomas originalus.

Krizės žodžių detekcija (`detectCrisis()`) **nieko neblokuoja** — postas vis tiek publikuojamas, tik
API atsakyme grąžinamas `sos: true`, kad klientas parodytų pagalbos linijų sheet'ą. Pridedant naujus
krizės regex'us (`CRISIS_PATTERNS`), visada duok ir lietuvišką, ir be-diakritikos variantą (pvz.
`/nusižud/i` ir `/nusizud/i`) — vartotojai dažnai rašo be raidžių su nosinėmis.

### Šauksmo kambarys — griežtas "niekada neišeina iš įrenginio" apribojimas

`public/js/scream.js` įrašo garsą tik į `MediaRecorder` → atminties `Blob`. Nėra jokio fetch/upload
kelio — jei kada nors pridedamas serverio endpoint'as garsui, tai pažeidžia pagrindinį šios
funkcijos pažadą, aprašytą ir README, ir paties failo komentaruose. Valymas (`screamCleanup()`) turi
būti iškviestas trimis atvejais — visus tris reikia palaikyti keičiant šitą kodą: (1) naršant į kitą
ekraną (`app.js` `render()`, tikrina `prevScreen === "sauksmas"`), (2) `pagehide` event'e, (3) po
„Ištrinti dabar" mygtuko. Kiekvienas iš jų sustabdo track'us, atlaisvina mikrofoną ir panaikina
`blobUrl`.

### i18n susitarimas

`public/js/i18n.js` turi vieną `STRINGS` objektą su `lt`/`en` raktais. Statiniam HTML tekstui
naudojami `data-i18n*` atributai (pritaikomi per `window.i18n.apply()`), dinaminiam tekstui su
kintamaisiais — `window.t(key, {var: value})` su `{var}` placeholder'iais stringe. Pridedant naują
tekstą, visada įrašyk raktą į **abu** kalbos objektus — `window.t()` fallback'ina į `lt`, bet
trūkstamas EN vertimas liktų nepastebėtas.

### Saugumo header'iai

`main.ts` taiko tą patį `SECURITY_HEADERS` rinkinį ir statikai, ir API atsakymams (CSP,
`referrer-policy: no-referrer`, ir t.t.). `permissions-policy` sąmoningai leidžia
`microphone=(self)` tik dėl Šauksmo kambario — nepridėk `camera` ar `geolocation` leidimų, jie
eksplicitiškai uždrausti.
