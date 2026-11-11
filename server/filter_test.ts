import { checkText, detectCrisis, isEmotion, MAX_TEXT_LENGTH, sanitizeText } from "./filter.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test("checkText: leidžia normalų emocinį tekstą su keiksmais", () => {
  assert(checkText("Šiandien viskas užkniso, po velnių!!!").ok, "turi leisti");
  assert(checkText("a").ok, "turi leisti trumpą");
});

Deno.test("checkText: blokuoja tuščią ir per ilgą", () => {
  assert(!checkText("   ").ok, "tuščias");
  assert(!checkText("x".repeat(MAX_TEXT_LENGTH + 1)).ok, "per ilgas");
});

Deno.test("checkText: srautui ir istorijoms — ta pati 5000 ženklų riba", () => {
  const longText = "tai buvo sunkus metas mano gyvenime ".repeat(120); // ~4320 ženklų
  assert(checkText(longText).ok, "ilgas tekstas leidžiamas");
  const tooLong = "tai buvo sunkus metas mano gyvenime ".repeat(140); // ~5040 ženklų
  assert(!checkText(tooLong).ok, "per ilgas tekstas");
});

Deno.test("checkText: blokuoja nuorodas ir el. paštą", () => {
  assert(!checkText("eik į http://spam.example").ok, "http");
  assert(!checkText("mano puslapis www.spam.lt").ok, "www");
  assert(!checkText("rašyk man vardas@gmail.com").ok, "email");
});

Deno.test("checkText: blokuoja telefonus, bet ne pagalbos linijas", () => {
  assert(!checkText("skambink man 86123456789").ok, "asmeninis numeris");
  assert(checkText("skambinau į 116 123 ir padėjo").ok, "Vilties linija leidžiama");
  assert(checkText("Jaunimo linija 8 800 28888 išklausė").ok, "Jaunimo linija leidžiama");
});

Deno.test("checkText: blokuoja spamą", () => {
  assert(!checkText("geriausias kazino bonusas").ok, "kazino");
  assert(!checkText("aaaaaaaaaaaaaaaaaaaa").ok, "ilga simbolių virtinė");
});

Deno.test("detectCrisis: atpažįsta krizės tekstą", () => {
  assert(detectCrisis("nebenoriu gyventi"), "nebenoriu gyventi");
  assert(detectCrisis("galvoju apie savižudybę"), "savižudybė");
  assert(detectCrisis("noriu mirti"), "noriu mirti");
  assert(!detectCrisis("šiandien buvo sunki diena darbe"), "normalus tekstas");
});

Deno.test("isEmotion: validuoja emocijas", () => {
  assert(isEmotion("pyktis"), "pyktis");
  assert(isEmotion("viltis"), "viltis");
  assert(!isEmotion("dziaugsmas"), "nežinoma emocija");
  assert(!isEmotion(42), "ne stringas");
});

Deno.test("checkText: datos ir metai nėra telefonai", () => {
  assert(checkText("Mama mirė 2020-05-17 ir aš vis dar negaliu").ok, "ISO data");
  assert(checkText("gimiau 1990 05 17").ok, "data su tarpais");
  assert(checkText("17.05.2020 viskas pasikeitė").ok, "data dd.mm.yyyy");
  assert(checkText("santuoka 1998–2020 baigėsi").ok, "metų intervalas");
  assert(!checkText("skambink +370 612 34567").ok, "tikras numeris vis tiek blokuojamas");
});

Deno.test("checkText: skausmas apie lošimą ar kriptovaliutas — ne spamas", () => {
  assert(checkText("Pralošiau viską kazino, žmona išėjo").ok, "kazino istorija");
  assert(checkText("praradau santaupas bitcoin ir crypto").ok, "kripto istorija");
  assert(!checkText("kazino bonusas tik šiandien").ok, "reklama blokuojama");
});

Deno.test("checkText: blokuoja kontaktus susirašinėti", () => {
  assert(!checkText("rašyk man @vardas123").ok, "@handle");
  assert(!checkText("mano telegram: jonas_88").ok, "telegram");
  assert(!checkText("insta vardas.pavarde").ok, "instagram");
  assert(checkText("instagram mane slegia, nebenoriu ten būti").ok, "žodis be kontakto");
});

Deno.test("sanitizeText: išmeta valdymo simbolius, palieka eilutes", () => {
  assert(sanitizeText(" a\u0001b\r\nc\u007F ") === "ab\nc", "valymas");
  assert(sanitizeText("x\ty") === "x\ty", "tab lieka");
});

Deno.test("detectCrisis: dažni variantai be diakritikos ir angliškai", () => {
  for (
    const t of [
      "pasikorsiu",
      "geriau manes nebebutu",
      "geriau manęs nebūtų",
      "nebenoriu būti",
      "I want to kill myself",
      "i just want to die",
      "thinking about suicide",
    ]
  ) {
    assert(detectCrisis(t), t);
  }
  assert(!detectCrisis("noriu pabūti viena"), "normalus tekstas");
});
