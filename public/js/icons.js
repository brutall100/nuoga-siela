// Ikonos: emocijų simboliai („emocijos kaip kosmoso reiškiniai") ir linijinės ikonos.
// Vienintelis emocijų simbolių šaltinis kliento pusėje — rašant, sraute, istorijose ir
// kalendoriuje. main.ts SSR istorijos puslapis turi tų pačių ramių simbolių kopiją
// (EMOTION_ICONS) — keičiant vieną, keisk abu.
// Spalva — currentColor (emocijos spalvą duoda .emo-icon[data-emo] main.css), o
// užtemimo/horizonto „šešėlis" — klasė .emo-mask (fono spalvos kintamasis).
// Pažymėta emocija „gyva" (SMIL animacija SVG viduje); su prefers-reduced-motion —
// visada rami versija.
// Eksportai: window.icons.emo(kind, live) → <svg>, window.icons.line(name) → <svg>,
// window.icons.fill(root) — užpildo [data-emo-icon] vietas statiniame HTML,
// window.icons.setLive(el, live), window.icons.playOnce(el) — vienas gyvas ciklas.

(function () {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const EMOTIONS = ["pyktis", "liudesys", "nerimas", "kalte", "vienatve", "viltis"];

  // ---------- Emocijų simboliai (24×24) ----------

  const C = 'stroke="currentColor"';
  const F = 'fill="currentColor"';

  const EMO = {
    // Dvi planetos susiduria.
    pyktis: {
      attrs: 'stroke-width="1.6"',
      calm: `<circle cx="8" cy="14" r="5" ${F} fill-opacity="0.18"/>
<circle cx="15" cy="9.5" r="3.5" ${F} fill-opacity="0.18"/>
<path d="M10.6 8.8L9.7 7.4M13.8 13.8L14.7 15.2"/>
<circle cx="7.6" cy="7.6" r="0.75" ${F} stroke="none"/>
<circle cx="16.6" cy="14.4" r="0.75" ${F} stroke="none"/>`,
      live: `<circle cx="8" cy="14" r="5" ${F} fill-opacity="0.18">
<animateTransform attributeName="transform" type="translate" values="-1.8 1.2;0 0;-0.6 0.4;-1.8 1.2" keyTimes="0;0.45;0.58;1" dur="1.8s" repeatCount="indefinite"/>
</circle>
<circle cx="15" cy="9.5" r="3.5" ${F} fill-opacity="0.18">
<animateTransform attributeName="transform" type="translate" values="1.6 -1;0 0;0.5 -0.3;1.6 -1" keyTimes="0;0.45;0.58;1" dur="1.8s" repeatCount="indefinite"/>
</circle>
<g opacity="0">
<path d="M10.6 8.8L9.7 7.4M13.8 13.8L14.7 15.2"/>
<circle cx="7.6" cy="7.6" r="0.75" ${F} stroke="none"/>
<circle cx="16.6" cy="14.4" r="0.75" ${F} stroke="none"/>
<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.43;0.47;0.8;1" dur="1.8s" repeatCount="indefinite"/>
</g>`,
    },
    // Krentanti žvaigždė.
    liudesys: {
      attrs: 'stroke-width="1.6"',
      calm: `<path d="M19.6 4.4L16 8" stroke-opacity="0.22"/>
<path d="M16 8L12.2 11.8" stroke-opacity="0.5"/>
<path d="M12.2 11.8L9 15" stroke-opacity="0.85"/>
<circle cx="7.4" cy="16.6" r="3.6" ${F} fill-opacity="0.16" stroke="none"/>
<circle cx="7.4" cy="16.6" r="2" ${F} stroke="none"/>
<circle cx="18" cy="16.5" r="0.7" ${F} fill-opacity="0.55" stroke="none"/>
<circle cx="5.2" cy="6" r="0.6" ${F} fill-opacity="0.45" stroke="none"/>`,
      live: `<circle cx="18" cy="16.5" r="0.7" ${F} fill-opacity="0.55" stroke="none"/>
<circle cx="5.2" cy="6" r="0.6" ${F} fill-opacity="0.45" stroke="none"/>
<g>
<path d="M19.6 4.4L16 8" stroke-opacity="0.22"/>
<path d="M16 8L12.2 11.8" stroke-opacity="0.5"/>
<path d="M12.2 11.8L9 15" stroke-opacity="0.85"/>
<circle cx="7.4" cy="16.6" r="3.6" ${F} fill-opacity="0.16" stroke="none"/>
<circle cx="7.4" cy="16.6" r="2" ${F} stroke="none"/>
<animateTransform attributeName="transform" type="translate" values="7 -7;0 0;0 0" keyTimes="0;0.65;1" dur="2.8s" repeatCount="indefinite"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.65;1" dur="2.8s" repeatCount="indefinite"/>
</g>`,
    },
    // Orbitos, kurios nerimsta.
    nerimas: {
      attrs: 'stroke-width="1.4"',
      calm: `<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(-28 12 12)"/>
<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(32 12 12)" stroke-opacity="0.5"/>
<circle cx="12" cy="12" r="2.6" ${F} stroke="none"/>
<circle cx="19.3" cy="6.7" r="1.3" ${F} stroke="none"/>`,
      live: `<g>
<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(-28 12 12)"/>
<circle cx="19.3" cy="6.7" r="1.3" ${F} stroke="none"/>
<animateTransform attributeName="transform" type="rotate" values="0 12 12;6 12 12;-5 12 12;3 12 12;0 12 12" dur="0.9s" repeatCount="indefinite"/>
</g>
<g>
<ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(32 12 12)" stroke-opacity="0.5"/>
<animateTransform attributeName="transform" type="rotate" values="0 12 12;-5 12 12;4 12 12;-2 12 12;0 12 12" dur="1.15s" repeatCount="indefinite"/>
</g>
<circle cx="12" cy="12" r="2.6" ${F} stroke="none">
<animateTransform attributeName="transform" type="translate" values="0 0;0.5 -0.3;-0.4 0.3;0.3 0.35;0 0" dur="0.5s" repeatCount="indefinite"/>
</circle>`,
    },
    // Užtemimas — šešėlis dengia šviesą.
    kalte: {
      attrs: 'stroke-width="1.4"',
      calm: `<circle cx="11" cy="12.5" r="8.4" stroke-opacity="0.3" stroke-dasharray="1.5 2.6"/>
<circle cx="11" cy="12.5" r="6" ${F} stroke="none"/>
<circle class="emo-mask" cx="13.7" cy="11" r="5.6" stroke-opacity="0.5"/>`,
      live: `<circle cx="11" cy="12.5" r="8.4" stroke-opacity="0.3" stroke-dasharray="1.5 2.6"/>
<circle cx="11" cy="12.5" r="6" ${F} stroke="none"/>
<circle class="emo-mask" cx="13.7" cy="11" r="5.6" stroke-opacity="0.5">
<animateTransform attributeName="transform" type="translate" values="5 -2.8;0 0;0 0;5 -2.8" keyTimes="0;0.35;0.75;1" dur="5s" repeatCount="indefinite"/>
</circle>`,
    },
    // Viena planeta tuščioje erdvėje.
    vienatve: {
      attrs: 'stroke-width="1.4"',
      calm: `<circle cx="8.5" cy="15.5" r="3.4" ${F} fill-opacity="0.22"/>
<ellipse cx="8.5" cy="15.5" rx="6" ry="1.8" transform="rotate(-16 8.5 15.5)"/>
<path d="M18.5 3.6V7.4M16.6 5.5H20.4" stroke-width="1.2"/>`,
      live: `<g>
<circle cx="8.5" cy="15.5" r="3.4" ${F} fill-opacity="0.22"/>
<ellipse cx="8.5" cy="15.5" rx="6" ry="1.8" transform="rotate(-16 8.5 15.5)"/>
<animateTransform attributeName="transform" type="translate" values="0 0;-0.6 0.4;0 0" dur="7s" repeatCount="indefinite"/>
</g>
<g>
<path d="M18.5 3.6V7.4M16.6 5.5H20.4" stroke-width="1.2"/>
<animate attributeName="opacity" values="0.2;1;0.2" dur="3.4s" repeatCount="indefinite"/>
</g>`,
    },
    // Žvaigždė kyla virš horizonto.
    viltis: {
      attrs: 'stroke-width="1.5"',
      calm: `<circle cx="12" cy="11" r="2.6" ${F} stroke="none"/>
<path d="M12 4.6V6.2M7.6 6.6L8.7 7.7M16.4 6.6L15.3 7.7M5.6 11H7.2M16.8 11H18.4" stroke-opacity="0.85"/>
<path class="emo-mask" d="M1.5 21Q12 14.6 22.5 21V24H1.5Z" stroke="none"/>
<path d="M1.5 21Q12 14.6 22.5 21V24H1.5Z" ${F} fill-opacity="0.14" stroke="none"/>
<path d="M1.5 21Q12 14.6 22.5 21"/>`,
      live: `<g>
<circle cx="12" cy="11" r="2.6" ${F} stroke="none"/>
<g opacity="0">
<path d="M12 4.6V6.2M7.6 6.6L8.7 7.7M16.4 6.6L15.3 7.7M5.6 11H7.2M16.8 11H18.4" stroke-opacity="0.85"/>
<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.45;0.62;0.88;1" dur="3.6s" repeatCount="indefinite"/>
</g>
<animateTransform attributeName="transform" type="translate" values="0 6;0 0;0 0" keyTimes="0;0.5;1" dur="3.6s" repeatCount="indefinite"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.88;1" dur="3.6s" repeatCount="indefinite"/>
</g>
<path class="emo-mask" d="M1.5 21Q12 14.6 22.5 21V24H1.5Z" stroke="none"/>
<path d="M1.5 21Q12 14.6 22.5 21V24H1.5Z" ${F} fill-opacity="0.14" stroke="none"/>
<path d="M1.5 21Q12 14.6 22.5 21"/>`,
    },
  };

  // ---------- Linijinės ikonos (24×24, stroke) ----------

  const LINE = {
    heart:
      '<path d="M12 19.5s-7.2-4.4-7.2-9.6a4 4 0 017.2-2.4 4 4 0 017.2 2.4c0 5.2-7.2 9.6-7.2 9.6z"/>',
    "heart-filled":
      `<path ${F} d="M12 19.5s-7.2-4.4-7.2-9.6a4 4 0 017.2-2.4 4 4 0 017.2 2.4c0 5.2-7.2 9.6-7.2 9.6z"/>`,
    link: '<path d="M10 14a3.8 3.8 0 005.4 0l3-3a3.8 3.8 0 00-5.4-5.4l-1 1"/>' +
      '<path d="M14 10a3.8 3.8 0 00-5.4 0l-3 3a3.8 3.8 0 005.4 5.4l1-1"/>',
    flag: '<path d="M5.5 20.5V4.5M5.5 4.5h11l-2 4 2 4h-11"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/>' +
      '<path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v2.5"/>',
    stop: `<rect x="7" y="7" width="10" height="10" rx="2" ${F}/>`,
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 5-5.2"/>',
    book: '<path d="M12 6.8C10.4 5.5 7.9 4.8 3.8 4.8v12.8c4.1 0 6.6.7 8.2 2 1.6-1.3 4.1-2 ' +
      '8.2-2V4.8c-4.1 0-6.6.7-8.2 2z"/><path d="M12 6.8v12.8"/>',
  };

  // Vienas kartas išparsinti, toliau — tik kopijos (be innerHTML, be vartotojo teksto).
  const cache = new Map();
  function parse(key, attrs, body) {
    if (!cache.has(key)) {
      const src = `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
        `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}>${body}</svg>`;
      const doc = new DOMParser().parseFromString(src, "image/svg+xml");
      cache.set(key, doc.documentElement);
    }
    return document.importNode(cache.get(key), true);
  }

  function emo(kind, live) {
    const def = EMO[kind];
    if (!def) return null;
    const animate = live && !REDUCED;
    const svg = parse(kind + (animate ? ":live" : ""), def.attrs, animate ? def.live : def.calm);
    svg.classList.add("emo-svg");
    return svg;
  }

  function line(name) {
    const svg = parse("line:" + name, 'stroke-width="1.8"', LINE[name] ?? "");
    svg.classList.add("line-svg");
    return svg;
  }

  // Statiniame HTML: <span class="emo-icon" data-emo-icon="pyktis"></span>.
  // data-emo — spalvai (main.css), data-live="1" — animuotas.
  function fill(root) {
    (root || document).querySelectorAll("[data-emo-icon]").forEach((el) => {
      const kind = el.dataset.emoIcon;
      el.dataset.emo = kind;
      el.replaceChildren(emo(kind, el.dataset.live === "1"));
    });
  }

  // Ta pati vieta, kita būsena (pvz. pažymėta plytelė atgyja).
  function setLive(el, live) {
    const want = live ? "1" : "0";
    if (el.dataset.live === want && el.firstChild) return;
    el.dataset.live = want;
    el.replaceChildren(emo(el.dataset.emoIcon || el.dataset.emo, live));
  }

  // Vienas „gyvas" ciklas, tada vėl ramus (pvz. atidarius rašymo ekraną). Laikas parinktas
  // taip, kad animacija baigtųsi ramios versijos padėtyje — be šuolio keičiant SVG.
  const ONCE_MS = {
    pyktis: 850,
    liudesys: 1900,
    nerimas: 1800,
    kalte: 1800,
    vienatve: 1700,
    viltis: 2800,
  };
  const onceTimers = new WeakMap();

  function playOnce(el) {
    const kind = el.dataset.emoIcon || el.dataset.emo;
    if (REDUCED || el.dataset.live === "1" || !EMO[kind]) return;
    const svg = emo(kind, true);
    el.replaceChildren(svg);
    svg.setCurrentTime?.(0);
    clearTimeout(onceTimers.get(el));
    onceTimers.set(
      el,
      setTimeout(() => {
        // Jei per tą laiką emocija pažymėta — ji lieka gyva.
        if (el.dataset.live !== "1") el.replaceChildren(emo(kind, false));
      }, ONCE_MS[kind]),
    );
  }

  // Naujas elementas JS kodui (kortelėms, kalendoriui).
  function emoSpan(kind, live) {
    const span = document.createElement("span");
    span.className = "emo-icon";
    span.dataset.emo = kind;
    span.setAttribute("aria-hidden", "true");
    const svg = emo(kind, live);
    if (svg) span.append(svg);
    return span;
  }

  window.icons = { EMOTIONS, emo, emoSpan, line, fill, setLive, playOnce };
  fill(document);
})();
