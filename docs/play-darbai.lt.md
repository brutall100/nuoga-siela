# Kai būsi prie kompiuterio — Google Play paruošimas

> Sąrašas sudarytas 2026-11-11 po v3.10–v3.15. Pažymėk `[x]`, kai padarysi. Jokių slaptų raktų šiame
> faile nerašyk — jie gyvena tik Bitwarden ir Deno Deploy.

## Jau padaryta

- [x] `ADMIN_TOKEN` įvestas Deno Deploy, prisijungimas prie `nuogasiela.lt/admin` veikia.
- [x] Naudojimo taisyklės (`/taisykles`, `/terms`), sutikimas prieš pirmą paskelbimą, pranešimas
      apie tekstą, moderacija, krizės tekstai suskleisti, SOS su 112, privatumo politika su BDAR.

## 1. Kodas

- [ ] `git pull` (`main` šakoje).
- [ ] `deno task test` — turi būti žalia (37+ testai).

## 2. Deno Deploy

- [ ] _Settings → Environment Variables_ — patikrink, ar yra `DEVICE_SALT`.
  - Jei **yra** — nieko nekeisk (pakeitus žmonės prarastų ryšį su savo tekstais).
  - Jei **nėra** — sugeneruok (`openssl rand -hex 32`), įvesk, išsaugok Bitwarden.
- [ ] Ten pat turi būti `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ADMIN_TOKEN`.

## 3. Android projektas (Bubblewrap / TWA)

- [ ] `twa-manifest.json` → `"enableNotifications": true` (be šito Web Push programėlėje neveiks).
- [ ] Pakelk `appVersionCode` (+1) ir `appVersionName`.
- [ ] `bubblewrap update`, tada `bubblewrap build` → naujas `.aab`.
- [ ] Patikrink, ar pasirašymo rakto SHA-256 yra `public/.well-known/assetlinks.json` (dabar ten du
      piršto atspaudai). Jei programėlėje matosi naršyklės adreso juosta — atspaudas nesutampa.
- [ ] (Nebūtina) Vienspalvė pranešimų ikona — kitaip būsenos juostoje rodomas bendras ženkliukas.

## 4. Google Play Console

- [ ] **Data safety** — **ne** „no data collected“:
  - _App activity → Other user-generated content_ (tekstai): renkama, nesidalinama, ne pardavimui,
    šifruojama perduodant (HTTPS), naudotojas gali ištrinti.
  - _Device or other IDs_ (įrenginio hash'as): tas pats.
  - _Audio_: **nerenkama** (Šauksmo kambario garsas nepalieka įrenginio).
  - _Location, Contacts, Personal info_: nerenkama.
- [ ] **Health apps** deklaracija — emocinė savijauta, ne medicininė programa, ne gydymas.
- [ ] **Target audience** — 16+ (tas pats, kas privatumo politikoje ir taisyklėse).
- [ ] **Content rating** anketa — naudotojų turinys: taip; naudotojai bendrauja tarpusavyje: ne
      (komentarų ir žinučių nėra, tik „Suprantu tave“).
- [ ] **Ads** — ne. **App access** — be prisijungimo.
- [ ] **Privacy policy URL** — `https://nuogasiela.lt/privatumas`.
- [ ] Jei Play klausia apie naudotojų turinį (UGC): taisyklės — `https://nuogasiela.lt/taisykles`,
      pranešimas — vėliavėlės mygtukas prie kiekvieno teksto, moderacija — rankinė peržiūra.
- [ ] Naujai asmeninei kūrėjo paskyrai Play gali reikalauti **uždaro testavimo** (pvz. 12 testuotojų
      14 dienų) prieš viešą leidimą — patikrink, ką rodo Console.
- [ ] Įkelk `.aab` į testavimo kanalą.

## 5. Nuolat

- [ ] Kartą per dieną ar kelias — `nuogasiela.lt/admin`: taisyklių nepažeidžiančius grąžink,
      pažeidžiančius ištrink.
