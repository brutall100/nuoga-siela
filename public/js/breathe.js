// Kvėpavimo pratimas: 4 s įkvėpimas, 6 s iškvėpimas.
// Ratas plečiasi ir traukiasi CSS transition'ais, JS tik keičia fazes.

(function () {
  "use strict";

  let running = false;
  let timer = null;

  window.breatheStart = function (circle, label, button) {
    if (running) {
      breatheStop(circle, label, button);
      return;
    }
    running = true;
    button.textContent = "Sustabdyti";

    function inhale() {
      if (!running) return;
      label.textContent = "Įkvėpk…";
      circle.classList.remove("is-breathing-out");
      circle.classList.add("is-breathing-in");
      timer = setTimeout(exhale, 4000);
    }
    function exhale() {
      if (!running) return;
      label.textContent = "Iškvėpk…";
      circle.classList.remove("is-breathing-in");
      circle.classList.add("is-breathing-out");
      timer = setTimeout(inhale, 6000);
    }
    inhale();
  };

  window.breatheStop = function (circle, label, button) {
    running = false;
    clearTimeout(timer);
    circle.classList.remove("is-breathing-in", "is-breathing-out");
    label.textContent = "Pradėti";
    button.textContent = "Pradėti kvėpavimą";
  };
})();
