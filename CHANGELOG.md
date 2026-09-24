# Changelog

Visi pastebimi projekto pakeitimai bus fiksuojami šiame faile.

Formatas paremtas [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
