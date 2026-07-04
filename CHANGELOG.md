# Changelog

Visi pastebimi projekto pakeitimai bus fiksuojami šiame faile.

Formatas paremtas [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

- CLAUDE.md, CHANGELOG.md, GitHub Actions CI (fmt/lint/test), `.env.example`, `.gitattributes` (LF
  eilučių galūnės).
- Nuo šiol kiekvienas commit'as gauna versijos prefiksą (žr. `CLAUDE.md` → „Versijos ir changelog").

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
