// Šviesus / tamsus režimas. Įkeliamas <head> viduje SINCHRONIŠKAI (ne defer),
// kad data-theme būtų nustatytas prieš pirmą piešimą — puslapis nesumirga.
// Pasirinkimas saugomas tik šioje naršyklėje (localStorage), serveris jo nemato.

(function () {
  "use strict";

  const KEY = "ns_theme";
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: light)");

  function stored() {
    try {
      const v = localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch {
      return null;
    }
  }

  function apply(theme) {
    root.dataset.theme = theme;
    // Naršyklės juostos spalva seka paletę (--bg reikšmė).
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "light" ? "#EAF4F2" : "#08171C";
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.setAttribute("aria-pressed", String(theme === "light"));
  }

  apply(stored() ?? (media.matches ? "light" : "dark"));

  // Jei vartotojas pats nesirinko — sekam sistemos nustatymą gyvai.
  media.addEventListener("change", (e) => {
    if (!stored()) apply(e.matches ? "light" : "dark");
  });

  window.themeToggle = function () {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* privatus režimas — tiesiog neįsimenam */
    }
    apply(next);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(root.dataset.theme === "light"));
    btn.addEventListener("click", window.themeToggle);
  });
})();
