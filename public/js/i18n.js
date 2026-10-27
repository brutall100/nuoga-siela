// Kalbos: LT (default) ir EN. Statiniai tekstai keičiami per data-i18n
// atributus, dinaminiai — per window.t(key, vars).

(function () {
  "use strict";

  const STRINGS = {
    lt: {
      promise: "Mes nežinome, kas tu. Ir nenorime žinoti.",
      "write.placeholder": "Išliek viską…",
      "write.emoLabel": "Kaip jautiesi?",
      "write.pathLabel": "Ką darysi su tuo?",
      "path.burn": "Sudeginti",
      "path.burnDesc": "Niekas nepamatys. Niekur nesiunčiama.",
      "path.release": "Paleisti",
      "path.releaseDesc": "Į Srautą. Po 24 val. išnyks.",
      "path.releaseTooLong": "Srautui per ilga (iki 1000 ženklų) — palik kaip istoriją.",
      "path.story": "Palikti istoriją",
      "path.storyDesc": "Į Istorijas. Lieka, kol ištrinsi.",
      "path.note": "Paleidžiama anonimiškai. Istorijas gali rasti ir Google paieška.",
      "intro.title": "Kaip tai veikia",
      "intro.close": "Uždaryti",
      "intro.ok": "Supratau",
      "step1.title": "Pažymėk, kaip jautiesi",
      "step1.text": "Emocija atsiras tavo kalendoriuje — tik šiame įrenginyje.",
      "step2.title": "Išliek žodžius",
      "step2.text": "Be vardo ir be registracijos.",
      "step3.title": "Nuspręsk, ką su jais daryti",
      "step3.text": "Sudeginti, paleisti 24 valandoms arba palikti istoriją kitiems.",
      "emo.pyktis": "Pyktis",
      "emo.liudesys": "Liūdesys",
      "emo.nerimas": "Nerimas",
      "emo.kalte": "Kaltė",
      "emo.vienatve": "Vienatvė",
      "emo.viltis": "Viltis",
      "write.hint": "Rašymas apie jausmus mažina jų intensyvumą — tai patvirtinta tyrimais.",
      "scream.link": "🔊 Nori išrėkti, ne parašyti? Šauksmo kambarys →",
      "feed.title": "Srautas",
      "feed.all": "Visi",
      "feed.intro":
        "Ką žmonės paleido per pastarąją parą. Po 24 val. kiekvienas tekstas išnyksta visam laikui.",
      "feed.emptyTitle": "Srautas šiuo metu tylus.",
      "feed.emptyText":
        "Kiekvienas tekstas čia gyvena tik 24 valandas — būk tas, kuris paleidžia pirmas.",
      "feed.emptyLink": "Arba paskaityk istorijas →",
      "stories.title": "Istorijos",
      "stories.intro":
        "Tekstai, kuriuos žmonės paliko ilgam: jie lieka, kol autorius pats ištrina. Gal tarp jų rasi ir savo.",
      "stories.sortHugs": "Labiausiai suprastos",
      "stories.sortNew": "Naujausios",
      "stories.all": "Visos",
      "stories.emptyTitle": "Istorijų dar nėra.",
      "stories.emptyText":
        "Parašyk savo — rašymo ekrane pasirink „Palikti istoriją“. Ji liks tiems, kam jos reikės.",
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
      "about.title": "Apie Nuogą Sielą",
      "about.mission1":
        "Nuoga Siela — vieta padėti tai, ką neši. Čia gali išsakyti, kas slegia, ir niekas nesužinos, kad tai tu: jokios registracijos, jokių vardų, jokių komentarų. Kiti gali tik paspausti „Suprantu tave“.",
      "about.mission2":
        "Tikslas paprastas — kad būtų lengviau. Rašymas apie jausmus mažina jų intensyvumą, o kalendorius padeda pamatyti, kaip jie keičiasi laikui bėgant.",
      "set.dataTitle": "Tavo duomenys",
      "set.deleteBtn": "Ištrinti mano duomenis",
      "set.deleteDesc":
        "Iškart ištrina visus tavo paleistus tekstus, emocijų kalendorių ir įrenginio žymę.",
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
      "tab.calendar": "Kalendorius",
      "sheet.text":
        "Skamba, lyg tau dabar tikrai sunku. Tavo žodžiai paleisti — bet jei norisi su kuo nors pasikalbėti balsu, čia yra žmonės, kurie klauso:",
      "sheet.close": "Ačiū, suprantu",
      "hug.label": "Suprantu tave",
      "story.readAll": "Skaityti viską",
      "story.collapse": "Suskleisti",
      "story.copyLink": "Kopijuoti nuorodą",
      "time.gone": "išnyksta…",
      "time.hm": "liko {h} val. {m} min.",
      "time.m": "liko {m} min.",
      "toast.burned": "Sudegė. Niekas to nematė.",
      "toast.released": "Paleista į srautą. Po 24 val. išnyks visam laikui.",
      "toast.storyReleased": "Tavo istorija liks tiems, kam jos reikės.",
      "toast.releaseFail": "Nepavyko paleisti.",
      "toast.noConnection": "Nėra ryšio. Tekstas liko tik pas tave.",
      "toast.pickEmotion": "Pasirink, kaip jautiesi — tai padės kitiems tave rasti.",
      "toast.feedFail": "Nepavyko pasiekti srauto.",
      "toast.storiesFail": "Nepavyko pasiekti istorijų.",
      "toast.reported": "Ačiū. Pranešimas gautas.",
      "toast.linkCopied": "Nuoroda nukopijuota.",
      "toast.deleted": "Ištrinta. Tavo įrenginys dabar — visiškai naujas nepažįstamasis.",
      "toast.serverFail": "Nepavyko susisiekti su serveriu.",
      "confirm.report": "Pranešti apie šį tekstą? Po kelių pranešimų jis dings.",
      "confirm.delete":
        "Ištrinti visus tavo paleistus tekstus, emocijų kalendorių ir įrenginio žymę? To atšaukti nebus galima.",
      "banner.one": "Tavo tekstą suprato dar 1 žmogus 🤍",
      "banner.many": "Tavo tekstus suprato dar {n} žmonės 🤍",
      "proof.line": 'Šiandien paleisti {p} tekstai · {h} kartų „suprantu"',
      skip: "Pereiti prie turinio",
      "theme.toggle": "Perjungti šviesų / tamsų režimą",
      "hero.title": "Kas guli ant širdies?",
      "write.label": "Tavo tekstas",
      "aria.sos": "Pagalba dabar",
      "aria.refresh": "Atnaujinti",
      "aria.scream": "Rėkti",
      "report.title": "Pranešti",
      "mood.title": "Emocijų kalendorius",
      "mood.intro":
        "Čia atsiranda kiekviena emocija, kurią pažymi rašydama(s) — ir paleistame, ir sudegintame tekste. Tik diena ir emocija, be teksto. Saugoma tik šiame įrenginyje.",
      "mood.weekTitle": "Tavo savaitė",
      "mood.weekLine": "Šią savaitę dažniausiai jautei: {emo}",
      "mood.weekEmpty":
        "Šią savaitę dar nieko nepažymėjai. Kai rašydama(s) pasirinksi emociją — ji atsiras čia.",
      "mood.sos": "Jei sunku jau kelias dienas iš eilės — nebūk su tuo viena(s). Pagalba →",
      "mood.prev": "Ankstesnis mėnuo",
      "mood.next": "Kitas mėnuo",
      "mood.sharedTitle": "Kaip jaučiasi visi",
      "mood.sharedLine": "Šią savaitę dažniausiai jaučiama: {emo}",
      "mood.sharedNote": "Per 7 dienas paleistų tekstų: {n}. Ką jauti tu — jaučia ir kiti.",
      "sound.aria": "Raminantys garsai",
      "sound.label": "🎧 Fonas",
      "sound.upe": "🌊 Upė",
      "sound.lietus": "🌧 Lietus",
      "sound.lauzas": "🔥 Laužas",
      "sound.fail": "Nepavyko įjungti garso.",
    },
    en: {
      promise: "We don't know who you are. And we don't want to.",
      "write.placeholder": "Let it all out…",
      "write.emoLabel": "How do you feel?",
      "write.pathLabel": "What will you do with it?",
      "path.burn": "Burn it",
      "path.burnDesc": "No one will see it. Never sent.",
      "path.release": "Release",
      "path.releaseDesc": "To the Stream. Gone in 24 h.",
      "path.releaseTooLong": "Too long for the Stream (max 1000 characters) — keep it as a story.",
      "path.story": "Keep as a story",
      "path.storyDesc": "To Stories. Stays until you delete it.",
      "path.note": "Released anonymously. Stories can also be found via Google.",
      "intro.title": "How it works",
      "intro.close": "Close",
      "intro.ok": "Got it",
      "step1.title": "Tag how you feel",
      "step1.text": "The emotion goes to your calendar — only on this device.",
      "step2.title": "Pour out the words",
      "step2.text": "No name, no sign-up.",
      "step3.title": "Decide what to do with them",
      "step3.text": "Burn them, release them for 24 hours, or keep them as a story for others.",
      "emo.pyktis": "Anger",
      "emo.liudesys": "Sadness",
      "emo.nerimas": "Anxiety",
      "emo.kalte": "Guilt",
      "emo.vienatve": "Loneliness",
      "emo.viltis": "Hope",
      "write.hint": "Writing about feelings lowers their intensity — that's research-backed.",
      "scream.link": "🔊 Need to scream, not write? Scream room →",
      "feed.title": "Stream",
      "feed.all": "All",
      "feed.intro":
        "What people released in the last day. Every text disappears for good after 24 hours.",
      "feed.emptyTitle": "The stream is quiet right now.",
      "feed.emptyText": "Every text here lives only 24 hours — be the one who releases first.",
      "feed.emptyLink": "Or read the stories →",
      "stories.title": "Stories",
      "stories.intro":
        "Texts people left for good: they stay until the author deletes them. Maybe you'll find your own among them.",
      "stories.sortHugs": "Most understood",
      "stories.sortNew": "Newest",
      "stories.all": "All",
      "stories.emptyTitle": "No stories yet.",
      "stories.emptyText":
        "Write yours — on the writing screen choose “Keep as a story”. It will stay for those who need it.",
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
      "about.title": "About Nuoga Siela",
      "about.mission1":
        "Nuoga Siela (“Naked Soul”) is a place to set down what you carry. Say what weighs on you, and no one will know it was you: no sign-up, no names, no comments. Others can only tap “I understand you”.",
      "about.mission2":
        "The goal is simple — to make it lighter. Writing about feelings lowers their intensity, and the calendar helps you see how they change over time.",
      "set.dataTitle": "Your data",
      "set.deleteBtn": "Delete my data",
      "set.deleteDesc":
        "Immediately deletes all your released texts, your mood calendar and your device marker.",
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
      "tab.calendar": "Calendar",
      "sheet.text":
        "It sounds like things are really hard right now. Your words are released — but if you'd like to talk to someone, these people listen:",
      "sheet.close": "Thanks, I understand",
      "hug.label": "I understand you",
      "story.readAll": "Read all",
      "story.collapse": "Collapse",
      "story.copyLink": "Copy link",
      "time.gone": "fading…",
      "time.hm": "{h} h {m} min left",
      "time.m": "{m} min left",
      "toast.burned": "Burned. No one saw it.",
      "toast.released": "Released into the stream. Gone forever in 24 hours.",
      "toast.storyReleased": "Your story will stay for those who need it.",
      "toast.releaseFail": "Couldn't release.",
      "toast.noConnection": "No connection. The text stayed only with you.",
      "toast.pickEmotion": "Pick how you feel — it helps others find you.",
      "toast.feedFail": "Couldn't reach the stream.",
      "toast.storiesFail": "Couldn't reach the stories.",
      "toast.reported": "Thank you. Report received.",
      "toast.linkCopied": "Link copied.",
      "toast.deleted": "Deleted. Your device is now a complete stranger.",
      "toast.serverFail": "Couldn't reach the server.",
      "confirm.report": "Report this text? After a few reports it will disappear.",
      "confirm.delete":
        "Delete all your released texts, your mood calendar and your device marker? This cannot be undone.",
      "banner.one": "1 more person understood your text 🤍",
      "banner.many": "{n} more people understood your texts 🤍",
      "proof.line": 'Today: {p} texts released · {h} times "I understand"',
      skip: "Skip to content",
      "theme.toggle": "Toggle light / dark mode",
      "hero.title": "What's on your heart?",
      "write.label": "Your text",
      "aria.sos": "Help now",
      "aria.refresh": "Refresh",
      "aria.scream": "Scream",
      "report.title": "Report",
      "mood.title": "Mood calendar",
      "mood.intro":
        "Every emotion you tag while writing shows up here, whether you released the text or burned it. Only the day and the emotion, never the text. Stored only on this device.",
      "mood.weekTitle": "Your week",
      "mood.weekLine": "This week you mostly felt: {emo}",
      "mood.weekEmpty":
        "You haven't tagged anything this week yet. Pick an emotion while writing and it will show up here.",
      "mood.sos":
        "If it's been hard for several days in a row, you don't have to carry it alone. Help →",
      "mood.prev": "Previous month",
      "mood.next": "Next month",
      "mood.sharedTitle": "How everyone feels",
      "mood.sharedLine": "The most common feeling this week: {emo}",
      "mood.sharedNote": "Texts released in the last 7 days: {n}. What you feel, others feel too.",
      "sound.aria": "Calming sounds",
      "sound.label": "🎧 Background",
      "sound.upe": "🌊 River",
      "sound.lietus": "🌧 Rain",
      "sound.lauzas": "🔥 Campfire",
      "sound.fail": "Couldn't play the sound.",
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
      document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        el.title = window.t(el.dataset.i18nTitle);
      });
    },
  };
})();
