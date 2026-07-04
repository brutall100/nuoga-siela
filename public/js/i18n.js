// Kalbos: LT (default) ir EN. Statiniai tekstai keičiami per data-i18n
// atributus, dinaminiai — per window.t(key, vars).

(function () {
  "use strict";

  const STRINGS = {
    lt: {
      promise: "Mes nežinome, kas tu. Ir nenorime žinoti.",
      "write.placeholder": "Išliek viską…",
      "write.storyPlaceholder": "Papasakok savo istoriją…",
      "emo.pyktis": "Pyktis",
      "emo.liudesys": "Liūdesys",
      "emo.nerimas": "Nerimas",
      "emo.kalte": "Kaltė",
      "emo.vienatve": "Vienatvė",
      "emo.viltis": "Viltis",
      "life.srautas": "⏳ Išnyks po 24 val.",
      "life.istorija": "📖 Palikti kaip istoriją",
      "btn.burn": "Sudeginti",
      "btn.release": "Paleisti anonimiškai",
      "write.hint":
        "Rašymas apie jausmus mažina jų intensyvumą — tai patvirtinta tyrimais. Sudegintas tekstas niekur nesiunčiamas.",
      "scream.link": "🔊 Šauksmo kambarys →",
      "feed.title": "Srautas",
      "feed.all": "Visi",
      "feed.emptyTitle": "Srautas šiuo metu tylus.",
      "feed.emptyText":
        "Kiekvienas tekstas čia gyvena tik 24 valandas — būk tas, kuris paleidžia pirmas.",
      "feed.emptyLink": "Arba paskaityk istorijas →",
      "stories.title": "Istorijos",
      "stories.intro": "Tekstai, kuriuos žmonės paliko ilgam. Gal tarp jų — ir tavo istorija.",
      "stories.sortHugs": "Labiausiai suprastos",
      "stories.sortNew": "Naujausios",
      "stories.all": "Visos",
      "stories.emptyTitle": "Istorijų dar nėra.",
      "stories.emptyText":
        'Parašyk savo — rašymo ekrane pasirink „Palikti kaip istoriją". Ji liks tiems, kam jos reikės.',
      "sos.title": "Tu ne vienas.",
      "sos.text":
        "Jei dabar sunku — pasikalbėk su žmogumi. Tai nemokama, anonimiška ir veikia visą parą.",
      "sos.hope": "Vilties linija",
      "sos.youth": "Jaunimo linija",
      "sos.hopeNote": "suaugusiems, visą parą",
      "sos.youthNote": "jaunimui, visą parą",
      "sos.breatheTitle": "Pakvėpuokim kartu",
      "breathe.idle": "Pradėti",
      "breathe.in": "Įkvėpk…",
      "breathe.out": "Iškvėpk…",
      "breathe.start": "Pradėti kvėpavimą",
      "breathe.stop": "Sustabdyti",
      "scream.title": "Šauksmo kambarys",
      "scream.intro":
        "Išrėk. Įrašas gyvena tik tavo telefono atmintyje — niekur nesiunčiamas, niekur nesaugomas. Išeini — jis dingsta.",
      "scream.tapToStart": "Spausk ir rėk.",
      "scream.recording": "Įrašinėja… rėk drąsiai.",
      "scream.done": "Įrašas tik tavo atmintyje. Perklausyk ir paleisk.",
      "scream.play": "▶ Perklausyti",
      "scream.discard": "Ištrinti dabar",
      "scream.noMic": "Nepavyko pasiekti mikrofono. Patikrink leidimus.",
      "scream.deleted": "Ištrinta. Jo niekada nebuvo.",
      "set.title": "Nustatymai",
      "set.lang": "Kalba",
      "set.soft": "Švelnus srautas",
      "set.softDesc": "Keiksmažodžiai sraute rodomi kaip b***. Tavo paties rašymo tai neriboja.",
      "set.deleteBtn": "Ištrinti mano duomenis",
      "set.deleteDesc":
        "Iškart ištrina visus tavo paleistus tekstus iš srauto ir tavo įrenginio žymę.",
      "set.supportTitle": "Palaikyk projektą",
      "set.supportDesc":
        "Jokių reklamų čia nebus niekada. Jei ši erdvė tau padėjo — gali pavaišinti kava.",
      "set.supportBtn": "☕ Pavaišinti kava",
      "set.privacyTitle": "Privatumas",
      "set.privacy1":
        "Jokios registracijos. Jokių vardų, el. paštų ar telefonų. Tavo įrenginys gauna atsitiktinį kodą, kuris serveryje saugomas tik kaip negrįžtamas hash'as — jo neįmanoma susieti su tavimi.",
      "set.privacy2":
        "Prie tekstų nesaugomi IP adresai. Srauto tekstai po 24 valandų fiziškai ištrinami — ne paslepiami, o ištrinami. Istorijos lieka tol, kol pats jų neištrini.",
      "set.privacyLink": "Visa privatumo politika →",
      "tab.write": "Rašyti",
      "tab.feed": "Srautas",
      "tab.stories": "Istorijos",
      "tab.settings": "Nustatymai",
      "sheet.text":
        "Skamba, lyg tau dabar tikrai sunku. Tavo žodžiai paleisti — bet jei norisi su kuo nors pasikalbėti balsu, čia yra žmonės, kurie klauso:",
      "sheet.close": "Ačiū, suprantu",
      "hug.label": "Suprantu tave",
      "story.readAll": "Skaityti viską",
      "story.collapse": "Suskleisti",
      "time.gone": "išnyksta…",
      "time.hm": "liko {h} val. {m} min.",
      "time.m": "liko {m} min.",
      "toast.burned": "Paleista. Niekas to nematė.",
      "toast.released": "Paleista į srautą. Po 24 val. išnyks visam laikui.",
      "toast.storyReleased": "Tavo istorija liks tiems, kam jos reikės.",
      "toast.releaseFail": "Nepavyko paleisti.",
      "toast.noConnection": "Nėra ryšio. Tekstas liko tik pas tave.",
      "toast.pickEmotion": "Pasirink, kaip jautiesi — tai padės kitiems tave rasti.",
      "toast.feedFail": "Nepavyko pasiekti srauto.",
      "toast.storiesFail": "Nepavyko pasiekti istorijų.",
      "toast.reported": "Ačiū. Pranešimas gautas.",
      "toast.deleted": "Ištrinta. Tavo įrenginys dabar — visiškai naujas nepažįstamasis.",
      "toast.serverFail": "Nepavyko susisiekti su serveriu.",
      "confirm.report": "Pranešti apie šį tekstą? Po kelių pranešimų jis dings.",
      "confirm.delete":
        "Ištrinti visus tavo paleistus tekstus ir įrenginio žymę? To atšaukti nebus galima.",
      "banner.one": "Tavo tekstą suprato dar 1 žmogus 🤍",
      "banner.many": "Tavo tekstus suprato dar {n} žmonės 🤍",
      "proof.line": 'Šiandien paleisti {p} tekstai · {h} kartų „suprantu"',
    },
    en: {
      promise: "We don't know who you are. And we don't want to.",
      "write.placeholder": "Let it all out…",
      "write.storyPlaceholder": "Tell your story…",
      "emo.pyktis": "Anger",
      "emo.liudesys": "Sadness",
      "emo.nerimas": "Anxiety",
      "emo.kalte": "Guilt",
      "emo.vienatve": "Loneliness",
      "emo.viltis": "Hope",
      "life.srautas": "⏳ Gone in 24 hours",
      "life.istorija": "📖 Keep as a story",
      "btn.burn": "Burn it",
      "btn.release": "Release anonymously",
      "write.hint":
        "Writing about feelings lowers their intensity — that's research-backed. Burned text is never sent anywhere.",
      "scream.link": "🔊 Scream room →",
      "feed.title": "Stream",
      "feed.all": "All",
      "feed.emptyTitle": "The stream is quiet right now.",
      "feed.emptyText": "Every text here lives only 24 hours — be the one who releases first.",
      "feed.emptyLink": "Or read the stories →",
      "stories.title": "Stories",
      "stories.intro": "Texts people left for good. Maybe yours belongs here too.",
      "stories.sortHugs": "Most understood",
      "stories.sortNew": "Newest",
      "stories.all": "All",
      "stories.emptyTitle": "No stories yet.",
      "stories.emptyText":
        'Write yours — on the writing screen choose "Keep as a story". It will stay for those who need it.',
      "sos.title": "You are not alone.",
      "sos.text": "If it's hard right now — talk to a human. Free, anonymous, around the clock.",
      "sos.hope": "Hope line (Vilties linija)",
      "sos.youth": "Youth line (Jaunimo linija)",
      "sos.hopeNote": "for adults, 24/7",
      "sos.youthNote": "for youth, 24/7",
      "sos.breatheTitle": "Let's breathe together",
      "breathe.idle": "Start",
      "breathe.in": "Breathe in…",
      "breathe.out": "Breathe out…",
      "breathe.start": "Start breathing",
      "breathe.stop": "Stop",
      "scream.title": "Scream room",
      "scream.intro":
        "Scream it out. The recording lives only in your phone's memory — never sent, never saved. Leave, and it's gone.",
      "scream.tapToStart": "Tap and scream.",
      "scream.recording": "Recording… let it out.",
      "scream.done": "The recording exists only in memory. Listen and let go.",
      "scream.play": "▶ Play back",
      "scream.discard": "Delete now",
      "scream.noMic": "Couldn't access the microphone. Check permissions.",
      "scream.deleted": "Deleted. It never existed.",
      "set.title": "Settings",
      "set.lang": "Language",
      "set.soft": "Gentle stream",
      "set.softDesc":
        "Profanity in the stream is shown as b***. Your own writing is never limited.",
      "set.deleteBtn": "Delete my data",
      "set.deleteDesc": "Immediately deletes all your released texts and your device marker.",
      "set.supportTitle": "Support the project",
      "set.supportDesc":
        "There will never be ads here. If this space helped you — buy us a coffee.",
      "set.supportBtn": "☕ Buy a coffee",
      "set.privacyTitle": "Privacy",
      "set.privacy1":
        "No registration. No names, emails or phones. Your device gets a random code stored on the server only as an irreversible hash — it cannot be linked to you.",
      "set.privacy2":
        "No IP addresses are stored with texts. Stream texts are physically deleted after 24 hours — not hidden, deleted. Stories stay until you delete them yourself.",
      "set.privacyLink": "Full privacy policy →",
      "tab.write": "Write",
      "tab.feed": "Stream",
      "tab.stories": "Stories",
      "tab.settings": "Settings",
      "sheet.text":
        "It sounds like things are really hard right now. Your words are released — but if you'd like to talk to someone, these people listen:",
      "sheet.close": "Thanks, I understand",
      "hug.label": "I understand you",
      "story.readAll": "Read all",
      "story.collapse": "Collapse",
      "time.gone": "fading…",
      "time.hm": "{h} h {m} min left",
      "time.m": "{m} min left",
      "toast.burned": "Released. No one saw it.",
      "toast.released": "Released into the stream. Gone forever in 24 hours.",
      "toast.storyReleased": "Your story will stay for those who need it.",
      "toast.releaseFail": "Couldn't release.",
      "toast.noConnection": "No connection. The text stayed only with you.",
      "toast.pickEmotion": "Pick how you feel — it helps others find you.",
      "toast.feedFail": "Couldn't reach the stream.",
      "toast.storiesFail": "Couldn't reach the stories.",
      "toast.reported": "Thank you. Report received.",
      "toast.deleted": "Deleted. Your device is now a complete stranger.",
      "toast.serverFail": "Couldn't reach the server.",
      "confirm.report": "Report this text? After a few reports it will disappear.",
      "confirm.delete": "Delete all your released texts and device marker? This cannot be undone.",
      "banner.one": "1 more person understood your text 🤍",
      "banner.many": "{n} more people understood your texts 🤍",
      "proof.line": 'Today: {p} texts released · {h} times "I understand"',
    },
  };

  const LANG_KEY = "ns_lang";
  let lang = localStorage.getItem(LANG_KEY) || "lt";
  if (!STRINGS[lang]) lang = "lt";

  window.t = function (key, vars) {
    let s = STRINGS[lang][key] ?? STRINGS.lt[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll("{" + k + "}", String(v));
    }
    return s;
  };

  window.i18n = {
    get lang() {
      return lang;
    },
    set(newLang) {
      if (!STRINGS[newLang]) return;
      lang = newLang;
      localStorage.setItem(LANG_KEY, lang);
      this.apply();
    },
    apply() {
      document.documentElement.lang = lang;
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = window.t(el.dataset.i18n);
      });
      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.placeholder = window.t(el.dataset.i18nPlaceholder);
      });
      document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        el.setAttribute("aria-label", window.t(el.dataset.i18nAria));
      });
    },
  };
})();
