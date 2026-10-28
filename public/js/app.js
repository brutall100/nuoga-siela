// Nuoga Siela — pagrindinis kliento kodas: routing'as (tikri URL keliai), rašymas,
// srautas, istorijos, SOS, nustatymai. Tekstas visada per textContent — niekada innerHTML.
// Nuoseklus kelias: emocija → žodžiai → sudeginti / paleisti / palikti istoriją, o
// emocija visais atvejais nukeliauja į kalendorių (tik šiame įrenginyje, žr. mood.js).

(function () {
  "use strict";

  // ---------- Įrenginio identifikatorius (vienintelis, atsitiktinis) ----------

  const DEVICE_KEY = "ns_device";
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  const HUGGED_KEY = "ns_hugged";
  const hugged = new Set(JSON.parse(localStorage.getItem(HUGGED_KEY) || "[]"));
  function rememberHug(id) {
    hugged.add(id);
    localStorage.setItem(HUGGED_KEY, JSON.stringify([...hugged].slice(-500)));
  }

  // Mano paleistų tekstų žymė (tik lokaliai — serveris manęs nepažįsta).
  const MINE_KEY = "ns_mine";
  const SEEN_HUGS_KEY = "ns_seen_hugs";
  let mineCount = JSON.parse(localStorage.getItem(MINE_KEY) || "0");
  function rememberMine() {
    mineCount++;
    localStorage.setItem(MINE_KEY, JSON.stringify(mineCount));
  }

  // Ta pati riba srautui ir istorijoms (serveris tikrina tą patį — server/filter.ts).
  const MAX_LEN = 5000;

  // „Švelnus srautas": keiksmai rodomi kaip b*** (tik rodymas, ne cenzūra).
  const SOFT_KEY = "ns_svelnus";
  let softMode = (localStorage.getItem(SOFT_KEY) ?? "1") === "1";
  function displayText(text) {
    return softMode && window.maskProfanity ? window.maskProfanity(text) : text;
  }

  // ---------- Pagalbinės ----------

  const $ = (sel) => document.querySelector(sel);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        "x-device": deviceId,
        ...(options.headers || {}),
      },
    });
    return res.json();
  }

  let toastTimer = null;
  function toast(message, kind = "") {
    const el = $("#toast");
    el.textContent = message;
    el.className = "toast" + (kind ? " toast-" + kind : "");
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3200);
  }

  // ---------- Routing'as ----------

  const SCREENS = [
    "rasyti",
    "srautas",
    "istorijos",
    "sos",
    "sauksmas",
    "kalendorius",
    "nustatymai",
  ];

  let prevScreen = null;

  function currentScreen() {
    const name = location.pathname.replace(/^\//, "");
    return SCREENS.includes(name) ? name : "rasyti";
  }

  function navigate(path) {
    if (location.pathname !== path) history.pushState(null, "", path);
    render();
    scrollTo(0, 0);
  }

  // Švytinti juostelė virš aktyvaus tab'o nuslenka prie naujo (tik transform).
  const tabGlow = $("#tab-glow");
  let tabGlowPlaced = false;
  function placeTabGlow() {
    const tab = document.querySelector(".tab.is-active");
    tabGlow.classList.toggle("is-hidden", !tab);
    if (!tab) return;
    if (!tabGlowPlaced) tabGlow.classList.add("no-anim");
    tabGlow.style.setProperty("--x", tab.offsetLeft + "px");
    tabGlow.style.setProperty("--w", tab.offsetWidth + "px");
    if (!tabGlowPlaced) {
      void tabGlow.offsetWidth;
      tabGlow.classList.remove("no-anim");
      tabGlowPlaced = true;
    }
  }
  addEventListener("resize", () => {
    tabGlowPlaced = false;
    placeTabGlow();
  });

  function render() {
    const active = currentScreen();
    for (const name of SCREENS) {
      $("#screen-" + name).hidden = name !== active;
    }
    // Tab'ai sekami tik tiems ekranams, kurie turi tab'ą; kiti (sos, sauksmas)
    // pasiekiami per nuorodas, nustatymai — per ⚙ viršuje.
    document.querySelectorAll(".tab").forEach((tab) => {
      const on = tab.dataset.screen === active;
      tab.classList.toggle("is-active", on);
      if (on) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    const settingsBtn = $("#settings-btn");
    settingsBtn.classList.toggle("is-active", active === "nustatymai");
    if (active === "nustatymai") settingsBtn.setAttribute("aria-current", "page");
    else settingsBtn.removeAttribute("aria-current");
    placeTabGlow();
    // Grįžus atgal (popstate) atviri lapai ir meniu neturi likti kabėti.
    closeInfo();
    setSoundMenu(false);
    if (active === "srautas") loadFeed();
    if (active === "istorijos") loadStories();
    if (active === "rasyti") loadSocialProof();
    if (active === "rasyti" && prevScreen !== "rasyti") greetWriteScreen();
    if (active === "kalendorius") window.mood.render();
    if (active !== "sos") {
      window.breatheStop($("#breathe-circle"), $("#breathe-label"), $("#btn-breathe"));
    }
    // Palikus Šauksmo kambarį — viskas iš atminties dingsta.
    if (prevScreen === "sauksmas" && active !== "sauksmas") resetScream();
    // Fono garsas neturi patekti į šauksmo įrašą.
    if (active === "sauksmas") stopAmbient();
    prevScreen = active;
  }

  addEventListener("popstate", render);

  // Viršutinė juosta prisegta; paslinkus ji gauna stiklo foną (žr. .topbar main.css).
  const topbar = $(".topbar");
  const markScrolled = () => topbar.classList.toggle("is-scrolled", scrollY > 4);
  addEventListener("scroll", markScrolled, { passive: true });
  markScrolled();

  // Perimame paspaudimus ant vidinių nuorodų (tabbar, brand, SOS, tarpiniai
  // "→" linkai), kad naršymas vyktų per pushState be viso puslapio perkrovimo.
  // Be JS naršyklė tiesiog atlieka įprastą navigaciją — main.ts fallback'as
  // (nežinomas kelias be taško → index.html) ją ir taip išspręstų.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='/']");
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const path = link.getAttribute("href").replace(/^\//, "");
    if (!SCREENS.includes(path)) return;
    e.preventDefault();
    navigate(link.getAttribute("href"));
  });

  // Senos hash nuorodos (žymelės, dalinimasis) — konvertuojam vieną kartą į tikrą kelią.
  if (location.hash.startsWith("#/")) {
    const legacy = location.hash.replace(/^#\//, "");
    const path = SCREENS.includes(legacy) ? "/" + legacy : "/rasyti";
    history.replaceState(null, "", path);
  }

  // ---------- Info lapai (ⓘ antraštėse) ----------
  // Lapas iš apačios; fonas tuo metu inert (nei Tab, nei skaitytuvas jo nemato).
  // Rašymo ekrano „Kaip tai veikia" pats atsidaro pirmą kartą (ns_intro, tik localStorage).

  const INTRO_KEY = "ns_intro";
  const infoSheet = $("#info-sheet");
  const BEHIND_SHEET = [".topbar", "#main", "#tabbar"];
  let sheetOpener = null;

  function setBehindInert(on) {
    for (const sel of BEHIND_SHEET) $(sel).inert = on;
  }

  function openInfo(name, opener) {
    const panel = infoSheet.querySelector(`[data-info-panel="${name}"]`);
    if (!panel) return;
    infoSheet.querySelectorAll("[data-info-panel]").forEach((el) => (el.hidden = el !== panel));
    sheetOpener = opener || null;
    infoSheet.hidden = false;
    setBehindInert(true);
    // Fokusas — pačiam lapui (be rėmelio), Tab veda į „Supratau".
    panel.tabIndex = -1;
    panel.focus();
  }

  function closeInfo() {
    if (infoSheet.hidden) return;
    infoSheet.hidden = true;
    setBehindInert(false);
    localStorage.setItem(INTRO_KEY, "1");
    if (sheetOpener && sheetOpener.isConnected) sheetOpener.focus();
    sheetOpener = null;
  }

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-info]");
    if (opener) return openInfo(opener.dataset.info, opener);
    if (e.target.closest("[data-sheet-close]")) closeInfo();
  });

  // Tab ciklas lapo viduje + Escape uždaro.
  infoSheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return closeInfo();
    if (e.key !== "Tab") return;
    const panel = infoSheet.querySelector("[data-info-panel]:not([hidden])");
    const focusable = [...panel.querySelectorAll("a[href], button")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ---------- Rašymo ekranas ----------

  const input = $("#write-input");
  const charCount = $("#char-count");
  const btnBurn = $("#btn-burn");
  const btnRelease = $("#btn-release");
  const btnStory = $("#btn-story");
  const actionBtns = [btnBurn, btnRelease, btnStory];
  // Viena emocija visada pažymėta; numatyta — „Viltis" (ir atidarius, ir po kiekvieno teksto).
  const DEFAULT_EMOTION = "viltis";
  let selectedEmotion = DEFAULT_EMOTION;

  function updateCounter() {
    charCount.textContent = input.value.length + " / " + MAX_LEN;
  }

  input.addEventListener("input", updateCounter);

  function selectEmotion(emotion) {
    selectedEmotion = emotion;
    document.querySelectorAll(".emo").forEach((el) => {
      const on = el.dataset.emotion === selectedEmotion;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-pressed", String(on));
      // Pažymėtos emocijos simbolis „atgyja", kiti — ramūs.
      window.icons.setLive(el.querySelector(".emo-icon"), on);
    });
  }

  selectEmotion(DEFAULT_EMOTION);

  $("#emotion-picker").addEventListener("click", (e) => {
    const btn = e.target.closest(".emo");
    if (btn) selectEmotion(btn.dataset.emotion);
  });

  // Atidarius rašymo ekraną visi emocijų simboliai ir trys keliai vieną kartą sujuda,
  // paskui juda tik pažymėta emocija.
  let greetTimer = null;
  function greetWriteScreen() {
    document.querySelectorAll(".emo:not(.is-active) .emo-icon").forEach(window.icons.playOnce);
    const paths = $(".paths");
    paths.classList.remove("is-greeting");
    void paths.offsetWidth;
    paths.classList.add("is-greeting");
    clearTimeout(greetTimer);
    greetTimer = setTimeout(() => paths.classList.remove("is-greeting"), 2000);
  }

  // Švelnus „pažiūrėk čia" — kai ko nors trūksta, elementas trumpai sujuda.
  function nudge(el) {
    el.classList.remove("is-nudged");
    void el.offsetWidth;
    el.classList.add("is-nudged");
  }

  // Emocija „nuskrenda" į Kalendoriaus tab'ą — matosi, kur ji nukeliavo.
  function flyToCalendar(emotion) {
    const target = $(".tab[data-screen='kalendorius']");
    const pulse = () => {
      target.classList.remove("is-receiving");
      void target.offsetWidth;
      target.classList.add("is-receiving");
    };
    const source = $(`.emo[data-emotion="${emotion}"] .emo-icon`);
    if (REDUCED || !source || !source.animate) return pulse();
    const from = source.getBoundingClientRect();
    const to = target.querySelector(".tab-icon").getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const fly = window.icons.emoSpan(emotion, false);
    fly.classList.add("emo-fly");
    fly.style.left = from.left + from.width / 2 + "px";
    fly.style.top = from.top + from.height / 2 + "px";
    document.body.append(fly);
    // Lankas: pirma pakyla (ease-out), tada krenta į tab'ą (ease-in).
    const at = (x, y, scale) =>
      `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
    fly.animate([
      { transform: at(0, 0, 1), easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
      { transform: at(dx * 0.3, -70, 1.7), offset: 0.38, easing: "cubic-bezier(0.6, 0, 0.9, 0.5)" },
      { transform: at(dx, dy, 0.45), opacity: 0.4 },
    ], { duration: 1000 }).finished.then(() => {
      fly.remove();
      pulse();
    });
  }

  let busy = false;

  function setBusy(on) {
    busy = on;
    for (const btn of actionBtns) btn.disabled = on;
  }

  // Kai vienas iš kelių baigtas: emocija — į kalendorių, naujam tekstui vėl „Viltis".
  function sendEmotionToCalendar() {
    window.mood.record(selectedEmotion);
    flyToCalendar(selectedEmotion);
    selectEmotion(DEFAULT_EMOTION);
  }

  btnBurn.addEventListener("click", async () => {
    if (busy) return;
    if (!input.value.trim()) return nudge(input);
    setBusy(true);
    await window.burnText(input, $("#burn-canvas"));
    // Kalendoriui — tik emocija ir diena, tekstas sudega niekur neišėjęs.
    sendEmotionToCalendar();
    updateCounter();
    toast(window.t("toast.burned"), "calm");
    setBusy(false);
  });

  btnRelease.addEventListener("click", () => release("srautas", btnRelease));
  btnStory.addEventListener("click", () => release("istorija", btnStory));

  async function release(kind, btn) {
    if (busy) return;
    const text = input.value.trim();
    if (!text) return nudge(input);
    setBusy(true);
    try {
      const data = await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ text, emotion: selectedEmotion, kind }),
      });
      if (data.ok) {
        input.value = "";
        rememberMine();
        sendEmotionToCalendar();
        updateCounter();
        // Žiburys „nuplaukia" nuo mygtuko prieš pereinant į srautą / istorijas.
        btn.classList.add("is-sending");
        setTimeout(() => btn.classList.remove("is-sending"), 900);
        if (data.sos) {
          $("#sos-sheet").hidden = false;
        } else if (kind === "istorija") {
          toast(window.t("toast.storyReleased"), "calm");
        } else {
          toast(window.t("toast.released"), "calm");
        }
        // Trumpa pauzė, kad spėtų pamatyti nuplaukiantį žiburį ir emociją.
        await new Promise((r) => setTimeout(r, REDUCED ? 0 : 650));
        navigate(kind === "istorija" ? "/istorijos" : "/srautas");
      } else {
        toast(data.reason || window.t("toast.releaseFail"), "warn");
      }
    } catch {
      toast(window.t("toast.noConnection"), "warn");
    }
    setBusy(false);
  }

  $("#sos-sheet-close").addEventListener("click", () => {
    $("#sos-sheet").hidden = true;
  });

  // Socialinis įrodymas: rodome tik kai erdvė gyva (>=5 tekstų šiandien).
  async function loadSocialProof() {
    try {
      const data = await api("/api/stats");
      const el = $("#social-proof");
      if (data.ok && data.postsToday >= 5) {
        el.hidden = false;
        // Abu skaičiai „suskaičiuoja" kartu (0 → 100 % tikrosios reikšmės).
        window.ui.countUp(el, 100, (pct) =>
          window.t("proof.line", {
            p: Math.round((data.postsToday * pct) / 100),
            h: Math.round((data.hugsToday * pct) / 100),
          }));
      } else {
        el.hidden = true;
      }
    } catch {
      /* tyliai — tai tik puošmena */
    }
  }

  // Sugrįžimo banneris: „Tavo tekstus suprato X žmonių".
  async function checkMyHugs() {
    if (mineCount === 0) return;
    try {
      const data = await api("/api/mine");
      if (!data.ok) return;
      const total = data.posts.reduce((sum, p) => sum + p.hugs, 0);
      const seen = JSON.parse(localStorage.getItem(SEEN_HUGS_KEY) || "0");
      if (total > seen) {
        const diff = total - seen;
        const banner = $("#hug-banner");
        const label = document.createElement("span");
        label.textContent = diff === 1
          ? window.t("banner.one")
          : window.t("banner.many", { n: diff });
        banner.replaceChildren(window.icons.line("heart-filled"), label);
        banner.hidden = false;
        banner.onclick = () => {
          banner.hidden = true;
          localStorage.setItem(SEEN_HUGS_KEY, JSON.stringify(total));
          navigate("/srautas");
        };
      }
      localStorage.setItem(SEEN_HUGS_KEY, JSON.stringify(total));
    } catch {
      /* tyliai */
    }
  }

  // ---------- Raminantys garsai (rašymo ir SOS ekranuose) ----------
  // Rašant — „Fonas" mygtukas laukelio kampe su meniu (Išjungta / Upė / Lietus / Laužas),
  // SOS ekrane — chip'ai. Abu rodo tą pačią būseną (window.ambient.current).

  const soundBtn = $("#sound-btn");
  const soundMenu = $("#sound-menu");

  function syncAmbient(loading) {
    const current = window.ambient.current;
    document.querySelectorAll(".ambient .chip").forEach((chip) => {
      const on = chip.dataset.sound === current;
      chip.classList.toggle("is-active", on);
      chip.classList.toggle("is-loading", chip.dataset.sound === loading);
      chip.setAttribute("aria-pressed", String(on));
    });
    document.querySelectorAll(".sound-opt").forEach((opt) => {
      opt.setAttribute("aria-pressed", String(opt.dataset.sound === (current ?? "")));
    });
    soundBtn.classList.toggle("is-on", Boolean(current));
    soundBtn.classList.toggle("is-loading", Boolean(loading));
    $("#sound-label").textContent = current
      ? window.t("sound.labelOn", { name: window.t("sound." + current) })
      : window.t("sound.label");
  }

  function stopAmbient() {
    window.ambient.stop();
    syncAmbient();
  }

  async function chooseSound(name) {
    if (window.ambient.current === name) return;
    if (!name) return stopAmbient();
    syncAmbient(name);
    try {
      await window.ambient.toggle(name);
    } catch {
      toast(window.t("sound.fail"), "warn");
    }
    syncAmbient();
  }

  function setSoundMenu(open) {
    soundMenu.hidden = !open;
    soundBtn.setAttribute("aria-expanded", String(open));
  }

  soundBtn.addEventListener("click", () => setSoundMenu(soundMenu.hidden));
  soundMenu.addEventListener("click", (e) => {
    const opt = e.target.closest(".sound-opt");
    if (!opt) return;
    setSoundMenu(false);
    soundBtn.focus();
    chooseSound(opt.dataset.sound);
  });
  // Meniu užsidaro paspaudus šalia arba Escape.
  document.addEventListener("click", (e) => {
    if (!soundMenu.hidden && !e.target.closest(".sound")) setSoundMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !soundMenu.hidden) {
      setSoundMenu(false);
      soundBtn.focus();
    }
  });

  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".ambient .chip");
    if (!chip) return;
    const name = chip.dataset.sound;
    chooseSound(window.ambient.current === name ? "" : name);
  });

  // ---------- Kortelės (srautui ir istorijoms) ----------

  function formatTimeLeft(ms) {
    if (ms <= 0) return window.t("time.gone");
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? window.t("time.hm", { h, m }) : window.t("time.m", { m });
  }

  function iconButton(className, icon, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-act " + className;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.append(window.icons.line(icon));
    return btn;
  }

  // mine — tik autoriaus srauto tekstams: { kept } iš /api/mine (žr. loadFeed()).
  function buildCard(post, now, mine) {
    const isStory = post.kind === "istorija";
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.emotion = post.emotion;

    // Ta pati emocijos kalba kaip rašant ir kalendoriuje: simbolis + pavadinimas.
    const emo = document.createElement("div");
    emo.className = "card-emo";
    const emoName = document.createElement("span");
    emoName.textContent = window.t("emo." + post.emotion);
    emo.append(window.icons.emoSpan(post.emotion, false), emoName);
    if (!isStory) {
      // Likęs laikas — antraštėje dešinėje, kad apačioje tilptų veiksmai.
      card.dataset.expires = post.expiresAt;
      const timeLeft = document.createElement("span");
      timeLeft.className = "time-left";
      const timeText = document.createElement("span");
      timeText.textContent = formatTimeLeft(post.expiresAt - now);
      timeLeft.append(window.icons.line("clock"), timeText);
      emo.append(timeLeft);
    }

    // Ilgas tekstas — tik keturios eilutės; „Skaityti toliau" atsiranda tik jei
    // tekstas tikrai netilpo (markClamped(), kai kortelė jau puslapyje).
    const text = document.createElement("p");
    text.className = "card-text is-clamped";
    text.textContent = displayText(post.text);
    const expand = document.createElement("button");
    expand.type = "button";
    expand.className = "expand";
    expand.hidden = true;
    expand.textContent = window.t("story.readAll");
    expand.setAttribute("aria-expanded", "false");
    expand.addEventListener("click", () => {
      const open = text.classList.toggle("is-clamped") === false;
      expand.textContent = window.t(open ? "story.collapse" : "story.readAll");
      expand.setAttribute("aria-expanded", String(open));
    });
    card.append(emo, text, expand);

    const foot = document.createElement("div");
    foot.className = "card-foot";

    const isHugged = hugged.has(post.id);
    const hug = document.createElement("button");
    hug.type = "button";
    hug.className = "hug" + (isHugged ? " is-hugged" : "");
    hug.setAttribute("aria-pressed", String(isHugged));
    const hugLabel = document.createElement("span");
    hugLabel.textContent = window.t("hug.label");
    const hugCount = document.createElement("span");
    hugCount.className = "hug-count";
    if (post.hugs > 0) window.ui.countUp(hugCount, post.hugs);
    hug.append(window.icons.line(isHugged ? "heart-filled" : "heart"), hugLabel, hugCount);
    hug.addEventListener("click", async () => {
      if (hugged.has(post.id)) return;
      hug.classList.add("is-hugged");
      hug.setAttribute("aria-pressed", "true");
      hug.firstChild.replaceWith(window.icons.line("heart-filled"));
      rememberHug(post.id);
      const data = await api(`/api/posts/${post.id}/hug`, { method: "POST" });
      if (data.ok) hugCount.textContent = String(data.hugs);
    });

    const spacer = document.createElement("span");
    spacer.className = "card-spacer";
    foot.append(hug, spacer);

    if (isStory) {
      const copyLink = iconButton("copy-link", "link", window.t("story.copyLink"));
      copyLink.addEventListener("click", async () => {
        const url = location.origin + "/istorijos/" + post.id;
        await navigator.clipboard.writeText(url);
        toast(window.t("toast.linkCopied"), "calm");
      });
      foot.append(copyLink);
    } else if (mine) {
      // Savo tekstui — „Į istorijas": lieka sraute iki 24 val. pabaigos, tada persikelia.
      foot.append(buildKeepButton(post, mine.kept));
    }

    // Savo teksto pranešti nėra prasmės.
    if (mine) {
      card.append(foot);
      window.ui.reveal(card);
      return card;
    }

    const report = iconButton("report", "flag", window.t("report.title"));
    report.addEventListener("click", async () => {
      if (!confirm(window.t("confirm.report"))) return;
      await api(`/api/posts/${post.id}/report`, { method: "POST" });
      card.remove();
      toast(window.t("toast.reported"));
    });
    foot.append(report);
    card.append(foot);

    window.ui.reveal(card);
    return card;
  }

  function buildKeepButton(post, kept) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "keep-btn";
    const label = document.createElement("span");
    const show = (on) => {
      btn.classList.toggle("is-kept", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.title = window.t(on ? "keep.cancelHint" : "keep.hint");
      label.textContent = window.t(on ? "keep.on" : "keep.off");
      btn.replaceChildren(window.icons.line(on ? "check" : "book"), label);
    };
    show(kept);
    btn.addEventListener("click", async () => {
      const on = !btn.classList.contains("is-kept");
      btn.disabled = true;
      try {
        const data = await api(`/api/posts/${post.id}/${on ? "keep" : "unkeep"}`, {
          method: "POST",
        });
        if (data.ok) {
          show(on);
          toast(window.t(on ? "toast.kept" : "toast.unkept"), "calm");
        } else {
          toast(data.reason || window.t("toast.serverFail"), "warn");
        }
      } catch {
        toast(window.t("toast.noConnection"), "warn");
      }
      btn.disabled = false;
    });
    return btn;
  }

  // „Skaityti toliau" — tik toms kortelėms, kurių tekstas netelpa į keturias eilutes.
  function markClamped(container) {
    requestAnimationFrame(() => {
      container.querySelectorAll(".card-text.is-clamped").forEach((text) => {
        const expand = text.nextElementSibling;
        expand.hidden = text.scrollHeight <= text.clientHeight + 1;
      });
    });
  }

  // Sąrašas, tuščia būsena (kai visai nieko) arba „šios emocijos dar nėra" (kai filtras).
  function showPosts(listSel, emptySel, filterEmptySel, posts, now, filtered, mine) {
    const list = $(listSel);
    list.textContent = "";
    for (const post of posts) list.append(buildCard(post, now, mine?.get(post.id)));
    markClamped(list);
    $(emptySel).hidden = posts.length > 0 || filtered;
    $(filterEmptySel).hidden = posts.length > 0 || !filtered;
  }

  function markChips(group, attr, value) {
    group.querySelectorAll(`[data-${attr}]`).forEach((el) => {
      const on = el.dataset[attr] === value;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-pressed", String(on));
    });
  }

  function spin(btn) {
    btn.classList.add("is-spinning");
    setTimeout(() => btn.classList.remove("is-spinning"), 450);
  }

  // ---------- Srautas ----------

  let feedFilter = "";
  let feedTicker = null;

  $("#feed-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    feedFilter = chip.dataset.filter;
    markChips($("#feed-filters"), "filter", feedFilter);
    loadFeed();
  });

  $("#btn-refresh").addEventListener("click", () => {
    spin($("#btn-refresh"));
    loadFeed();
  });

  async function loadFeed() {
    try {
      const query = feedFilter ? "?emotion=" + feedFilter : "";
      const [data, mine] = await Promise.all([api("/api/posts" + query), loadMineFeed()]);
      if (!data.ok) return;
      showPosts(
        "#feed",
        "#feed-empty",
        "#feed-filter-empty",
        data.posts,
        data.now,
        !!feedFilter,
        mine,
      );

      clearInterval(feedTicker);
      feedTicker = setInterval(() => {
        const now = Date.now();
        document.querySelectorAll(".card[data-expires]").forEach((card) => {
          const left = Number(card.dataset.expires) - now;
          const el = card.querySelector(".time-left span");
          if (el) el.textContent = formatTimeLeft(left);
          if (left <= 0) card.remove();
        });
      }, 30000);
    } catch {
      toast(window.t("toast.feedFail"), "warn");
    }
  }

  // Kurie srauto tekstai — mano (tik šis įrenginys; serveris tikrina pagal deviceHash).
  async function loadMineFeed() {
    if (mineCount === 0) return null;
    try {
      const data = await api("/api/mine");
      if (!data.ok) return null;
      return new Map(
        data.posts.filter((p) => p.kind === "srautas").map((p) => [p.id, { kept: p.kept }]),
      );
    } catch {
      return null;
    }
  }

  // ---------- Istorijos ----------

  let storyFilter = "";
  let storySort = "suprastos";

  $("#story-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    storyFilter = chip.dataset.filter;
    markChips($("#story-filters"), "filter", storyFilter);
    loadStories();
  });

  $("#story-sort").addEventListener("click", (e) => {
    const seg = e.target.closest(".seg");
    if (!seg) return;
    storySort = seg.dataset.sort;
    markChips($("#story-sort"), "sort", storySort);
    loadStories();
  });

  $("#btn-refresh-stories").addEventListener("click", () => {
    spin($("#btn-refresh-stories"));
    loadStories();
  });

  async function loadStories() {
    try {
      const params = new URLSearchParams();
      if (storyFilter) params.set("emotion", storyFilter);
      params.set("sort", storySort);
      const data = await api("/api/stories?" + params.toString());
      if (!data.ok) return;
      showPosts(
        "#story-feed",
        "#story-empty",
        "#story-filter-empty",
        data.posts,
        data.now,
        !!storyFilter,
      );
    } catch {
      toast(window.t("toast.storiesFail"), "warn");
    }
  }

  // ---------- SOS ----------

  $("#btn-breathe").addEventListener("click", () => {
    window.breatheStart($("#breathe-circle"), $("#breathe-label"), $("#btn-breathe"));
  });

  // ---------- Šauksmo kambarys ----------
  // Visas garsas — tik atmintyje (žr. scream.js). Čia tik UI valdymas.

  const screamOrb = $("#scream-orb");
  const screamIcon = $("#scream-icon");
  const screamStatus = $("#scream-status");
  const screamActions = $("#scream-actions");
  let screamBusy = false;

  function setScreamIcon(name) {
    screamIcon.replaceChildren(window.icons.line(name));
  }

  function resetScream() {
    if (window.screamCleanup) window.screamCleanup();
    screamOrb.classList.remove("is-recording", "is-ready");
    screamOrb.disabled = false;
    setScreamIcon("mic");
    screamStatus.textContent = window.t("scream.tapToStart");
    screamActions.hidden = true;
    screamBusy = false;
  }

  screamOrb.addEventListener("click", async () => {
    if (screamBusy) return;
    const st = window.screamState ? window.screamState() : "idle";
    if (st === "idle") {
      screamBusy = true;
      try {
        await window.screamStart();
        screamOrb.classList.add("is-recording");
        setScreamIcon("stop");
        screamStatus.textContent = window.t("scream.recording");
      } catch {
        toast(window.t("scream.noMic"), "warn");
      }
      screamBusy = false;
    } else if (st === "recording") {
      screamBusy = true;
      const ok = await window.screamStop();
      screamOrb.classList.remove("is-recording");
      if (ok) {
        screamOrb.classList.add("is-ready");
        setScreamIcon("check");
        screamStatus.textContent = window.t("scream.done");
        screamActions.hidden = false;
      } else {
        resetScream();
      }
      screamBusy = false;
    }
  });

  $("#scream-play").addEventListener("click", () => {
    if (window.screamPlay) window.screamPlay();
  });

  $("#scream-discard").addEventListener("click", () => {
    resetScream();
    toast(window.t("scream.deleted"), "calm");
  });

  // Jei vartotojas uždaro/užrakina puslapį — irgi viską išvalom.
  addEventListener("pagehide", () => {
    if (window.screamCleanup) window.screamCleanup();
  });

  // ---------- Nustatymai ----------

  const softToggle = $("#soft-toggle");
  softToggle.checked = softMode;
  softToggle.addEventListener("change", () => {
    softMode = softToggle.checked;
    localStorage.setItem(SOFT_KEY, softMode ? "1" : "0");
  });

  // Kalba: pakeitus perpiešiam statinius tekstus ir aktyvų sąrašą.
  const langSelect = $("#lang-select");
  langSelect.value = window.i18n.lang;
  langSelect.addEventListener("change", () => {
    window.i18n.set(langSelect.value);
    syncAmbient();
    const active = currentScreen();
    if (active === "srautas") loadFeed();
    if (active === "istorijos") loadStories();
    if (active === "kalendorius") window.mood.render();
  });

  $("#btn-delete-data").addEventListener("click", async () => {
    if (!confirm(window.t("confirm.delete"))) {
      return;
    }
    try {
      const data = await api("/api/mine/delete", { method: "POST" });
      if (data.ok) {
        localStorage.removeItem(DEVICE_KEY);
        localStorage.removeItem(HUGGED_KEY);
        localStorage.removeItem(MINE_KEY);
        localStorage.removeItem(SEEN_HUGS_KEY);
        window.mood.clear();
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_KEY, deviceId);
        hugged.clear();
        mineCount = 0;
        toast(window.t("toast.deleted"), "calm");
      }
    } catch {
      toast(window.t("toast.serverFail"), "warn");
    }
  });

  // ---------- Startas ----------

  window.i18n.apply();
  setScreamIcon("mic");
  syncAmbient();
  render();
  checkMyHugs();
  // Pirmą kartą atėjus į rašymo ekraną — „Kaip tai veikia" atsidaro pats.
  if (currentScreen() === "rasyti" && localStorage.getItem(INTRO_KEY) !== "1") {
    openInfo("rasyti");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
})();
