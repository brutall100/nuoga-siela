// Emocijų kalendorius. Asmeninė dalis gyvena TIK šiame įrenginyje (localStorage
// "ns_mood"): saugoma tik diena ir emocija, niekada tekstas, ir niekur
// nesiunčiama. Bendra savaitės nuotaika imama iš /api/mood — ten tik suminiai
// skaičiai be jokio ryšio su žmogumi.
// Eksportai: window.mood.record(emotion), window.mood.render(), window.mood.clear().

(function () {
  "use strict";

  const KEY = "ns_mood";
  const KEEP_DAYS = 400;
  const EMOTIONS = ["pyktis", "liudesys", "nerimas", "kalte", "vienatve", "viltis"];
  const FACES = {
    pyktis: "😠",
    liudesys: "😢",
    nerimas: "😰",
    kalte: "😔",
    vienatve: "😶",
    viltis: "🌱",
  };
  // Bendrą nuotaiką rodome tik kai savaitė gyva — kaip ir socialinis įrodymas.
  const MIN_SHARED_TOTAL = 5;
  const MONTHS_BACK = 12;

  const $ = (sel) => document.querySelector(sel);

  // Vietinė (ne UTC) diena — kalendorius rodo žmogaus, ne serverio, dienas.
  function dayStr(date) {
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${m}-${d}`;
  }

  function load() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(list) ? list.filter((x) => EMOTIONS.includes(x[1])) : [];
    } catch {
      return [];
    }
  }

  function record(emotion) {
    if (!EMOTIONS.includes(emotion)) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
    const oldest = dayStr(cutoff);
    const list = load().filter((x) => x[0] >= oldest);
    list.push([dayStr(new Date()), emotion]);
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  function countBy(entries) {
    const counts = Object.fromEntries(EMOTIONS.map((e) => [e, 0]));
    for (const [, e] of entries) counts[e]++;
    return counts;
  }

  // Dažniausia emocija; lygiųjų atveju — ta, kuri pažymėta vėliausiai.
  function topEmotion(counts, entries) {
    let best = null;
    for (const e of EMOTIONS) {
      if (counts[e] === 0) continue;
      if (!best || counts[e] > counts[best]) best = e;
      else if (counts[e] === counts[best] && entries) {
        const lastIdx = (x) => entries.findLastIndex((en) => en[1] === x);
        if (lastIdx(e) > lastIdx(best)) best = e;
      }
    }
    return best;
  }

  // ---------- Judantis emoji ----------

  function setFace(el, emotion) {
    el.textContent = FACES[emotion];
    el.dataset.emotion = emotion;
    // Animacija paleidžiama iš naujo kiekvieną kartą atidarius ekraną.
    el.classList.remove("is-alive");
    void el.offsetWidth;
    el.classList.add("is-alive");
  }

  // ---------- Juostelės (kiek kartų kiekviena emocija) ----------

  function renderBars(container, counts) {
    container.textContent = "";
    const max = Math.max(...Object.values(counts));
    const sorted = EMOTIONS.filter((e) => counts[e] > 0).sort((a, b) => counts[b] - counts[a]);
    for (const e of sorted) {
      const row = document.createElement("div");
      row.className = "mood-bar";
      row.dataset.emotion = e;
      const label = document.createElement("span");
      label.className = "mood-bar-label";
      label.textContent = window.t("emo." + e);
      const track = document.createElement("span");
      track.className = "mood-bar-track";
      const fill = document.createElement("span");
      fill.className = "mood-bar-fill";
      track.append(fill);
      const n = document.createElement("span");
      n.className = "mood-bar-count";
      n.textContent = String(counts[e]);
      row.append(label, track, n);
      container.append(row);
      // Kitame kadre — kad juostelė „išplauktų" iš 0.
      fill.style.setProperty("--w", "0");
      requestAnimationFrame(() => fill.style.setProperty("--w", String(counts[e] / max)));
    }
  }

  // ---------- Tavo savaitė ----------

  function lastDays(n) {
    const out = [];
    const d = new Date();
    for (let i = 0; i < n; i++) {
      out.push(dayStr(d));
      d.setDate(d.getDate() - 1);
    }
    return out;
  }

  function renderWeek(entries) {
    const week = new Set(lastDays(7));
    const inWeek = entries.filter((x) => week.has(x[0]));
    const counts = countBy(inWeek);
    const top = topEmotion(counts, inWeek);
    const face = $("#mood-week-face");
    const line = $("#mood-week-line");
    face.hidden = !top;
    if (top) {
      setFace(face, top);
      line.textContent = window.t("mood.weekLine", { emo: window.t("emo." + top) });
    } else {
      line.textContent = window.t("mood.weekEmpty");
    }
    renderBars($("#mood-week-bars"), counts);

    // Švelnus tiltas į pagalbą: kelios dienos iš eilės be jokios vilties.
    const markedDays = new Set(inWeek.map((x) => x[0])).size;
    $("#mood-week-sos").hidden = !(markedDays >= 4 && counts.viltis === 0);
  }

  // ---------- Mėnesio kalendorius ----------

  let monthOffset = 0;

  function renderMonth(entries) {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const lang = window.i18n.lang;
    const monthName = new Intl.DateTimeFormat(lang, { month: "long" }).format(first);
    $("#mood-month-title").textContent = monthName.charAt(0).toUpperCase() +
      monthName.slice(1) + " " + first.getFullYear();
    $("#mood-next").disabled = monthOffset >= 0;
    $("#mood-prev").disabled = monthOffset <= -MONTHS_BACK;

    const byDay = new Map();
    for (const x of entries) {
      if (!byDay.has(x[0])) byDay.set(x[0], []);
      byDay.get(x[0]).push(x);
    }

    const grid = $("#mood-grid");
    grid.textContent = "";
    // Savaitė prasideda pirmadieniu (2024-01-01 buvo pirmadienis).
    const weekdayFmt = new Intl.DateTimeFormat(lang, { weekday: "narrow" });
    for (let i = 0; i < 7; i++) {
      const wd = document.createElement("span");
      wd.className = "mood-wd";
      wd.setAttribute("aria-hidden", "true");
      wd.textContent = weekdayFmt.format(new Date(2024, 0, 1 + i));
      grid.append(wd);
    }
    const lead = (first.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) {
      const pad = document.createElement("span");
      pad.className = "mood-day is-pad";
      grid.append(pad);
    }

    const today = dayStr(now);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const dateFmt = new Intl.DateTimeFormat(lang, { month: "long", day: "numeric" });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      const key = dayStr(date);
      const cell = document.createElement("span");
      cell.className = "mood-day" + (key === today ? " is-today" : "");
      const num = document.createElement("span");
      num.className = "mood-day-num";
      num.textContent = String(d);
      cell.append(num);
      const dayEntries = byDay.get(key);
      let label = dateFmt.format(date);
      if (dayEntries) {
        const counts = countBy(dayEntries);
        const top = topEmotion(counts, dayEntries);
        cell.dataset.emotion = top;
        const emoji = document.createElement("span");
        emoji.className = "mood-day-face";
        emoji.setAttribute("aria-hidden", "true");
        emoji.textContent = FACES[top];
        cell.append(emoji);
        label += ": " + EMOTIONS.filter((e) => counts[e] > 0)
          .map((e) => window.t("emo." + e) + (counts[e] > 1 ? " ×" + counts[e] : ""))
          .join(", ");
        cell.title = label;
      }
      cell.setAttribute("role", "img");
      cell.setAttribute("aria-label", label);
      grid.append(cell);
    }
  }

  // ---------- Kaip jaučiasi visi ----------

  async function renderShared() {
    const box = $("#mood-shared");
    try {
      const res = await fetch("/api/mood");
      const data = await res.json();
      if (!data.ok || data.total < MIN_SHARED_TOTAL) {
        box.hidden = true;
        return;
      }
      const top = topEmotion(data.counts);
      box.hidden = false;
      setFace($("#mood-shared-face"), top);
      $("#mood-shared-line").textContent = window.t("mood.sharedLine", {
        emo: window.t("emo." + top),
      });
      $("#mood-shared-note").textContent = window.t("mood.sharedNote", { n: data.total });
      renderBars($("#mood-shared-bars"), data.counts);
    } catch {
      box.hidden = true; // tik papildoma informacija — tyliai
    }
  }

  function render() {
    const entries = load();
    renderWeek(entries);
    renderMonth(entries);
    renderShared();
  }

  $("#mood-prev").addEventListener("click", () => {
    monthOffset = Math.max(monthOffset - 1, -MONTHS_BACK);
    renderMonth(load());
  });
  $("#mood-next").addEventListener("click", () => {
    monthOffset = Math.min(monthOffset + 1, 0);
    renderMonth(load());
  });

  window.mood = { record, render, clear };
})();
