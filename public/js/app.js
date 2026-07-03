// Nuoga Siela — pagrindinis kliento kodas: hash routing'as, rašymas,
// srautas, SOS, nustatymai. Tekstas visada per textContent — niekada innerHTML.

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

  const SCREENS = ["rasyti", "srautas", "sos", "nustatymai"];

  function currentScreen() {
    const name = location.hash.replace(/^#\//, "");
    return SCREENS.includes(name) ? name : "rasyti";
  }

  function render() {
    const active = currentScreen();
    for (const name of SCREENS) {
      $("#screen-" + name).hidden = name !== active;
    }
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.screen === active);
    });
    if (active === "srautas") loadFeed();
    if (active !== "sos") {
      window.breatheStop($("#breathe-circle"), $("#breathe-label"), $("#btn-breathe"));
    }
  }

  addEventListener("hashchange", render);

  // ---------- Rašymo ekranas ----------

  const input = $("#write-input");
  const charCount = $("#char-count");
  const btnBurn = $("#btn-burn");
  const btnRelease = $("#btn-release");
  let selectedEmotion = null;

  input.addEventListener("input", () => {
    charCount.textContent = input.value.length + " / 1000";
  });

  $("#emotion-picker").addEventListener("click", (e) => {
    const btn = e.target.closest(".emo");
    if (!btn) return;
    const emotion = btn.dataset.emotion;
    selectedEmotion = selectedEmotion === emotion ? null : emotion;
    document.querySelectorAll(".emo").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.emotion === selectedEmotion);
    });
  });

  let busy = false;

  btnBurn.addEventListener("click", async () => {
    if (busy || !input.value.trim()) return;
    busy = true;
    btnBurn.disabled = btnRelease.disabled = true;
    await window.burnText(input, $("#burn-canvas"));
    charCount.textContent = "0 / 1000";
    toast("Paleista. Niekas to nematė.", "calm");
    busy = false;
    btnBurn.disabled = btnRelease.disabled = false;
  });

  btnRelease.addEventListener("click", async () => {
    if (busy) return;
    const text = input.value.trim();
    if (!text) return;
    if (!selectedEmotion) {
      toast("Pasirink, kaip jautiesi — tai padės kitiems tave rasti.");
      return;
    }
    busy = true;
    btnBurn.disabled = btnRelease.disabled = true;
    try {
      const data = await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ text, emotion: selectedEmotion }),
      });
      if (data.ok) {
        input.value = "";
        charCount.textContent = "0 / 1000";
        if (data.sos) {
          $("#sos-sheet").hidden = false;
        } else {
          toast("Paleista į srautą. Po 24 val. išnyks visam laikui.", "calm");
        }
        location.hash = "#/srautas";
      } else {
        toast(data.reason || "Nepavyko paleisti.", "warn");
      }
    } catch {
      toast("Nėra ryšio. Tekstas liko tik pas tave.", "warn");
    }
    busy = false;
    btnBurn.disabled = btnRelease.disabled = false;
  });

  $("#sos-sheet-close").addEventListener("click", () => {
    $("#sos-sheet").hidden = true;
  });

  // ---------- Srautas ----------

  let feedFilter = "";
  let feedTicker = null;

  $("#feed-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    feedFilter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.filter === feedFilter);
    });
    loadFeed();
  });

  $("#btn-refresh").addEventListener("click", (e) => {
    e.currentTarget.classList.add("is-spinning");
    setTimeout(() => $("#btn-refresh").classList.remove("is-spinning"), 450);
    loadFeed();
  });

  function formatTimeLeft(ms) {
    if (ms <= 0) return "išnyksta…";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `liko ${h} val. ${m} min.` : `liko ${m} min.`;
  }

  function buildCard(post, now) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.emotion = post.emotion;
    card.dataset.expires = post.expiresAt;

    const text = document.createElement("p");
    text.className = "card-text";
    text.textContent = post.text;

    const foot = document.createElement("div");
    foot.className = "card-foot";

    const hug = document.createElement("button");
    hug.type = "button";
    hug.className = "hug" + (hugged.has(post.id) ? " is-hugged" : "");
    const hugIcon = document.createElement("span");
    hugIcon.textContent = "🤍";
    const hugLabel = document.createElement("span");
    hugLabel.textContent = "Suprantu tave";
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

    const timeLeft = document.createElement("span");
    timeLeft.className = "time-left";
    timeLeft.textContent = formatTimeLeft(post.expiresAt - now);

    const report = document.createElement("button");
    report.type = "button";
    report.className = "report";
    report.textContent = "⚑";
    report.title = "Pranešti";
    report.addEventListener("click", async () => {
      if (!confirm("Pranešti apie šį tekstą? Po kelių pranešimų jis dings iš srauto.")) return;
      await api(`/api/posts/${post.id}/report`, { method: "POST" });
      card.remove();
      toast("Ačiū. Pranešimas gautas.");
    });

    right.append(timeLeft, report);
    foot.append(hug, right);

    // "Dagtis" — kiek gyvybės likę (proporcija nuo 24 val.)
    const fuse = document.createElement("div");
    fuse.className = "fuse";
    const total = post.expiresAt - post.createdAt;
    const frac = Math.max(0, Math.min(1, (post.expiresAt - now) / total));
    fuse.style.transform = `scaleX(${frac})`;

    card.append(text, foot, fuse);
    return card;
  }

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
        document.querySelectorAll(".card").forEach((card) => {
          const left = Number(card.dataset.expires) - now;
          const el = card.querySelector(".time-left");
          if (el) el.textContent = formatTimeLeft(left);
          if (left <= 0) card.remove();
        });
      }, 30000);
    } catch {
      toast("Nepavyko pasiekti srauto.", "warn");
    }
  }

  // ---------- SOS ----------

  $("#btn-breathe").addEventListener("click", () => {
    window.breatheStart($("#breathe-circle"), $("#breathe-label"), $("#btn-breathe"));
  });

  // ---------- Nustatymai ----------

  $("#btn-delete-data").addEventListener("click", async () => {
    if (
      !confirm("Ištrinti visus tavo paleistus tekstus ir įrenginio žymę? To atšaukti nebus galima.")
    ) {
      return;
    }
    try {
      const data = await api("/api/mine/delete", { method: "POST" });
      if (data.ok) {
        localStorage.removeItem(DEVICE_KEY);
        localStorage.removeItem(HUGGED_KEY);
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_KEY, deviceId);
        hugged.clear();
        toast(`Ištrinta. Tavo įrenginys dabar — visiškai naujas nepažįstamasis.`, "calm");
      }
    } catch {
      toast("Nepavyko susisiekti su serveriu.", "warn");
    }
  });

  // ---------- Startas ----------

  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
})();
