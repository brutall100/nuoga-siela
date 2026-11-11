// Teksto filtras. Principas: keiksmai leidžiami (tai išsiliejimo erdvė),
// blokuojamas tik akivaizdus spamas ir asmens duomenis primenantys šablonai.

// Ta pati riba srautui ir istorijoms (iki v3.3 srautas turėjo 1000).
export const MAX_TEXT_LENGTH = 5000;

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
// Kontaktai susirašinėjimui už programos ribų („rašyk man telegram @vardas"):
// anoniminėje erdvėje pažeidžiamiems žmonėms tai būtų viliojimo kelias.
const HANDLE_PATTERN = /(^|[\s(,:;])@[a-z0-9_.]{3,}/i;
const MESSENGER_HANDLE =
  /\b(telegram|tg|insta(gram)?|ig|snap(chat)?|discord|whats ?app|viber|signal|tiktok|kik|skype)\b\s*[:\-–]?\s*@?(?=[a-z0-9_.]*[\d_.])[a-z0-9_.]{3,}/i;
// Datos ir metų intervalai nėra telefonai („mama mirė 2020-05-17", „1990–2020").
const DATE_RUN = [
  /^\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}$/,
  /^\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{4}$/,
  /^\d{4}\s+\d{1,2}\s+\d{1,2}$/,
  /^\d{4}\s*[-–]\s*\d{4}$/,
];
// Valdymo simboliai (išskyrus \t ir \n) — tekste neturi prasmės ir laužytų XML (feed.xml).
// deno-lint-ignore no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Prieš tikrinimą ir saugojimą: be valdymo simbolių, \r\n → \n.
export function sanitizeText(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").trim();
}

// Akivaizdaus spamo žodynas — ne moderacija, tik automatinė šiukšlių užkarda. Tik
// reklaminės frazės, ne pavieniai žodžiai: „pralošiau viską kazino" ar „praradau
// santaupas bitcoin'e" — tikras skausmas, kurį žmogus turi galėti išsakyti.
const SPAM_WORDS = [
  "kazino bonus",
  "casino bonus",
  "nemokami sukimai",
  "free spins",
  "viagra",
  "cialis",
  "investuok į kripto",
  "forex signal",
  "paskola internetu",
  "greitas kreditas",
  "uzdirbk namuose",
  "uždirbk namuose",
  "seo paslaugos",
];

export type FilterResult = { ok: true } | { ok: false; reason: string };

export function checkText(raw: string, maxLength: number = MAX_TEXT_LENGTH): FilterResult {
  const text = raw.trim();
  if (text.length === 0) {
    return { ok: false, reason: "Tuščias tekstas." };
  }
  if (text.length > maxLength) {
    return { ok: false, reason: `Tekstas per ilgas (daugiausia ${maxLength} ženklų).` };
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
  if (HANDLE_PATTERN.test(text) || MESSENGER_HANDLE.test(text)) {
    return { ok: false, reason: "Kontaktai nepublikuojami — saugome anonimiškumą." };
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
    if (DATE_RUN.some((re) => re.test(run.trim()))) return false;
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
  /pasikor(ti|siu|s)/i,
  /nebenoriu\s+b[uū]ti/i,
  /nusinuod/i,
  /baigti\s+(su\s+)?(savo\s+)?gyvenim/i,
  /nebenoriu\s+gyventi/i,
  /nenoriu\s+gyventi/i,
  /noriu\s+mirti/i,
  /noriu\s+numirti/i,
  /geriau\s+man(ę|e)?s?\s+ne(be)?b[uū]t/i,
  /susižalo(ti|jau|siu)/i,
  /susizalo(ti|jau|siu)/i,
  /susipjaust/i,
  /nebegaliu\s+daugiau\s+gyventi/i,
  // EN sąsaja — anglų kalba rašantiems taip pat.
  /\bkill\s+my\s*self\b/i,
  /\bsuicid/i,
  /\bwant\s+to\s+die\b/i,
  /\bend\s+my\s+life\b/i,
  /\bself[\s-]?harm/i,
  /\bcut(ting)?\s+my\s*self\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive)\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}
