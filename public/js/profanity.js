// „Švelnus srautas": keiksmažodžių maskavimas TIK rodant (b***).
// Rašymo niekas necenzūruoja — tekstai serveryje lieka originalūs.
// Kamienai parinkti atsargiai, kad normalūs žodžiai nenukentėtų
// („sudeginti", „sukasi", „šikšnosparnis" — ne aukos).

(function () {
  "use strict";

  const LT = "a-zA-ZąčęėįšųūžĄČĘĖĮŠŲŪŽ";
  const TAIL = `[${LT}]*`;

  const STEMS = [
    "bl[ei]a?[td]" + TAIL, // blet, bliat…
    "na(?:ch|h|x)ui" + TAIL, // nachui…
    "(?:ch|x)ui" + TAIL, // chui…
    "pi[zs]d" + TAIL, // pizd…
    "pyzd" + TAIL,
    "byb" + TAIL, // bybis…
    "šūd" + TAIL, // šūdas…
    "kurv" + TAIL, // kurva…
    "jeb" + TAIL, // jeban…
    "kekš" + TAIL, // kekšė…
    "šikn" + TAIL, // šiknius…
    "pidar" + TAIL,
    "pyder" + TAIL,
    "dalbajob" + TAIL,
    "dolbajob" + TAIL,
    "debil" + TAIL, // debilas…
    "gaid(?:y|ž)" + TAIL, // gaidys, gaidžiai…
    "fuck\\w*",
    "shit\\w*",
    "bitch\\w*",
  ];

  const PATTERN = new RegExp(`(?<![${LT}])(?:${STEMS.join("|")})`, "gi");

  window.maskProfanity = function (text) {
    return text.replace(PATTERN, (word) => word[0] + "*".repeat(Math.max(word.length - 1, 2)));
  };
})();
