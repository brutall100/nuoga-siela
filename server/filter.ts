// Teksto filtras. Principas: keiksmai leidžiami (tai išsiliejimo erdvė),
// blokuojamas tik akivaizdus spamas ir asmens duomenis primenantys šablonai.

export const MAX_TEXT_LENGTH = 1000;

export const EMOTIONS = ["pyktis", "liudesys", "nerimas", "kalte", "vienatve", "viltis"] as const;
export type Emotion = (typeof EMOTIONS)[number];

export function isEmotion(value: unknown): value is Emotion {
  return typeof value === "string" && (EMOTIONS as readonly string[]).includes(value);
}

// Pagalbos linijos, kurių numeriai tekste niekada neblokuojami.
const HELPLINE_NUMBERS = ["116123", "880028888", "800 28888", "116 123"];

const URL_PATTERN = /(https?:\/\/|www\.|[a-z0-9-]+\.(lt|com|net|org|eu|io|co|ru|shop|xyz)\b)/i;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const LONG_CHAR_RUN = /(.)\1{14,}/;

// Akivaizdaus spamo žodynas — ne moderacija, tik automatinė šiukšlių užkarda.
const SPAM_WORDS = [
  "casino",
  "kazino",
  "viagra",
  "crypto",
  "bitcoin",
  "forex",
  "paskola internetu",
  "greitas kreditas",
  "uzdirbk namuose",
  "uždirbk namuose",
  "seo paslaugos",
];

export type FilterResult = { ok: true } | { ok: false; reason: string };

export function checkText(raw: string): FilterResult {
  const text = raw.trim();
  if (text.length === 0) {
    return { ok: false, reason: "Tuščias tekstas." };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false, reason: `Tekstas per ilgas (daugiausia ${MAX_TEXT_LENGTH} ženklų).` };
  }
  if (URL_PATTERN.test(text)) {
    return { ok: false, reason: "Nuorodos sraute nepublikuojamos." };
  }
  if (EMAIL_PATTERN.test(text)) {
    return { ok: false, reason: "El. pašto adresai nepublikuojami — saugome anonimiškumą." };
  }
  if (LONG_CHAR_RUN.test(text)) {
    return { ok: false, reason: "Panašu į spamą." };
  }
  if (containsPhoneNumber(text)) {
    return { ok: false, reason: "Telefono numeriai nepublikuojami — saugome anonimiškumą." };
  }
  const lower = text.toLowerCase();
  if (SPAM_WORDS.some((w) => lower.includes(w))) {
    return { ok: false, reason: "Panašu į spamą." };
  }
  return { ok: true };
}

function containsPhoneNumber(text: string): boolean {
  // Ieškome 8+ skaitmenų sekų (ignoruojant tarpus/brūkšnius), praleidžiame pagalbos linijas.
  const digitRuns = text.match(/[\d][\d\s\-+()]{6,}[\d]/g);
  if (!digitRuns) return false;
  return digitRuns.some((run) => {
    const digits = run.replace(/\D/g, "");
    if (digits.length < 8) return false;
    return !HELPLINE_NUMBERS.some((h) => digits.includes(h.replace(/\D/g, "")));
  });
}

// Krizės žodžių detekcija: postas vis tiek publikuojamas, bet klientui
// grąžinama sos: true, kad švelniai parodytų pagalbos linijas.
const CRISIS_PATTERNS = [
  /nusižud/i,
  /nusizud/i,
  /savižudyb/i,
  /savizudyb/i,
  /žudytis/i,
  /zudytis/i,
  /pasikart(i|si)/i,
  /nebenoriu\s+gyventi/i,
  /nenoriu\s+gyventi/i,
  /noriu\s+mirti/i,
  /noriu\s+numirti/i,
  /geriau\s+man(es)?\s+nebebūt/i,
  /susižalo(ti|jau|siu)/i,
  /susizalo(ti|jau|siu)/i,
  /susipjaust/i,
  /nebegaliu\s+daugiau\s+gyventi/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}
