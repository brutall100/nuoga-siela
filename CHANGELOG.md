# Changelog

Visi pastebimi projekto pakeitimai bus fiksuojami šiame faile.

Formatas paremtas [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
