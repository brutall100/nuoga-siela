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

## Darbo eiga: visada į `main`

Savininko nurodymas: kiekvienas užbaigtas ir patikrintas pakeitimas **visada sujungiamas į `main`**
be papildomo klausimo — PR iš darbo šakos → palaukti žalio CI → squash merge su `(#N)` pavadinime
(kelių versijų PR — rebase, kad kiekvienas `vX.Y` commit'as liktų atskiras). Po merge Deno Deploy
pats įdiegia į nuogasiela.lt; būseną matyti GitHub commit status'e `deploy/brutall100/nuoga-siela`.
Raudonas CI — taisyti ir tik tada jungti, niekada nejungti raudono.

## Komandos

```bash
deno task dev    # http://localhost:8000, --watch (+ public/), unstable KV
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

## Debesies aplinka (Claude Code cloud)

Deno debesies sesijose iš anksto neįdiegtas, o „Trusted“ tinkle `dl.deno.land` ir `deno.land`
užblokuoti (403), todėl oficialus `install.sh` neveikia. Deno diegiamas per oficialų npm paketą
`deno@2` (naujausia 2.x, kaip CI `v2.x`; jo `postinstall` pakeičia Node apvalkalą tikru binariniu
failu) su `NODE_OPTIONS=--use-openssl-ca` — tinklo šliuzas perima TLS savo CA, kurį turi tik
sistemos saugykla, ne Node įmontuotas sąrašas. Du sluoksniai:

- **Aplinkos setup script'as** (claude.ai aplinkos nustatymuose, ne repozitorijoje) įdiegia Deno
  prieš sesiją; failų sistemos snapshot'as kešuojamas ~7 d., todėl įprastai Deno jau būna.
- **SessionStart hook'as** (`.claude/settings.json` → `.claude/hooks/session-start.sh`) — atsarginis
  kelias kitoms aplinkoms: tik kai `CLAUDE_CODE_REMOTE=true` ir `deno` nerastas, įdiegia tą patį
  `deno@2`. Lokaliai nieko nedaro. Jo diegimo eilutės tinka ir setup script'ui, jei aplinką reikės
  sukurti iš naujo.

## Architektūra

Vienas Deno procesas (`main.ts`) tarnauja ir statiką iš `/public`, ir JSON API iš `/api/*` — jokio
atskiro build žingsnio, jokio bundler'io, jokių priklausomybių (`deno.json` neturi `imports`
mapping'o į išorinius paketus). Klientas — vanilla JS, IIFE moduliai `public/js/*.js`, įkeliami
tiesiogiai `<script>` tag'ais (žr. `public/index.html` tvarką) — ne ES modules, susitarimas yra
`window.xxx` eksportai (`window.t`, `window.i18n`, `window.maskProfanity`, `window.burnText`,
`window.ui`, `window.themeToggle`, `window.breatheStart/Stop`, `window.scream*`, `window.mood`,
`window.ambient`).

### Maršrutizacija: tikri URL keliai, ne hash

Ekranai (`rasyti`, `srautas`, `istorijos`, `sos`, `sauksmas`, `kalendorius`, `nustatymai`) turi
tikrus kelius (`/rasyti`, `/srautas`, ...), ne `#/rasyti` — svarbu SEO, kad Google galėtų juos
indeksuoti kaip atskirus puslapius. Klientas (`public/js/app.js`) naršo per
`history.pushState`/`popstate` (`currentScreen()` skaito `location.pathname`, `navigate()` — bendra
pagalbinė funkcija stumti naują kelią ir perpiešti); vidinių nuorodų paspaudimai perimami delegated
click handler'iu, kad SPA neperkrautų viso puslapio. Be JS naršyklė tiesiog atlieka įprastą
navigaciją — `main.ts` `serveStatic()` fallback'as (nežinomas kelias be taško → `index.html`) tai
jau sprendžia serverio pusėje, tad tiesioginis atidarymas/perkrovimas ant `/srautas` ir pan. veikia
visada. `main.ts` `applyRouteMeta()` kiekvienam iš šių septynių kelių prieš atiduodant `index.html`
pakeičia `<title>`/`<meta description>`/OG/Twitter turinį paprastu string replace (`ROUTE_META`
lentelė) — vis dar be jokio templating variklio, tik `.replace()` su regex'ais, apgaubiančiais žymos
turinį.

### Istorijų SSR permalink'ai (`/istorijos/:id`)

Kiekviena vieša istorija turi savo indeksuojamą, serveryje atrenderintą puslapį — `main.ts`
`serveStoryPage()`, atpažįstamas prieš bendrą statinių failų dispatch'ą (`STORY_PATH_RE`). Tekstas
įterpiamas per `escapeHtml()` (XSS apsauga, nes tai vartotojo tekstas), niekada per innerHTML
analogą be escaping'o. Duomenys imami per `getPublicStory()` (`server/store.ts`) — tiesioginis
`["story", id]` skaitymas, **ne** `findPost()` (tas naudojamas tik vidiniam hug/report), nes
`srautas` postai niekada neturi permalink'o. `getPublicStory()` grąžina `null`, jei įrašo nėra arba
jis `hidden` — todėl ištrinta/paslėpta istorija tampa realiu `404` nedelsiant, jokio atskiro cache
invalidavimo nereikia. Tai tiesiogiai palaiko anonimiškumo pažadą žemiau: pašalinta istorija negali
toliau "gyventi" per užkešuotą SSR puslapį.

`GET /sitemap.xml` (`serveSitemap()`) generuojamas dinamiškai kiekvienam request'ui — statiniai
keliai + `listStories()` rezultatas, konvertuotas į `/istorijos/:id` `<url>` įrašus. Statinio
`public/sitemap.xml` failo sąmoningai nėra — jei jį vėl pridėsi, sitemap nustos atspindėti realias
istorijas.

`listStories()` (`server/store.ts`) turi trečią, pasirenkamą `limit` parametrą — **nekeisk jo
numatytosios reikšmės** (`STORY_FEED_LIMIT = 50`), nes nuo jos priklauso `/api/stories` UI srauto
ekranas. `serveSitemap()` ir `serveStoriesFeed()` (`GET /istorijos/feed.xml`, Atom naujausioms
istorijoms) sąmoningai paduoda daug didesnį `SITEMAP_STORY_LIMIT`/`FEED_ENTRY_LIMIT`, kad senesnės
ar mažiau "suprastos" istorijos neišnyktų iš paieškos sistemų matomumo vien todėl, kad jos nebetelpa
į vieno UI ekrano sąrašą — tai buvo tyliai sulaužyta prieš šį atskyrimą.

IndexNow (`server/api.ts` `pingIndexNow()`) paskelbia naują istoriją Bing/Yandex iš karto, bet
**tik** kai `INDEXNOW_KEY` aplinkos kintamasis nustatytas (numatyta — nenustatytas, tad lokaliame
dev'e tyliai neveikia) ir **tik** `kind === "istorija"` postams — `srautas` niekada nesiunčiamas,
nes jis vis tiek išnyks per 24 val. ir nėra prasmės jo indeksuoti. Ping'as visada `fire-and-forget`
(`.catch(() => {})`) — jo klaida niekada neturi sutrikdyti paties posto sukūrimo atsakymo.

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
- Istorijų SSR permalink'ai (`/istorijos/:id`, žr. žemiau) renderinami tiesiogiai iš KV kiekvienam
  request'ui — jokio disko/atminties cache tarp KV ir atsakymo. Ištrintos ar paslėptos istorijos
  permalink'as **privalo** iškart grąžinti `404`, ne senai užkešuotą HTML — priešingu atveju
  "fiziškai ištrinta" pažadas taptų melagingas paieškos sistemoms ir dalintasis nuorodoms.

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
(rate limit), `["stats", dayKey, "posts"|"hugs"]` (dienos statistika socialiniam įrodymui),
`["stats", dayKey, "emo", emotion]` (kiek kartų per dieną pažymėta emocija — `GET /api/mood` bendrai
savaitės nuotaikai; `expireIn` 8 d.). Visi `stats` raktai — tik suminiai skaičiai: niekada nepridėk
prie jų `deviceHash`, posto ID ar bet ko, kas leistų juos susieti su žmogumi.

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

### Emocijų kalendorius ir raminantys garsai

Asmeninis kalendorius (`public/js/mood.js`) gyvena **tik** `localStorage` (`ns_mood`, masyvas
`[vietinė diena "YYYY-MM-DD", emocija]`) — niekada tekstas, niekada nesiunčiamas į serverį. Įrašas
daromas `app.js` `sendEmotionToCalendar()` po sėkmingo paleidimo ir po deginimo (jei emocija
pasirinkta — deginimas vis tiek nieko nesiunčia); ta pati funkcija paleidžia `flyToCalendar()`
animaciją (emocijos simbolis nuskrenda į Kalendoriaus tab'ą). „Ištrinti mano duomenis" jį išvalo
(`window.mood.clear()`). Bendra savaitės nuotaika rodoma tik kai `total >= 5`, kaip ir socialinis
įrodymas. Kalendoriaus ekranas: „Tavo savaitė“ — einamosios savaitės pirmadienis–sekmadienis
(šiandienos simbolis gyvas), mėnesio tinklelis su dienos dominuojančios emocijos simboliu, legenda,
o po jais — bendra nuotaika ir SOS užuomina (abi rodomos tik esant sąlygoms).

Garsai (`public/js/sounds.js`) — failai `public/sounds/{upe,lietus,lauzas}.mp3`, grojami per Web
Audio (`fetch` + `decodeAudioData`, kilpa, `GainNode` fade), ne per `<audio>`: iOS neleidžia keisti
`<audio>` garsumo, o `serveStatic()` nepalaiko `Range` užklausų, kurių Safari reikalauja medijai.
Atėjus į Šauksmo kambarį fono garsas sustabdomas (`render()`), kad nepatektų į įrašą. Rašymo ekrane
garsą renkasi „Fonas“ mygtukas laukelio kampe (`#sound-btn` → meniu `#sound-menu`), SOS ekrane —
chip'ai; abu sinchronizuoja `app.js` `syncAmbient()`. Failai turi būti su laisva licencija (CC0 ar
pan.) — šaltinį ir licenciją užrašyk `CHANGELOG.md`.

### Produkto kelias — nuoseklumas

Visa programa seka vieną kelią, ir nauji ekranai ar tekstai turi jį palaikyti, ne kurti šalutinį:
**emocija → žodžiai → ką su jais daryti**. Rašymo kortelėje tvarka fiksuota: „Kaip jautiesi?“
(emocijų plytelės 3×2) → laukelis → „Ką darysi su tuo?“ — trys plytelės `.path` vienoje eilėje
(Sudeginti / Į srautą / Į istorijas, su linijinėmis ikonomis), be aprašų; paspaudimas iškart atlieka
veiksmą. Viena emocija visada pažymėta (`app.js` `DEFAULT_EMOTION`): numatyta „Viltis“ — atidarius
ekraną ir po kiekvieno paleidimo ar deginimo; paspaudus pažymėtą dar kartą ji nenuimama, tik
pakeičiama kita. Todėl nepakeitus emocijos į kalendorių ir `stats` keliauja „Viltis“ — tai
sąmoningas produkto sprendimas. Simboliai visada pilnos spalvos (jokio pilkinimo) — pažymėtą rodo
plytelės fonas ir rėmelis, o pažymėtos emocijos simbolis juda. Atidarius rašymo ekraną visi
simboliai ir trijų kelių ikonos vieną kartą sujuda (`app.js` `greetWriteScreen()`,
`icons.playOnce()`), paskui juda tik pažymėtas. Srauto ir istorijos skirtumas (24 val. ir 1000
ženklų / lieka ir 5000 ženklų) aiškinamas „Kaip tai veikia“ lape, Srauto ir Istorijų info lapuose ir
pranešime po veiksmo. Po plytelėmis lieka viena eilutė „Istorijas gali rasti ir Google“ — tai
privatumo atskleidimas prieš paskelbiant amžiną viešą tekstą, neišimk jos. Laukelis priima 5000
ženklų; viršijus 1000, „Į srautą“ plytelė tampa `aria-disabled` (pritemdyta), o paspaudus pranešimas
nukreipia į istorijas (serveris vis tiek tikrina abi ribas).

`:hover` stilius plytelėms ir chip'ams rašyk tik `@media (hover: hover)` viduje — telefone `:hover`
„prilimpa“ po paspaudimo, ir atžymėta plytelė atrodo vis dar pažymėta.

Šauksmo kambarys pasiekiamas iš SOS ekrano (`.tool-card` po kvėpavimo), ne iš rašymo ekrano — rašymo
ekrane lieka tik emocija, laukelis, trys keliai ir fono garsai.

Apatinis meniu: Rašyti · Srautas · Istorijos · Kalendorius. Nustatymai — ⚙ (`#settings-btn`)
viršuje, šalia temos ir SOS; nustatymų ekrane „Ištrinti mano duomenis“ visada paskutinis.

Emocijų kalba visur ta pati: simbolis + pavadinimas + spalva (`--emo-*`). Emocijos — kosmoso
reiškiniai (pyktis — susiduriančios planetos, liūdesys — krentanti žvaigždė, nerimas — nerimstančios
orbitos, kaltė — užtemimas, vienatvė — viena planeta, viltis — žvaigždė virš horizonto). Vienintelis
simbolių šaltinis kliento pusėje — `public/js/icons.js` (`window.icons.emo()`, ramios ir „gyvos“
SMIL versijos; su `prefers-reduced-motion` — visada ramios); statiniame HTML vietos žymimos
`<span class="emo-icon" data-emo-icon="…">` ir užpildomos `icons.fill()`. `main.ts` `EMOTION_ICONS`
(SSR istorija) — ramių simbolių kopija: keičiant vieną, keisk abu. Spalva — `currentColor` iš
`[data-emo]`/`[data-emotion]` (`--emo-c`), užtemimo/horizonto šešėlis — `.emo-mask` (`--emo-mask`,
fono spalva; ne įrašyta ranka, kitaip šviesioje temoje liktų tamsi dėmė). Emoji sąsajoje nenaudojami
— linijinės ikonos yra inline SVG (`.ico`) arba `icons.line()`.

Ekranų antraštėse ⓘ (`[data-info]`) atidaro info lapą iš apačios (`#info-sheet`,
`[data-info-panel]`); kol jis atviras, fonas `inert`, Escape uždaro. Rašymo ekrano „Kaip tai veikia“
lapas pats atsidaro pirmą kartą (`ns_intro` localStorage), vėliau — tik per ⓘ; trys žingsniai ir
misijos tekstas nuolat yra nustatymų „Apie“ skiltyje.

### i18n susitarimas

`public/js/i18n.js` turi vieną `STRINGS` objektą su `lt`/`en` raktais. Statiniam HTML tekstui
naudojami `data-i18n*` atributai (pritaikomi per `window.i18n.apply()`), dinaminiam tekstui su
kintamaisiais — `window.t(key, {var: value})` su `{var}` placeholder'iais stringe. Pridedant naują
tekstą, visada įrašyk raktą į **abu** kalbos objektus — `window.t()` fallback'ina į `lt`, bet
trūkstamas EN vertimas liktų nepastebėtas.

### Dizainas, tema ir gyvas fonas

Visa paletė — tik `public/css/main.css` viršuje: `:root` (tamsus, numatytas) ir
`:root[data-theme="light"]`. Naujų spalvų kode nerašyk tiesiogiai — pridėk kintamąjį. `data-theme`
**visada** nustato `public/js/theme.js`, įkeliamas sinchroniškai `<head>` (CSP neleidžia inline
skripto, todėl tai atskiras failas) — taip puslapis nemirga. `window.themeToggle()` perjungia ir
įsimena `ns_theme` localStorage. `public/js/river.js` kuria gyvą foną (`.river`, `position: fixed`,
`pointer-events: none`) — animuojami tik `transform`/`opacity`, su `prefers-reduced-motion` dalelių
nekuria. `public/js/ui.js` eksportuoja `window.ui.reveal(el)` ir `window.ui.countUp(el, to, fmt)`.
Dinaminius parametrus dalelėms dėk per `el.style.setProperty()` (CSSOM) — `style=""` atributai
HTML'e blokuojami CSP. Šriftai savi (`public/fonts/`), ne iš Google — dėl anonimiškumo.

Viršutinė juosta (`.topbar`) prisegta (`position: sticky`); paslinkus `app.js` uždeda
`.is-scrolled`, ir ji gauna tą patį stiklo foną kaip apatinis meniu. `html`/`body` turi
`overflow-x: clip`, ne `hidden` — `hidden` paverstų `body` slinkimo konteineriu ir `sticky` nustotų
veikti.

### Atnaujinimai: service worker ir talpinimas

`public/sw.js` niekada neturi užlaikyti senos versijos. HTML, JS ir CSS — **network-first** su
`cache: "no-cache"` (talpykla tik be ryšio), šriftai/garsai/paveikslėliai — cache-first, o `/api/`,
`/istorijos/:id` ir `.xml` į SW talpyklą nepatenka visai (ištrinta istorija turi tapti 404 ir
įrenginyje). Serveris (`main.ts` `REVALIDATE_EXT`) `.html/.js/.css/.webmanifest/.json` siunčia su
`no-cache`, kitiems — `max-age=3600`. Todėl diegimui nereikia kelti `CACHE` versijos — kelk ją tik
pakeitęs `SHELL` sąrašą. Iki v2.10 SW buvo cache-first, ir pamiršus pakelti versiją (v2.8–v2.9)
žmonės matė seną programėlę.

`main.ts` laiko `index.html` atmintyje (`indexHtmlCache`), todėl `deno task dev` stebi ir `public/`
(`--watch=public/`) — pakeitus HTML serveris persikrauna. Deno Deploy kiekvienam diegimui paleidžia
naują procesą, tad produkcijoje to nereikia.

### Saugumo header'iai

`main.ts` taiko tą patį `SECURITY_HEADERS` rinkinį ir statikai, ir API atsakymams (CSP,
`referrer-policy: no-referrer`, ir t.t.). `permissions-policy` sąmoningai leidžia
`microphone=(self)` tik dėl Šauksmo kambario — nepridėk `camera` ar `geolocation` leidimų, jie
eksplicitiškai uždrausti.
