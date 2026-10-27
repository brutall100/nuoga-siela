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

  const MAX_LEN = { srautas: 1000, istorija: 5000 };

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
    if (active === "srautas") loadFeed();
    if (active === "istorijos") loadStories();
    if (active === "rasyti") loadSocialProof();
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

  // ---------- „Kaip tai veikia" (kol žmogus jo neuždaro) ----------

  const INTRO_KEY = "ns_intro";
  const intro = $("#intro-card");
  intro.hidden = localStorage.getItem(INTRO_KEY) === "1";

  function closeIntro() {
    localStorage.setItem(INTRO_KEY, "1");
    if (REDUCED) {
      intro.hidden = true;
      return;
    }
    intro.classList.add("is-leaving");
    intro.addEventListener("animationend", () => (intro.hidden = true), { once: true });
  }
  $("#intro-close").addEventListener("click", closeIntro);
  $("#intro-ok").addEventListener("click", closeIntro);

  // ---------- Rašymo ekranas ----------

  const input = $("#write-input");
  const charCount = $("#char-count");
  const btnBurn = $("#btn-burn");
  const btnRelease = $("#btn-release");
  const btnStory = $("#btn-story");
  const actionBtns = [btnBurn, btnRelease, btnStory];
  let selectedEmotion = null;

  // Laukelis priima istorijos ilgį; srautui per ilgas tekstas tiesiog
  // nukreipiamas į istoriją (serveris vis tiek tikrina abi ribas). Paspaudus
  // pritemdytą „Į srautą" plytelę, pranešimas paaiškina kodėl (release()).
  function updateCounter() {
    const len = input.value.length;
    const tooLong = len > MAX_LEN.srautas;
    charCount.textContent = len + " / " + (tooLong ? MAX_LEN.istorija : MAX_LEN.srautas);
    btnRelease.classList.toggle("is-unavailable", tooLong);
    btnRelease.setAttribute("aria-disabled", String(tooLong));
  }

  input.addEventListener("input", updateCounter);

  function selectEmotion(emotion) {
    selectedEmotion = emotion;
    document.querySelectorAll(".emo").forEach((el) => {
      const on = el.dataset.emotion === selectedEmotion;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-pressed", String(on));
    });
  }

  $("#emotion-picker").addEventListener("click", (e) => {
    const btn = e.target.closest(".emo");
    if (!btn) return;
    selectEmotion(selectedEmotion === btn.dataset.emotion ? null : btn.dataset.emotion);
  });

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
    const source = $(`.emo[data-emotion="${emotion}"] .emo-face`);
    if (REDUCED || !source || !source.animate) return pulse();
    const from = source.getBoundingClientRect();
    const to = target.querySelector(".tab-icon").getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const fly = document.createElement("span");
    fly.className = "emo-fly";
    fly.setAttribute("aria-hidden", "true");
    fly.textContent = window.mood.faces[emotion];
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

  // Kai vienas iš kelių baigtas: emocija — į kalendorių, žymė nuimama naujam tekstui.
  function sendEmotionToCalendar() {
    if (!selectedEmotion) return;
    window.mood.record(selectedEmotion);
    flyToCalendar(selectedEmotion);
    selectEmotion(null);
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
    if (text.length > MAX_LEN[kind]) {
      toast(window.t("path.releaseTooLong"), "warn");
      return nudge(btnStory);
    }
    if (!selectedEmotion) {
      toast(window.t("toast.pickEmotion"));
      return nudge($("#emotion-picker"));
    }
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
        banner.textContent = diff === 1
          ? window.t("banner.one")
          : window.t("banner.many", { n: diff });
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

  function syncAmbient(loading) {
    const current = window.ambient.current;
    document.querySelectorAll(".ambient .chip").forEach((chip) => {
      const on = chip.dataset.sound === current;
      chip.classList.toggle("is-active", on);
      chip.classList.toggle("is-loading", chip.dataset.sound === loading);
      chip.setAttribute("aria-pressed", String(on));
    });
  }

  function stopAmbient() {
    window.ambient.stop();
    syncAmbient();
  }

  document.addEventListener("click", async (e) => {
    const chip = e.target.closest(".ambient .chip");
    if (!chip) return;
    const name = chip.dataset.sound;
    if (window.ambient.current !== name) syncAmbient(name);
    try {
      await window.ambient.toggle(name);
    } catch {
      toast(window.t("sound.fail"), "warn");
    }
    syncAmbient();
  });

  // ---------- Kortelės (srautui ir istorijoms) ----------

  const STORY_PREVIEW = 400;

  function formatTimeLeft(ms) {
    if (ms <= 0) return window.t("time.gone");
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? window.t("time.hm", { h, m }) : window.t("time.m", { m });
  }

  function buildCard(post, now) {
    const isStory = post.kind === "istorija";
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.emotion = post.emotion;

    // Ta pati emocijos kalba kaip rašant ir kalendoriuje: emoji + pavadinimas.
    const emo = document.createElement("span");
    emo.className = "card-emo";
    emo.textContent = (window.mood.faces[post.emotion] ?? "") + " " +
      window.t("emo." + post.emotion);
    card.append(emo);

    const text = document.createElement("p");
    text.className = "card-text";
    const shown = displayText(post.text);
    if (isStory && shown.length > STORY_PREVIEW) {
      const preview = shown.slice(0, STORY_PREVIEW).trimEnd() + "…";
      text.textContent = preview;
      const expand = document.createElement("button");
      expand.type = "button";
      expand.className = "expand";
      expand.textContent = window.t("story.readAll");
      let open = false;
      expand.addEventListener("click", () => {
        open = !open;
        text.textContent = open ? shown : preview;
        expand.textContent = open ? window.t("story.collapse") : window.t("story.readAll");
      });
      card.append(text, expand);
    } else {
      text.textContent = shown;
      card.append(text);
    }

    const foot = document.createElement("div");
    foot.className = "card-foot";

    const hug = document.createElement("button");
    hug.type = "button";
    hug.className = "hug" + (hugged.has(post.id) ? " is-hugged" : "");
    const hugIcon = document.createElement("span");
    hugIcon.textContent = "🤍";
    const hugLabel = document.createElement("span");
    hugLabel.textContent = window.t("hug.label");
    const hugCount = document.createElement("span");
    hugCount.className = "hug-count";
    if (post.hugs > 0) window.ui.countUp(hugCount, post.hugs);
    hug.append(hugIcon, hugLabel, hugCount);
    hug.addEventListener("click", async () => {
      if (hugged.has(post.id)) return;
      hug.classList.add("is-hugged");
      rememberHug(post.id);
      const data = await api(`/api/posts/${post.id}/hug`, { method: "POST" });
      if (data.ok) hugCount.textContent = String(data.hugs);
    });

    const right = document.createElement("div");
    right.className = "card-right";

    if (!isStory) {
      card.dataset.expires = post.expiresAt;
      const timeLeft = document.createElement("span");
      timeLeft.className = "time-left";
      timeLeft.textContent = formatTimeLeft(post.expiresAt - now);
      right.append(timeLeft);
    }

    if (isStory) {
      const copyLink = document.createElement("button");
      copyLink.type = "button";
      copyLink.className = "copy-link";
      copyLink.textContent = "🔗";
      copyLink.title = window.t("story.copyLink");
      copyLink.setAttribute("aria-label", window.t("story.copyLink"));
      copyLink.addEventListener("click", async () => {
        const url = location.origin + "/istorijos/" + post.id;
        await navigator.clipboard.writeText(url);
        toast(window.t("toast.linkCopied"), "calm");
      });
      right.append(copyLink);
    }

    const report = document.createElement("button");
    report.type = "button";
    report.className = "report";
    report.textContent = "⚑";
    report.title = window.t("report.title");
    report.setAttribute("aria-label", window.t("report.title"));
    report.addEventListener("click", async () => {
      if (!confirm(window.t("confirm.report"))) return;
      await api(`/api/posts/${post.id}/report`, { method: "POST" });
      card.remove();
      toast(window.t("toast.reported"));
    });

    right.append(report);
    foot.append(hug, right);
    card.append(foot);

    if (!isStory) {
      // "Dagtis" — kiek gyvybės likę (proporcija nuo 24 val.)
      const fuse = document.createElement("div");
      fuse.className = "fuse";
      const total = post.expiresAt - post.createdAt;
      const frac = Math.max(0, Math.min(1, (post.expiresAt - now) / total));
      fuse.style.transform = `scaleX(${frac})`;
      card.append(fuse);
    }

    window.ui.reveal(card);
    return card;
  }

  // ---------- Srautas ----------

  let feedFilter = "";
  let feedTicker = null;

  $("#feed-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    feedFilter = chip.dataset.filter;
    document.querySelectorAll("#feed-filters .chip").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.filter === feedFilter);
    });
    loadFeed();
  });

  $("#btn-refresh").addEventListener("click", () => {
    $("#btn-refresh").classList.add("is-spinning");
    setTimeout(() => $("#btn-refresh").classList.remove("is-spinning"), 450);
    loadFeed();
  });

  async function loadFeed() {
    try {
      const query = feedFilter ? "?emotion=" + feedFilter : "";
      const data = await api("/api/posts" + query);
      if (!data.ok) return;
      const feed = $("#feed");
      feed.textContent = "";
      for (const post of data.posts) {
        feed.append(buildCard(post, data.now));
      }
      $("#feed-empty").hidden = data.posts.length > 0;

      clearInterval(feedTicker);
      feedTicker = setInterval(() => {
        const now = Date.now();
        document.querySelectorAll(".card[data-expires]").forEach((card) => {
          const left = Number(card.dataset.expires) - now;
          const el = card.querySelector(".time-left");
          if (el) el.textContent = formatTimeLeft(left);
          if (left <= 0) card.remove();
        });
      }, 30000);
    } catch {
      toast(window.t("toast.feedFail"), "warn");
    }
  }

  // ---------- Istorijos ----------

  let storyFilter = "";
  let storySort = "suprastos";

  $("#story-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    storyFilter = chip.dataset.filter;
    document.querySelectorAll("#story-filters .chip").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.filter === storyFilter);
    });
    loadStories();
  });

  $("#story-sort").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    storySort = chip.dataset.sort;
    document.querySelectorAll("#story-sort .chip").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.sort === storySort);
    });
    loadStories();
  });

  $("#btn-refresh-stories").addEventListener("click", () => {
    $("#btn-refresh-stories").classList.add("is-spinning");
    setTimeout(() => $("#btn-refresh-stories").classList.remove("is-spinning"), 450);
    loadStories();
  });

  async function loadStories() {
    try {
      const params = new URLSearchParams();
      if (storyFilter) params.set("emotion", storyFilter);
      params.set("sort", storySort);
      const data = await api("/api/stories?" + params.toString());
      if (!data.ok) return;
      const feed = $("#story-feed");
      feed.textContent = "";
      for (const post of data.posts) {
        feed.append(buildCard(post, data.now));
      }
      $("#story-empty").hidden = data.posts.length > 0;
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

  function resetScream() {
    if (window.screamCleanup) window.screamCleanup();
    screamOrb.classList.remove("is-recording", "is-ready");
    screamOrb.disabled = false;
    screamIcon.textContent = "🎙️";
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
        screamIcon.textContent = "⏹";
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
        screamIcon.textContent = "🔇";
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
  render();
  checkMyHugs();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
})();
