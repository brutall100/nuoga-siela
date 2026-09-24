# Planas ir idėjos

> Perkelta iš seno README.md (v1.10), kad pagrindinis README būtų trumpesnis.

## Idėjos iš užsienio app'ų (kas įtraukta / kas laukia)

**v1 (įtraukta):**

- _Vent_ — emocijos žyma prie posto + srauto filtras „randu tokius kaip aš"
- _HearMe / 7 Cups_ — palaikymas be komentarų: „Suprantu tave" skaitiklis
- _Jodel_ — bendruomeninė moderacija: auto-slėpimas po pranešimų
- Deginimo ritualas — katarsis be jokio serverio
- **Istorijos** — ilgi tekstai, kurie lieka; rūšiavimas pagal „Suprantu tave"
- **Šauksmo kambarys** — garso įrašymas TIK į RAM: įrašai, perklausai, ištrini; niekada nesiunčiama
  į serverį, niekada nerašoma į diską (palikus ekraną — MediaRecorder stabdomas, blob'as ir object
  URL panaikinami, mikrofonas atlaisvinamas)
- **Kalbos** — LT (default) ir EN, perjungiama nustatymuose

**Psichologija (kur įausta, be dark patterns):**

- _Pennebaker (ekspresyvusis rašymas)_ — hint'as rašymo ekrane: mokslas duoda „leidimą" rašyti
- _Yalom universalumas_ („ne aš vienas") — Istorijų ekranas + emocijų filtrai
- _Pripažinimas_ — „Tavo tekstus suprato X žmonių" banneris = grįžimo priežastis be push'ų
- _Socialinis įrodymas_ — „šiandien paleisti X tekstų" (rodoma tik kai ≥5, kad tuštuma nesimatytų)
- Jokių streak'ų, badge'ų ar FOMO — tai kirstųsi su saugios erdvės jausmu

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
- [x] Privatumo politikos puslapis viešu URL — `https://nuogasiela.lt/privatumas.html` (LT),
      `https://nuogasiela.lt/privacy.html` (EN)
- [ ] Data safety forma: „no data collected linked to user" (turim tik anoniminius hash'us);
      mikrofonas naudojamas Šauksmo kambaryje, bet garsas niekada nepalieka įrenginio — žymėti „not
      collected"
- [ ] Self-harm policy: SOS ekranas su linijomis jau yra — Play to reikalauja tokio tipo app'ams
