<p align="right"><a href="README.md">English</a> · <strong>Lietuviškai</strong></p>

# 🔥🌊 Nuoga Siela

**Anoniminė erdvė išsilieti: parašyk, ką jauti, tada sudegink arba paleisk upe. Mes nežinome, kas
tu, ir nenorime žinoti.**

🌐 **Gyva svetainė:** [nuogasiela.lt](https://nuogasiela.lt) · 💻 **Kodas:**
[github.com/brutall100/nuoga-siela](https://github.com/brutall100/nuoga-siela)

![Nuoga Siela: srautas šviesiame režime](docs/screenshot.webp)

| Tamsus režimas                                               | Telefonas (390px)                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| ![Rašymo ekranas tamsiame režime](docs/screenshot-dark.webp) | <img src="docs/screenshot-mobile.webp" alt="Srautas telefone" width="260"> |

## Apie projektą

Kartais reikia tiesiog išsakyti, kas slegia, bet niekam nepasakojant. Nuoga Siela yra būtent tam.
Nereikia registruotis, nėra vardų ir nėra komentarų. Kiti gali tik paspausti „Suprantu tave“.

Dizainą įkvėpė Joninių tradicija: naktį žmonės paleidžia upe vainikus ir žiburius, ir kas sunku,
nuplaukia. Ugnis skirta deginimui, vanduo skirtas paleidimui.

## Funkcijos

- ✍️ **Rašyk laisvai.** Pasirink emociją (pyktis, liūdesys, nerimas, kaltė, vienatvė, viltis).
- 🔥 **Sudegink.** Tekstas virsta žarijomis ir išnyksta. Į serverį jis niekada nesiunčiamas.
- 🏮 **Paleisk.** Gali pasirinkti **srautą**, kuris po 24 val. fiziškai ištrinamas, arba
  **istoriją**, kuri lieka, kol pats ištrini.
- 🤍 **„Suprantu tave“.** Palaikymas be komentarų, vienas balsas vienam įrenginiui.
- 🆘 **SOS.** Pagalbos linijos ir kvėpavimo ratas. Jei tekste yra krizės žodžių, pagalba pasiūloma
  švelniai, bet tekstas neblokuojamas.
- 🔊 **Šauksmo kambarys.** Garsas įrašomas tik į telefono atmintį ir niekur nesiunčiamas.
- 🌗 **Šviesus ir tamsus režimas.** Seka sistemos nustatymą, turi perjungimo mygtuką ir nemirga
  kraunantis.
- 🌊 **Gyvas fonas.** Plečiasi vandens ratilai, kyla žibintų švieselės, lėtai plaukia švytėjimai.
  Telefone dalelių perpus mažiau, o su `prefers-reduced-motion` jos išjungiamos.
- 🌍 **LT / EN kalbos**, PWA (galima įdiegti į telefoną), SEO (sitemap, Atom feed, istorijų
  puslapiai).

### Anonimiškumas užtikrintas technologija, ne tik pažadu

- Įrenginio ID sukuriamas naršyklėje (`crypto.randomUUID()`). Serveris jį iš karto paverčia
  `sha256(druska + uuid)`, o originalo niekur nesaugo.
- IP adresai nesaugomi. Serverio žurnale lieka tik `metodas kelias statusas`.
- Srauto įrašai kuriami su `expireIn: 24h`, todėl Deno KV juos fiziškai ištrina pats.
- Šriftai laikomi pačiame projekte, todėl Google nemato lankytojų.

## Sukurta su

| Sritis   | Kas                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Serveris | [Deno](https://deno.com) 2 + Deno KV, nulis priklausomybių                                                                      |
| Klientas | Vanilla HTML / CSS / JS (PWA), jokių bibliotekų ir jokio build žingsnio                                                         |
| Šriftai  | [Lora](https://fonts.google.com/specimen/Lora) antraštėms, [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans) tekstui |
| Testai   | `deno test`, CI per GitHub Actions (fmt + lint + test)                                                                          |

**Spalvų paletė „Paleisk upe“** (visos spalvos yra `public/css/main.css` viršuje, `:root`):

| Vaidmuo           | Tamsus    | Šviesus   |
| ----------------- | --------- | --------- |
| Fonas             | `#08171C` | `#EAF4F2` |
| Paviršius         | `#0F242B` | `#FFFFFF` |
| Tekstas           | `#E4F1EE` | `#10292E` |
| Akcentas (vanduo) | `#4FD1BD` | `#0B7A6A` |
| Antras (žibintas) | `#FFB86B` | `#E08A33` |

Visi kontrastai patikrinti pagal WCAG: paprastas tekstas turi bent 4.5:1, UI elementai bent 3:1.

## Ko išmokau

- Kaip anonimiškumą užtikrinti **architektūra**: hash'ai vietoj ID, TTL vietoj „paslėpta“ žymės,
  jokių IP žurnaluose.
- Kaip Deno KV su atvirkštiniu laiko žymeniu ID pradžioje grąžina naujausius įrašus be jokio
  indekso.
- Kaip SPA su tikrais URL keliais (`history.pushState`) ir serverio atrenderintais puslapiais tampa
  matoma Google.
- Kaip padaryti gyvą foną, kuris neapkrauna procesoriaus: animuojami tik `transform` ir `opacity`,
  dalelės sukuriamos vieną kartą.
- Kaip griežtas CSP (`script-src 'self'`) keičia įpročius: jokių inline skriptų ar stilių, tema
  nustatoma atskiru failu `<head>` dalyje.

## Paleisk savo kompiuteryje

Reikia [Deno 2](https://docs.deno.com/runtime/getting_started/installation/).

```bash
git clone https://github.com/brutall100/nuoga-siela.git
cd nuoga-siela
cp .env.example .env   # nebūtina lokaliai; produkcijoje pakeisk DEVICE_SALT
deno task dev          # http://localhost:8000
```

`.env` faile gali pakeisti `PORT`, `DEVICE_SALT` (produkcijoje būtinai įrašyk ilgą atsitiktinę
eilutę: `openssl rand -hex 32`), `POST_TTL_MS`, `KV_PATH` ir `INDEXNOW_KEY`. Visi paaiškinti
`.env.example` faile.

Kitos komandos:

```bash
deno task test   # serverio testai
deno task lint   # lint (main.ts + server/)
deno fmt         # formatavimas
```

> Projektui reikia serverio (Deno + KV), todėl GitHub Pages jo nepaleistų. Gyva versija veikia
> [Deno Deploy](https://deno.com/deploy) platformoje, adresu [nuogasiela.lt](https://nuogasiela.lt).
> Deploy: dash.deno.com → New Project → šis repo → entrypoint `main.ts` → nustatyk `DEVICE_SALT`.

## Projekto struktūra

```
main.ts              serveris: statika, /api, SSR istorijų puslapiai, sitemap, Atom, CSP
server/api.ts        API (JSON)
server/store.ts      Deno KV: įrašai, istorijos, „suprantu“, rate limit, statistika
server/filter.ts     šlamšto / asmens duomenų filtras ir krizės žodžių atpažinimas
public/index.html    vienas puslapis su visais ekranais
public/css/main.css  dizaino sistema ir paletė (:root)
public/js/theme.js   šviesus / tamsus režimas (be mirgėjimo)
public/js/river.js   gyvas fonas (ratilai, žibintai)
public/js/ui.js      bangelė mygtukuose, atsiradimas slenkant, skaičiavimas
public/js/app.js     maršrutai, rašymas, srautas, istorijos, nustatymai
public/js/burn.js    deginimo animacija (Canvas)
public/js/scream.js  Šauksmo kambarys (garsas tik RAM'e)
public/fonts/        Lora ir Nunito Sans (woff2 + OFL licencijos)
public/images/       og-image.webp
docs/                ekrano nuotraukos README failui
```

### API

| Metodas | Kelias                        | Kas                                                                     |
| ------- | ----------------------------- | ----------------------------------------------------------------------- |
| `POST`  | `/api/posts`                  | `{text, emotion, kind}` + `X-Device`. Grąžina `sos: true` krizės atveju |
| `GET`   | `/api/posts?emotion=`         | srautas, naujausi viršuje                                               |
| `GET`   | `/api/stories?emotion=&sort=` | istorijos (`suprastos` arba `naujausios`)                               |
| `GET`   | `/api/mine`                   | mano tekstai su „suprantu“ skaičiais                                    |
| `GET`   | `/api/stats`                  | `{postsToday, hugsToday}`                                               |
| `POST`  | `/api/posts/:id/hug`          | „Suprantu tave“ (vieną kartą įrenginiui)                                |
| `POST`  | `/api/posts/:id/report`       | pranešti; po 3 pranešimų įrašas paslepiamas automatiškai                |
| `POST`  | `/api/mine/delete`            | ištrinti visus savo įrašus                                              |

## Padėkos

- Šriftai: [Lora](https://github.com/cyrealtype/Lora-Cyrillic) (The Lora Project Authors) ir
  [Nunito Sans](https://github.com/Fonthausen/NunitoSans) (The Nunito Sans Project Authors), abu
  pagal [SIL Open Font License 1.1](https://openfontlicense.org). Licencijų tekstai yra
  `public/fonts/`.
- Pagalbos linijos: [Vilties linija](https://www.viltieslinija.lt) 116 123,
  [Jaunimo linija](https://www.jaunimolinija.lt) 8 800 28888.
- Idėjos: Vent, 7 Cups, Jodel. Psichologinis pagrindas: J. Pennebaker (ekspresyvusis rašymas).

## Licencija

[MIT](LICENSE) © 2026 brutall100
