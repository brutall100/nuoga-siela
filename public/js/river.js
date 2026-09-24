// Gyvas fonas „Paleisk upe": du neryškūs švytėjimai (žibinto ir vandens),
// vandens ratilai, kurie plečiasi ir išblunka, ir kylantys žibintų žiburėliai.
// Kiekviena dalelė gauna atsitiktinį dydį, greitį, vėlavimą ir nukrypimą,
// kad judėjimas atrodytų natūralus. Animuojama tik transform/opacity (CSS),
// JS tik sukuria elementus vieną kartą. Spalvos — iš CSS kintamųjų.
// prefers-reduced-motion: dalelių nekuriam, lieka statiški švytėjimai.

(function () {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SMALL = matchMedia("(max-width: 640px)").matches;

  const rand = (min, max) => min + Math.random() * (max - min);

  function el(className) {
    const node = document.createElement("div");
    node.className = className;
    return node;
  }

  function build() {
    const river = el("river");
    river.setAttribute("aria-hidden", "true");
    river.append(el("river-glow river-glow-ember"), el("river-glow river-glow-water"));

    if (!REDUCED) {
      // Telefone — perpus mažiau dalelių.
      const rings = SMALL ? 4 : 8;
      const lanterns = SMALL ? 9 : 18;

      for (let i = 0; i < rings; i++) {
        const ring = el("ripple-ring");
        const dur = rand(8, 14);
        ring.style.left = rand(5, 95) + "%";
        ring.style.top = rand(40, 96) + "%";
        ring.style.setProperty("--size", rand(140, 380).toFixed(0) + "px");
        ring.style.setProperty("--dur", dur.toFixed(1) + "s");
        ring.style.setProperty("--delay", (-rand(0, dur)).toFixed(1) + "s");
        river.append(ring);
      }

      for (let i = 0; i < lanterns; i++) {
        const lantern = el("lantern");
        const light = document.createElement("span");
        light.className = "lantern-light";
        const dur = rand(18, 34);
        lantern.style.left = rand(2, 98) + "%";
        lantern.style.setProperty("--dur", dur.toFixed(1) + "s");
        lantern.style.setProperty("--delay", (-rand(0, dur)).toFixed(1) + "s");
        lantern.style.setProperty("--alpha", rand(0.45, 0.95).toFixed(2));
        light.style.setProperty("--size", rand(3, 7).toFixed(1) + "px");
        light.style.setProperty("--drift", rand(8, 28).toFixed(0) + "px");
        light.style.setProperty("--sway-dur", rand(4, 9).toFixed(1) + "s");
        lantern.append(light);
        river.append(lantern);
      }
    }

    document.body.prepend(river);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
