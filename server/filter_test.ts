import { checkText, detectCrisis, isEmotion, MAX_STORY_LENGTH } from "./filter.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test("checkText: leidžia normalų emocinį tekstą su keiksmais", () => {
  assert(checkText("Šiandien viskas užkniso, po velnių!!!").ok, "turi leisti");
  assert(checkText("a").ok, "turi leisti trumpą");
});

Deno.test("checkText: blokuoja tuščią ir per ilgą", () => {
  assert(!checkText("   ").ok, "tuščias");
  assert(!checkText("x".repeat(1001)).ok, "per ilgas");
});

Deno.test("checkText: istorijoms galioja ilgesnė riba", () => {
  const longText = "tai buvo sunkus metas mano gyvenime ".repeat(120); // ~4320 ženklų
  assert(checkText(longText, MAX_STORY_LENGTH).ok, "ilga istorija leidžiama");
  assert(!checkText(longText, 1000).ok, "sraute ta pati riba kaip buvo");
  const tooLong = "tai buvo sunkus metas mano gyvenime ".repeat(140); // ~5040 ženklų
  assert(!checkText(tooLong, MAX_STORY_LENGTH).ok, "per ilga istorija");
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
