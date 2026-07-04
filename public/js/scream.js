// Šauksmo kambarys: garso įrašas gyvena TIK naršyklės atmintyje.
// Niekada nesiunčiamas į serverį, niekada neįrašomas į diską.
// Palikus ekraną ar ištrynus — MediaRecorder sustabdomas, blob'as ir
// object URL panaikinami, mikrofono srautas uždaromas. Nieko nelieka.

(function () {
  "use strict";

  let stream = null; // MediaStream iš mikrofono
  let recorder = null; // MediaRecorder
  let chunks = []; // audio dalys atmintyje
  let blobUrl = null; // object URL perklausai
  let audio = null; // Audio elementas
  let state = "idle"; // idle | recording | ready

  function setState(next) {
    state = next;
  }

  window.screamState = () => state;

  // Pilnas išvalymas — iškviečiamas išeinant iš ekrano ir ištrynus.
  window.screamCleanup = function () {
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
    if (audio) {
      audio.pause();
      audio = null;
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    recorder = null;
    chunks = [];
    setState("idle");
  };

  // Pradėti įrašinėti. Grąžina Promise su rezultatu.
  window.screamStart = async function () {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start();
    setState("recording");
  };

  // Sustabdyti įrašinėjimą, paruošti perklausai. Grąžina Promise.
  window.screamStop = function () {
    return new Promise((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve(false);
        return;
      }
      recorder.onstop = () => {
        // Mikrofoną atlaisviname iškart — įrašas jau atmintyje.
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
        }
        if (chunks.length === 0) {
          setState("idle");
          resolve(false);
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        blobUrl = URL.createObjectURL(blob);
        setState("ready");
        resolve(true);
      };
      recorder.stop();
    });
  };

  // Perklausyti tai, kas atmintyje.
  window.screamPlay = function () {
    if (!blobUrl) return;
    if (!audio) audio = new Audio();
    audio.src = blobUrl;
    audio.play().catch(() => {});
  };
})();
