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

- [x] PNG ikonos 512 px (`public/icons/icon-512.png`, `icon-maskable-512.png`)
- [x] Privatumo politikos puslapis viešu URL — `https://nuogasiela.lt/privatumas` (LT),
      `https://nuogasiela.lt/privacy` (EN)
- [x] Naudojimo taisyklės (`/taisykles`, `/terms`), sutikimas prieš pirmą paskelbimą, pranešimas
      apie tekstą, moderacija (`/admin`, `ADMIN_TOKEN`) — Play UGC politika
- [ ] `ADMIN_TOKEN` nustatyti Deno Deploy ir reguliariai peržiūrėti `/admin`
- [ ] Data safety forma — **ne** „no data collected“: įrenginio hash'as pagal BDAR yra pseudoniminis
      ID. Žymėti: _App activity → Other user-generated content_ (tekstai) ir _Device or other IDs_ —
      renkama, nesidalinama, ne pardavimui, šifruojama perduodant, galima ištrinti (nustatymuose).
      _Audio_ — nerenkama (garsas nepalieka įrenginio). Pranešimų prenumerata — su ID nesusieta.
- [ ] Health apps deklaracija Play Console (emocinė savijauta, ne medicininė programa) — sakinys „ne
      psichologinė ar medicininė pagalba“ jau SOS ekrane ir taisyklėse
- [x] Self-harm: SOS ekranas su linijomis ir 112, krizės tekstai suskleisti su pagalbos nuoroda
- [ ] TWA: Bubblewrap `enableNotifications: true` (kitaip Web Push programėlėje neveiks), vienspalvė
      pranešimų ikona
