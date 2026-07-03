// Deginimo ritualas: tekstas virsta žarijomis, kurios kyla ir užgęsta.
// Canvas, jokių bibliotekų. Su prefers-reduced-motion — tik švelnus išblukimas.

(function () {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // burnText(textarea, canvas) -> Promise, kuris išsipildo animacijai pasibaigus.
  window.burnText = function (textarea, canvas) {
    return new Promise((resolve) => {
      if (REDUCED) {
        textarea.style.transition = "opacity 0.5s";
        textarea.style.opacity = "0";
        setTimeout(() => {
          textarea.value = "";
          textarea.style.opacity = "1";
          resolve();
        }, 550);
        return;
      }

      const rect = textarea.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      const W = rect.width;
      const H = rect.height;

      // Žarijos gimsta ten, kur maždaug buvo teksto eilutės.
      const lines = Math.max(textarea.value.split("\n").length, 3);
      const particles = [];
      const count = Math.min(90 + textarea.value.length, 260);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: 18 + Math.random() * (W - 36),
          y: 20 + Math.random() * Math.min(lines * 28, H - 40),
          vx: (Math.random() - 0.5) * 0.6,
          vy: -(0.6 + Math.random() * 1.8),
          r: 1 + Math.random() * 2.6,
          life: 1,
          decay: 0.008 + Math.random() * 0.014,
          hue: 25 + Math.random() * 25, // gintaras -> oranžinė
        });
      }

      // Tekstas blunka, kol dega žarijos.
      textarea.style.transition = "opacity 1.1s ease";
      textarea.style.opacity = "0";

      const start = performance.now();

      function frame(now) {
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, W, H);

        // Šiltas švytėjimas iš apačios pirmą sekundę.
        const glow = Math.max(0, 1 - t / 1.2);
        if (glow > 0) {
          const grad = ctx.createRadialGradient(W / 2, H * 0.7, 10, W / 2, H * 0.7, W * 0.7);
          grad.addColorStop(0, `rgba(245, 158, 11, ${0.16 * glow})`);
          grad.addColorStop(1, "rgba(245, 158, 11, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
        }

        let alive = 0;
        for (const p of particles) {
          if (p.life <= 0) continue;
          alive++;
          p.x += p.vx + Math.sin(t * 3 + p.y * 0.05) * 0.3;
          p.y += p.vy;
          p.vy -= 0.01;
          p.life -= p.decay;
          const a = Math.max(p.life, 0);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 95%, ${45 + a * 20}%, ${a})`;
          ctx.shadowColor = `hsla(${p.hue}, 95%, 55%, ${a * 0.8})`;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        if (alive > 0 && t < 4) {
          requestAnimationFrame(frame);
        } else {
          ctx.clearRect(0, 0, W, H);
          textarea.value = "";
          textarea.style.opacity = "1";
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  };
})();
