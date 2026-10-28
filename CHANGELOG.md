# Changelog

Visi pastebimi projekto pakeitimai bus fiksuojami šiame faile.

Formatas paremtas [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [v2.12] — 2026-10-28

- CLAUDE.md: nauja taisyklė „Darbo eiga: visada į `main`“ — patikrinti pakeitimai jungiami į `main`
  iškart po žalio CI, be papildomo klausimo.

## [v2.11] — 2026-10-28

- **Viršutinė juosta nebepasislepia:** logotipas, ⚙, tema ir SOS lieka prisegti viršuje slenkant.
  Kol puslapis nepaslinktas, juosta permatoma kaip anksčiau; paslinkus gauna tą patį stiklo foną ir
  apatinę liniją kaip apatinis meniu (švelnus perėjimas).
- `html`/`body`: `overflow-x: hidden` → `clip` (su `hidden` atsarginiu), kitaip `position: sticky`
  neveikia; `scroll-padding-top`, kad fokusuojami elementai nelįstų po juosta; viršuje paisoma
  `safe-area-inset-top` (iPhone su „iškirpte“).

## [v2.10] — 2026-10-27

- **Pataisyta: programėlė neatsinaujindavo po diegimo.** Service worker'is (`public/sw.js`) viską
  imdavo iš savo talpyklos (cache-first) ir atnaujindavo tik pakeitus `CACHE` versiją — v2.8 ir v2.9
  ji liko `v8`, todėl telefonuose ir naršyklėse liko v2.7. Dabar HTML, JS ir CSS imami pirma iš
  tinklo (`cache: "no-cache"`, apeinant ir naršyklės HTTP talpyklą), talpykla naudojama tik be
  ryšio; šriftai, garsai ir paveikslėliai — kaip anksčiau, iš talpyklos. `CACHE` → `v9`. Istorijų
  puslapiai (`/istorijos/:id`), `/api/` ir XML į SW talpyklą nebepatenka.
- Serveris (`main.ts`) `.html/.js/.css/.webmanifest/.json` failus siunčia su `no-cache` (buvo
  `max-age=3600`), kad naujas diegimas nevėluotų iki valandos.
- `deno task dev` stebi ir `public/` (`--watch=public/`): `index.html` laikomas serverio atmintyje,
  todėl be perkrovimo HTML pakeitimai nesimatė.
- Perėjimas: kas turi seną (v8) SW, naują versiją pamatys **antrą kartą** atidaręs svetainę; nuo v9
  kiekvienas diegimas matosi iš karto.

## [v2.9] — 2026-10-27

- **„Viltis“ visada pažymėta iš anksto:** atidarius rašymo ekraną ir po kiekvieno paleidimo ar
  sudeginimo pažymėta 🌱 „Viltis“; galima pasirinkti kitą emociją, bet viena visada lieka pažymėta
  (paspaudus pažymėtą dar kartą ji nebenuimama). Jei emocijos nepakeiti, į kalendorių ir bendrą
  savaitės nuotaiką keliauja „Viltis“.
- Pranešimas „Pasirink, kaip jautiesi“ (`toast.pickEmotion`) pašalintas — emocija visada yra.

## [v2.8] — 2026-10-27

Rašymo ekrano išdėstymas pagal atsiliepimą į v2.7.

- **Emocijos — plytelės 3×2:** didelis emoji, po juo pavadinimas; pažymėta plytelė nusidažo emocijos
  spalva. Emoji visada pilnos spalvos: v2.7 nepažymėtus pilkino, todėl veidukai atrodė blankūs, o
  žalias 🌱 „Viltis“ — tarsi pažymėtas nuo pradžių.
- **Klaida:** telefone paspaudus ir atžymėjus emociją ji likdavo paryškinta (prilipęs `:hover`).
  Užvedimo stiliai emocijoms, veiksmų plytelėms ir chip'ams dabar tik `@media (hover: hover)`.
- **Veiksmai — trys mažos plytelės vienoje eilėje:** 🔥 Sudeginti · 🏮 Į srautą · 📖 Į istorijas, be
  aprašų. Skirtumą paaiškina „Kaip tai veikia“ (3 žingsnio tekstas papildytas), Srauto/Istorijų
  įžangos ir pranešimas po veiksmo; po plytelėmis lieka trumpa eilutė apie anonimiškumą ir Google.
- **Šauksmo kambarys** perkeltas iš rašymo ekrano į SOS ekraną (kortelė po kvėpavimu).
- README nuotrauka (`docs/screenshot-dark.webp`) pergeneruota; CLAUDE.md atnaujintas.

## [v2.7] — 2026-10-27

Nuoseklumas: visa programa dabar seka vieną kelią — **emocija → žodžiai → ką su jais daryti**, o
emocija visada nukeliauja į kalendorių.

- **Rašymo ekranas pertvarkytas:** nauja antraštė „Kas guli ant širdies?“ (EN „What's on your
  heart?“); kortelėje pirma „Kaip jautiesi?“ (emocijos dabar su emoji, kaip kalendoriuje), tada
  laukelis, tada „Ką darysi su tuo?“ — trys aiškios kortelės su paaiškinimu: 🔥 Sudeginti (niekas
  nepamatys), 🏮 Paleisti (į Srautą, po 24 val. išnyks), 📖 Palikti istoriją (lieka, kol ištrinsi).
  Jungikliai „24 val. / istorija“ ir du mygtukai pašalinti. Laukelis priima iki 5000 ženklų;
  viršijus 1000, „Paleisti“ pasiūlo palikti istoriją.
- **„Kaip tai veikia“:** trijų žingsnių kortelė rašymo ekrane, kol ją uždarai (`ns_intro`
  localStorage). Nustatymuose — nauja skiltis „Apie Nuogą Sielą“ su misija ir tais pačiais
  žingsniais.
- **Meniu:** apačioje Rašyti · Srautas · Istorijos · **Kalendorius**; nustatymai perkelti į ⚙
  mygtuką viršuje. Tab'ų ikonos — vieno stiliaus SVG vietoj skirtingai atrodančių simbolių.
- **Nustatymai:** sugrupuoti į skydelius; „Ištrinti mano duomenis“ nukeltas į patį apačią (atskira
  „Tavo duomenys“ zona).
- **Srautas ir Istorijos:** abu ekranai viršuje paaiškina, kiek gyvena tekstai; filtruose ir
  kortelėse rodoma emocija su emoji. SSR istorijos puslapyje — irgi emoji.
- **Animacijos** (tik `transform`/`opacity`, gerbia `prefers-reduced-motion`): pasirinkta emocija
  „atgyja“ (iššoka ir sujuda savaip); sudeginus ar paleidus emoji nuskrenda lanku į Kalendoriaus
  tab'ą, o šis pašoka; meniu švytinti juostelė nuslenka prie aktyvaus tab'o; trūkstant teksto ar
  emocijos, tas elementas švelniai sujuda; bangelė (ripple) ir kelių kortelėse.
- „Sudeginti“ pranešimas dabar „Sudegė. Niekas to nematė.“; privatumo politikoje (LT/EN) atnaujinti
  mygtukų pavadinimai. Nenaudojami i18n raktai (`life.*`, `btn.burn`, `btn.release`,
  `write.storyPlaceholder`, `mood.link`, `tab.settings`, `aria.emotions`) pašalinti.
- `ROUTE_META` `/nustatymai` aprašas atnaujintas; service worker cache → `v8`; README (LT/EN) ir
  CLAUDE.md papildyti skyriumi apie produkto kelią; README ekrano nuotraukos (`docs/*.webp`)
  pergeneruotos su nauju dizainu.

## [v2.6] — 2026-10-27

- **Raminančių garsų failai** (`public/sounds/`): garso mygtukai rašymo ir SOS ekranuose dabar groja
  (iki šiol rodė „Nepavyko įjungti garso“). Visi trys garsai paimti iš
  [Freesound](https://freesound.org) ir išleisti pagal licenciją
  **[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)** (viešoji nuosavybė: nurodyti
  autoriaus nebūtina, bet nurodome):
  - `upe.mp3`: [„Murmuring Stream“](https://freesound.org/people/borralbi/sounds/337614/), autorius
    borralbi (#337614).
  - `lietus.mp3`: [„Rain light 2 (rural)“](https://freesound.org/people/jmbphilmes/sounds/200273/),
    autorius jmbphilmes (#200273).
  - `lauzas.mp3`:
    [„campfire in a forest at night“](https://freesound.org/people/Duophonic/sounds/248303/),
    autorius Duophonic (#248303): laužas miške naktį, girdėti svirpliai ir vėjas.
- Apdorojimas: šaltinis yra Freesound HQ peržiūros MP3, apdorota su ffmpeg. Iš kiekvieno įrašo
  paimta 94 s ištrauka (upės 2–96 s, lietaus 1–94,7 s, laužo 10–104 s) ir paversta lygiai 90 s
  kilpa: paskutinės 4 s (lietaus 3,7 s) sulietos su pradžia (equal-power crossfade), todėl sandūra
  negirdima. Garsumas suvienodintas iki −20 LUFS, viršūnės ≤ −1 dBTP; limiteris suveikia tik retoms
  viršūnėms. Lietus įrašytas mono: dešinysis kanalas yra ta pati kilpa, pastumta 45 s, todėl
  ausinėse lietus skamba erdviai, o telefono garsiakalbyje nesikeičia.
- Formatas: MP3 128 kbps CBR, stereo, 44,1 kHz, po ~1,4 MB. LAME antraštėje įrašyti encoder
  delay/padding duomenys, todėl `decodeAudioData` grąžina lygiai 90,000 s be tylos galuose ir Web
  Audio kilpa skamba be tarpo (patikrinta Chromium).

## [v2.5] — 2026-10-27

Premium nebus: Buy Me a Coffee lieka kaip vienintelis, savanoriškas padėkos būdas, o naujos
funkcijos nemokamos visiems.

- **Emocijų kalendorius** (`/kalendorius`, `public/js/mood.js`): „Tavo savaitė“ su judančiu
  dažniausios emocijos emoji (kiekviena emocija juda savaip, tik `transform`/`opacity`), juostelėmis
  ir mėnesio tinkleliu (12 mėn. atgal). Saugoma tik `localStorage` (`ns_mood`): diena ir emocija,
  niekada tekstas; įrašoma paleidus ir sudeginus tekstą su emocija. Jei per savaitę pažymėtos ≥ 4
  dienos ir nė karto „Viltis“, švelniai parodoma nuoroda į SOS.
- **Kaip jaučiasi visi**: `GET /api/mood` — kiek kartų per 7 dienas pažymėta kiekviena emocija
  (`["stats", diena, "emo", emocija]`, tik suminiai skaičiai, `expireIn` 8 d.). Rodoma, kai
  savaitėje ≥ 5 tekstai.
- **Raminantys garsai** (`public/js/sounds.js`): upė, lietus, laužas rašymo ir SOS ekranuose; Web
  Audio kilpa su švelniu įsijungimu. Garso failai (`public/sounds/{upe,lietus,lauzas}.mp3`) dar
  nepridėti — be jų mygtukas parodo „Nepavyko įjungti garso“. `main.ts` MIME lentelė papildyta
  `.mp3`.
- „Ištrinti mano duomenis“ išvalo ir emocijų kalendorių; privatumo politika (LT/EN) papildyta
  skyriumi apie kalendorių ir bendrą statistiką.
- `ROUTE_META` ir `sitemap.xml` papildyti `/kalendorius`; service worker cache → `v7`.

## [v2.4] — 2026-10-27

- Claude Code debesies aplinka: SessionStart hook'as (`.claude/settings.json`,
  `.claude/hooks/session-start.sh`) debesies sesijoje įdiegia Deno 2.x per npm (`deno@2`), jei jo
  nėra — „Trusted“ tinkle `dl.deno.land` užblokuotas. Įprastai Deno jau įdiegia (ir kešuoja)
  aplinkos setup script'as, hook'as — atsarginis kelias. Lokaliai nieko nedaro.
- CLAUDE.md: naujas skyrius „Debesies aplinka“ — kodėl Deno diegiamas per npm ir kaip veikia abu
  sluoksniai.

## [v2.3] — 2026-10-27

- `public/.well-known/assetlinks.json` — Digital Asset Links Google Play programėlei
  `lt.nuogasiela.app` (Google Play pasirašymo + įkėlimo rakto SHA-256). Be jo TWA rodytų naršyklės
  adreso juostą.

## [v2.2] — 2026-10-27

- PNG piktogramos (`public/icons/icon-512.png`, `icon-maskable-512.png`, 512×512, sugeneruotos iš
  v2.0 SVG) pridėtos į `manifest.webmanifest` — Bubblewrap/TWA (Google Play programėlei) SVG
  piktogramų nepriima.

## [v2.1] — 2026-09-24

- Licencija pakeista iš MIT į **AGPL-3.0** (`LICENSE`): pakeistą versiją paleidęs kaip svetainę
  privalo atverti savo kodą naudotojams. Ankstesni commit'ai lieka su MIT.
- README.md / README.lt.md: License skyrius atnaujintas, pridėta pastaba, kad pavadinimas „Nuoga
  Siela“ ir logotipas licencijai nepriklauso.

## [v2.0] — 2026-09-24

Naujas dizainas „Paleisk upe“ ir repozitorijos sutvarkymas portfolio.

- **Dizainas:** nauja paletė (naktinė upė + žibinto gintaras), visos spalvos `:root` CSS
  kintamuosiuose `public/css/main.css` viršuje; WCAG kontrastas patikrintas (tekstas ≥ 4.5:1, UI ≥
  3:1). Antraštės — Lora, tekstas — Nunito Sans, abu **savi** (`public/fonts/`, su OFL
  licencijomis), kad Google nematytų lankytojų IP.
- **Šviesus / tamsus režimas:** `public/js/theme.js` įkeliamas sinchroniškai `<head>`, įsimena
  pasirinkimą (`ns_theme`), seka `prefers-color-scheme`, nemirga. Perjungimo mygtukas viršuje.
- **Gyvas fonas:** `public/js/river.js` — du neryškūs švytėjimai, vandens ratilai ir kylantys
  žibintų žiburėliai su atsitiktiniais parametrais; tik `transform`/`opacity`, telefone perpus
  mažiau dalelių, `prefers-reduced-motion` — dalelių nėra.
- **Mikro-sąveikos:** `public/js/ui.js` — bangelė (ripple) mygtukuose, kortelių atsiradimas
  slenkant, „Suprantu tave“ ir dienos statistikos skaičiai suskaičiuoja. „Paleisti“ mygtuko žiburys
  nuplaukia.
- **Prieinamumas:** „Pereiti prie turinio“ nuoroda, matomas `:focus-visible`, `<label>` rašymo
  laukeliui, išversti `aria-label`/`title` (nauji i18n raktai abiem kalbom).
- Deginimo animacija (`burn.js`) spalvą ima iš paletės (`--burn-rgb`).
- Nauji `icon.svg`/`icon-maskable.svg` (liepsna virš bangų), `og-image` pergeneruotas kaip WebP
  (`public/images/og-image.webp`, 114 KB PNG → 20 KB). `main.ts` MIME lentelė papildyta `.webp`.
- Istorijos SSR puslapis ir privatumo puslapiai naudoja tą patį dizainą (tema + fonas + logotipas).
- Service worker cache → `v6` (nauji failai ir šriftai).
- **Repo:** MIT `LICENSE`, README.md (EN) + README.lt.md (LT) su ekrano nuotraukomis `docs/`, senas
  planas perkeltas į `docs/roadmap.lt.md`, išplėstas `.gitignore`, iš `.vscode/settings.json`
  pašalintas asmeninis kompiuterio kelias.

## [Unreleased]

- CLAUDE.md, CHANGELOG.md, GitHub Actions CI (fmt/lint/test), `.env.example`, `.gitattributes` (LF
  eilučių galūnės).
- Nuo šiol kiekvienas commit'as gauna versijos prefiksą (žr. `CLAUDE.md` → „Versijos ir changelog").
- Privatumo politikos puslapiai (`/privatumas.html` LT, `/privacy.html` EN) — reikalinga Google Play
  pateikimui. Nuoroda pridėta ir Nustatymų ekrane.
- SEO pagrindas: `robots.txt`, Open Graph/Twitter Card meta žymos ir WebSite JSON-LD schema pridėti
  į `index.html`, `privacy.html`, `privatumas.html`. `main.ts` MIME lentelė papildyta `.txt`/`.xml`
  tipais, kad šie failai būtų atiduodami su teisingu `content-type`.
- Maršrutizacija pereita nuo hash (`#/rasyti`) prie tikrų URL kelių (`/rasyti`) per
  `history.pushState`/`popstate` (`public/js/app.js`) — Google dabar gali indeksuoti kiekvieną
  ekraną atskirai. `main.ts` kiekvienam iš šešių kelių prieš atiduodant `index.html` pakeičia
  `<title>`/meta aprašymą (`applyRouteMeta()`, be templating variklio).
- Viešos istorijos gauna savo serveryje atrenderintą, indeksuojamą puslapį — `/istorijos/:id`
  (`main.ts` `serveStoryPage()`, `server/store.ts` `getPublicStory()`). Ištrinta ar paslėpta
  istorija iškart grąžina `404`. Kortelėse pridėtas 🔗 mygtukas nuorodai kopijuoti. `sitemap.xml`
  dabar generuojamas dinamiškai (`serveSitemap()`) su visomis gyvomis istorijomis — statinis
  `public/sitemap.xml` failas pašalintas.
- `og:image`/`twitter:image` (1200×630, `public/icons/og-image.png`) visiems puslapiams, įskaitant
  istorijų permalink'us.
- Pataisyta: `privacy.html`/`privatumas.html` turėjo inline `<style>` bloką ir inline `style=""`
  atributus, kuriuos CSP `style-src 'self'` tyliai blokuodavo — puslapiai realiai rodydavosi
  visiškai be stilių. Visos taisyklės perkeltos į `public/css/main.css` (`.legal`, `.legal-brand`,
  `.lang-switch`).
- SEO smulkmenos: kiekvienas istorijos permalink'as (`/istorijos/:id`) dabar turi savo
  `CreativeWork` JSON-LD (`jsonLdScript()` `main.ts` — `</script>` sekos tekste escaping'inamos į
  `<\/script>`, kad nenulaužtų HTML). Pagrindinio puslapio `WebSite` JSON-LD `inLanguage` pataisytas
  iš `["lt","en"]` į `"lt"` — EN yra tik kliento pusės perjungimas, ne atskiras URL/locale, tad
  dviejų kalbų žymėjimas būtų klaidinantis. `privacy.html`/`privatumas.html` (vienintelė reali
  dviejų URL vertimo pora) gavo `hreflang` alternate nuorodas.
- Rašymo ekrane, pasirinkus „📖 Palikti kaip istoriją", rodomas trumpas paaiškinimas, kad tekstas
  liks viešas neribotai ir bus randamas per Google paiešką — anksčiau šio atskleidimo nebuvo, nors
  istorijos jau seniai buvo viešos ir naršomos `/istorijos` ekrane.
- `listStories()` (`server/store.ts`) gavo trečią, pasirenkamą `limit` parametrą — anksčiau
  `/api/stories` UI riba (`STORY_FEED_LIMIT = 50`) buvo bendra su `sitemap.xml`, tad istorijos virš
  50-osios (pagal hugs) tapdavo nei UI, nei paieškos sistemoms nematomos. `serveSitemap()` ir naujas
  `GET /istorijos/feed.xml` (Atom, naujausios 30 istorijų) dabar naudoja savo, gerokai didesnę ribą
  (`SITEMAP_STORY_LIMIT = 5000`).
- `sitemap.xml` papildytas `<lastmod>`/`<changefreq>`/`<priority>` kiekvienam URL, ir
  `<xhtml:link rel="alternate" hreflang="...">` įrašais `privacy.html`/`privatumas.html` porai.
- IndexNow (Bing/Yandex) integracija: kiekviena nauja istorija iš karto pastumiama į
  `api.indexnow.org`, kai `INDEXNOW_KEY` aplinkos kintamasis nustatytas (`server/api.ts`
  `pingIndexNow()`, `fire-and-forget`, niekada nesutrikdo posto kūrimo atsakymo). `main.ts` atiduoda
  `/{raktas}.txt` patvirtinimo failą, kai raktas sukonfigūruotas. Numatyta (lokaliame dev'e) —
  raktas nenustatytas, ping'ai tyliai nevyksta. Dokumentuota `.env.example`.
- Pataisyta: `public/sw.js` `CACHE` versija nebuvo pakelta nuo v1.6 iki v1.9, nors visos tos
  versijos keitė service worker'io `SHELL` sąrašo failus (`app.js`, `index.html`, `main.css`,
  `i18n.js`) — grįžtantys naudotojai su jau įdiegtu PWA cache'u būtų toliau matę seną, hash
  maršrutizacijos versiją. `CACHE` pakelta į `nuoga-siela-v5`, kad `activate` handler'is išvalytų
  senus cache'us.

## [1.5] — Šauksmo kambarys + LT/EN kalbos

- Šauksmo kambarys: garso įrašas gyvena tik naršyklės atmintyje, niekada nesiunčiamas į serverį ir
  nerašomas į diską.
- Kalbos: LT (numatyta) ir EN, perjungiama nustatymuose.
- VSCode Deno konfigūracija (`deno.enable`, `deno.path`).

## [1.2] — „Švelnus srautas"

- Keiksmažodžių maskavimas rodant (`b***`) — tik vaizdavimo sluoksnyje, rašymo neriboja.

## [1.1] — Istorijos ir sugrįžimo psichologija

- Istorijos: ilgi tekstai (iki 5000 ženklų) be galiojimo termino, rūšiuojami pagal „Suprantu tave".
- Sugrįžimo banneris („Tavo tekstus suprato X žmonių").
- „Palaikyk projektą" užuomazga nustatymuose.

## [1.0] — MVP

- Deno serveris (`Deno.serve` + Deno KV) ir vanilla PWA klientas, jokių priklausomybių.
- Anoniminis srautas: tekstas gyvena 24 val., fiziškai ištrinamas per KV TTL.
- Emocijų žymos, „Suprantu tave", pranešimų auto-slėpimas po 3 pranešimų.
- Spam/PII filtras ir krizės žodžių detekcija su SOS pagalbos linijomis.
- Deginimo ritualas (tekstas išnyksta be siuntimo į serverį).
