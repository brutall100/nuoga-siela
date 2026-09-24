// Mikro-sąveikos: bangelė (ripple) mygtukuose, kortelių atsiradimas slenkant
// ir skaičių „suskaičiavimas". Viskas gerbia prefers-reduced-motion.
// Eksportai: window.ui.reveal(el), window.ui.countUp(el, to, format?).

(function () {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Bangelė mygtukuose — kaip ratilas vandenyje ----------

  document.addEventListener("pointerdown", (e) => {
    if (REDUCED) return;
    const btn = e.target.closest(".btn");
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const wave = document.createElement("span");
    wave.className = "btn-wave";
    wave.style.width = wave.style.height = size + "px";
    wave.style.left = e.clientX - rect.left - size / 2 + "px";
    wave.style.top = e.clientY - rect.top - size / 2 + "px";
    btn.append(wave);
    wave.addEventListener("animationend", () => wave.remove());
  });

  // ---------- Atsiradimas slenkant ----------

  const observer = "IntersectionObserver" in window && !REDUCED
    ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px" })
    : null;

  function reveal(el) {
    if (!observer) return;
    el.classList.add("reveal");
    observer.observe(el);
  }

  // ---------- Skaičiai suskaičiuoja ----------

  function countUp(el, to, format) {
    const render = format || ((n) => String(n));
    if (REDUCED || to <= 0) {
      el.textContent = render(to);
      return;
    }
    const duration = Math.min(1200, 400 + to * 40);
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = render(Math.round(to * eased));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.ui = { reveal, countUp };
})();
