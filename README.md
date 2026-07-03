# Nuoga Siela

> Anoniminė erdvė išsilieti. **Mes nežinome, kas tu. Ir nenorime žinoti.**

Rašai, ką jauti. Tada arba **sudegini** (tekstas su žarijų animacija išnyksta — niekur
nesiunčiamas), arba **paleidi anonimiškai** į bendrą srautą, kur kiti gali paspausti „Suprantu
tave". Po 24 valandų kiekvienas tekstas **fiziškai ištrinamas**.

Domenas: **nuogasiela.lt** · Stack'as: **Deno + Deno KV + vanilla PWA, nulis priklausomybių**

---

## Paleidimas

```bash
deno task dev    # http://localhost:8000 (su --watch)
deno task test   # serverio testai
```

Aplinkos kintamieji (visi nebūtini lokaliai):

| Kintamasis    | Kam                                                         | Default      |
| ------------- | ----------------------------------------------------------- | ------------ |
| `PORT`        | serverio portas                                             | `8000`       |
| `DEVICE_SALT` | druska įrenginio hash'ui — **produkcijoje BŪTINA pakeisti** | dev reikšmė  |
| `POST_TTL_MS` | posto gyvavimo laikas (testavimui)                          | 24 val.      |
| `KV_PATH`     | Deno KV failo kelias (lokaliai)                             | Deno default |

## Deploy į Deno Deploy

1. [dash.deno.com](https://dash.deno.com) → New Project → prijunk šį GitHub repo.
2. Entrypoint: `main.ts`. Deno KV įsijungia automatiškai — jokios DB konfigūracijos.
3. Nustatyk `DEVICE_SALT` env kintamąjį (ilgas atsitiktinis stringas).
4. Settings → Domains → prijunk `nuogasiela.lt` (A/CNAME įrašai pagal instrukciją).

## Architektūra

```
main.ts            Deno.serve: statika iš /public + /api routeris + CSP header'iai
server/api.ts      API handleriai (JSON in/out)
server/store.ts    Deno KV: postai, „suprantu", pranešimai, rate limit
server/filter.ts   spam/PII filtras + krizės žodžių detekcija (LT)
public/            vanilla HTML/CSS/JS PWA — jokių bibliotekų
```

### API

| Metodas | Kelias                  | Kas                                                                                   |
| ------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `POST`  | `/api/posts`            | `{text, emotion}` + `X-Device` header. Grąžina `sos: true`, jei tekste krizės žodžiai |
| `GET`   | `/api/posts?emotion=`   | srautas, naujausi viršuje (paslėpti ≥3 pranešimų negrąžinami)                         |
| `POST`  | `/api/posts/:id/hug`    | „Suprantu tave" (1×/įrenginiui)                                                       |
| `POST`  | `/api/posts/:id/report` | pranešti; po 3 — auto-slėpimas                                                        |
| `POST`  | `/api/mine/delete`      | ištrinti visus savo postus                                                            |

### Anonimiškumo garantijos (technologijos, ne pažadų lygiu)

- Jokios registracijos. Įrenginio UUID gimsta naršyklėje (`crypto.randomUUID()`), serveris jį iškart
  paverčia `sha256(salt + uuid)` ir originalo niekur nesaugo.
- Prie postų nėra IP adresų. Loguose — tik `metodas kelias statusas`.
- Kiekvienas KV įrašas kuriamas su `expireIn: 24h` — Deno KV pats **fiziškai ištrina** duomenis. Ne
  cron'as, ne „hidden" flag'as — trynimas įrašo sukūrimo momentu užprogramuotas.
- „Ištrinti mano duomenis" nustatymuose trina viską iškart.

### Apsauga nuo šiukšlių (be moderatorių)

- Žodžių filtras: nuorodos, el. paštai, telefonai (išskyrus pagalbos linijas), spam žodynas.
  Keiksmai **leidžiami** — tai išsiliejimo erdvė.
- Rate limit: 5 paleidimai/val. įrenginiui.
- „Pranešti" → po 3 pranešimų iš skirtingų įrenginių postas dingsta automatiškai.
- Krizės žodžiai (savižudybė ir pan.) → klientui grąžinama `sos: true`, parodomos pagalbos linijos:
  **Vilties linija 116 123**, **Jaunimo linija 8 800 28888**.

## Idėjos iš užsienio app'ų (kas įtraukta / kas laukia)

**v1 (įtraukta):**

- _Vent_ — emocijos žyma prie posto + srauto filtras „randu tokius kaip aš"
- _HearMe / 7 Cups_ — palaikymas be komentarų: „Suprantu tave" skaitiklis
- _Jodel_ — bendruomeninė moderacija: auto-slėpimas po pranešimų
- Deginimo ritualas — katarsis be jokio serverio

**v1.5:**

- Šauksmo kambarys: garso įrašymas į RAM → atgrojimas → trynimas (niekas nesaugoma)
- „Istorijos, kurios padėjo" — daugiausia „Suprantu" gavę tekstai (autorių sutikimu prieš
  išnykstant)
- Kvėpavimo pratimų biblioteka, EN kalba

**Vėliau:**

- Emocijų kalendorius su statistika (freemium ~2–3 €/mėn.)
- Raminantys foniniai garsai, temos
- „Palaikyk projektą" vienkartinis pirkinys
- B2B: grupės erdvės mokykloms/darbovietėms
- **Jokių reklamų. Niekada.** Bazinis išsiliejimas — visada nemokamas.

## Kelias į Google Play

PWA (manifest + service worker jau yra) →
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) → TWA → Play Console. Prieš pateikimą:

- [ ] PNG ikonos 192/512 px (Play nepriima SVG) — sugeneruoti iš `public/icons/icon.svg`
- [ ] Privatumo politikos puslapis viešu URL
- [ ] Data safety forma: „no data collected linked to user" (turim tik anoniminius hash'us)
- [ ] Self-harm policy: SOS ekranas su linijomis jau yra — Play to reikalauja tokio tipo app'ams
