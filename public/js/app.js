// Nuoga Siela — pagrindinis kliento kodas: hash routing'as, rašymas,
// srautas, istorijos, SOS, nustatymai. Tekstas visada per textContent — niekada innerHTML.

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

  const SCREENS = ["rasyti", "srautas", "istorijos", "sos", "sauksmas", "nustatymai"];

  let prevScreen = null;

  function currentScreen() {
    const name = location.pathname.replace(/^\//, "");
    return SCREENS.includes(name) ? name : "rasyti";
  }

  function navigate(path) {
    history.pushState(null, "", path);
    render();
  }

  function render() {
    const active = currentScreen();
    for (const name of SCREENS) {
      $("#screen-" + name).hidden = name !== active;
    }
    // Tab'ai sekami tik tiems ekranams, kurie turi tab'ą; kiti (sos, sauksmas)
    // pasiekiami per nuorodas, tad meniu paryškinimo nekeičia.
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.screen === active);
    });
    if (active === "srautas") loadFeed();
    if (active === "istorijos") loadStories();
    if (active === "rasyti") loadSocialProof();
    if (active !== "sos") {
      window.breatheStop($("#breathe-circle"), $("#breathe-label"), $("#btn-breathe"));
    }
    // Palikus Šauksmo kambarį — viskas iš atminties dingsta.
    if (prevScreen === "sauksmas" && active !== "sauksmas") resetScream();
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

  // ---------- Rašymo ekranas ----------

  const input = $("#write-input");
  const charCount = $("#char-count");
  const btnBurn = $("#btn-burn");
  const btnRelease = $("#btn-release");
  let selectedEmotion = null;
  let selectedKind = "srautas";

  function updateCounter() {
    charCount.textContent = input.value.length + " / " + MAX_LEN[selectedKind];
  }

  input.addEventListener("input", updateCounter);

  $("#emotion-picker").addEventListener("click", (e) => {
    const btn = e.target.closest(".emo");
    if (!btn) return;
    const emotion = btn.dataset.emotion;
    selectedEmotion = selectedEmotion === emotion ? null : emotion;
    document.querySelectorAll(".emo").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.emotion === selectedEmotion);
    });
  });

  $("#lifespan-picker").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    selectedKind = chip.dataset.kind;
    document.querySelectorAll("#lifespan-picker .chip").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.kind === selectedKind);
    });
    input.maxLength = MAX_LEN[selectedKind];
    input.placeholder = selectedKind === "istorija"
      ? window.t("write.storyPlaceholder")
      : window.t("write.placeholder");
    updateCounter();
  });

  let busy = false;

  btnBurn.addEventListener("click", async () => {
    if (busy || !input.value.trim()) return;
    busy = true;
    btnBurn.disabled = btnRelease.disabled = true;
    await window.burnText(input, $("#burn-canvas"));
    updateCounter();
    toast(window.t("toast.burned"), "calm");
    busy = false;
    btnBurn.disabled = btnRelease.disabled = false;
  });

  btnRelease.addEventListener("click", async () => {
    if (busy) return;
    const text = input.value.trim();
    if (!text) return;
    if (!selectedEmotion) {
      toast(window.t("toast.pickEmotion"));
      return;
    }
    busy = true;
    btnBurn.disabled = btnRelease.disabled = true;
    try {
      const data = await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ text, emotion: selectedEmotion, kind: selectedKind }),
      });
      if (data.ok) {
        input.value = "";
        updateCounter();
        rememberMine();
        if (data.sos) {
          $("#sos-sheet").hidden = false;
        } else if (selectedKind === "istorija") {
          toast(window.t("toast.storyReleased"), "calm");
        } else {
          toast(window.t("toast.released"), "calm");
        }
        navigate(selectedKind === "istorija" ? "/istorijos" : "/srautas");
      } else {
        toast(data.reason || window.t("toast.releaseFail"), "warn");
      }
    } catch {
      toast(window.t("toast.noConnection"), "warn");
    }
    busy = false;
    btnBurn.disabled = btnRelease.disabled = false;
  });

  $("#sos-sheet-close").addEventListener("click", () => {
    $("#sos-sheet").hidden = true;
  });

  // Socialinis įrodymas: rodome tik kai erdvė gyva (>=5 tekstų šiandien).
  async function loadSocialProof() {
    try {
      const data = await api("/api/stats");
      const el = $("#social-proof");
      if (data.ok && data.postsToday >= 5) {
        el.textContent = window.t("proof.line", { p: data.postsToday, h: data.hugsToday });
        el.hidden = false;
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
    hugCount.textContent = post.hugs > 0 ? String(post.hugs) : "";
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
    report.title = "Pranešti";
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
    input.placeholder = selectedKind === "istorija"
      ? window.t("write.storyPlaceholder")
      : window.t("write.placeholder");
    const active = currentScreen();
    if (active === "srautas") loadFeed();
    if (active === "istorijos") loadStories();
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
