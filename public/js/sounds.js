// Raminantys garsai (upė, lietus, laužas) rašant ir kvėpuojant. Failai —
// /sounds/{vardas}.mp3, groja per Web Audio: kilpa be tarpo ir švelnus
// įsijungimas/išsijungimas (iOS neleidžia keisti <audio> garsumo).
// Eksportai: window.ambient.toggle(name) → Promise<vardas | null>, .stop(), .current.

(function () {
  "use strict";

  const SOUNDS = ["upe", "lietus", "lauzas"];
  const VOLUME = 0.6;
  const FADE_IN = 1.5;
  const FADE_OUT = 0.8;

  let ctx = null;
  let playing = null; // { name, source, gain }
  let requested = null; // paskutinis paspaustas garsas (lenktynėms tarp krovimų)
  const buffers = new Map();

  async function loadBuffer(name) {
    if (buffers.has(name)) return buffers.get(name);
    const res = await fetch("/sounds/" + name + ".mp3");
    if (!res.ok) throw new Error("garsas nerastas");
    const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
    buffers.set(name, buffer);
    return buffer;
  }

  function fadeOut(p) {
    const t = ctx.currentTime;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setValueAtTime(p.gain.gain.value, t);
    p.gain.gain.linearRampToValueAtTime(0, t + FADE_OUT);
    p.source.stop(t + FADE_OUT);
  }

  function stop() {
    requested = null;
    if (!playing) return;
    fadeOut(playing);
    playing = null;
  }

  async function play(name) {
    // AudioContext kuriamas/pažadinamas sinchroniškai paspaudimo metu — kitaip
    // iOS/Chrome jį laiko „be vartotojo gesto" ir nutildo.
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    requested = name;
    const buffer = await loadBuffer(name);
    if (requested !== name) return; // kol krovėsi, paspaustas kitas ar išjungta
    if (playing) fadeOut(playing);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE_IN);
    source.connect(gain).connect(ctx.destination);
    source.start();
    playing = { name, source, gain };
  }

  async function toggle(name) {
    if (!SOUNDS.includes(name)) return playing ? playing.name : null;
    if (playing && playing.name === name) {
      stop();
      return null;
    }
    try {
      await play(name);
    } catch (err) {
      if (requested === name) requested = null;
      throw err;
    }
    return playing ? playing.name : null;
  }

  // Uždarius puslapį — tyla.
  addEventListener("pagehide", stop);

  window.ambient = {
    toggle,
    stop,
    get current() {
      return playing ? playing.name : null;
    },
  };
})();
