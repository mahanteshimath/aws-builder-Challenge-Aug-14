/**
 * Renders the postcard front as a layered mid-century travel poster.
 *
 * The model art-directs (archetype, palette, sun height, bird count); this file draws. Letting the
 * model emit raw SVG was tried and produced scattered rectangles — constraining it to parameters
 * over a hand-written renderer looks composed every time, costs nothing, and means no model output
 * is ever interpreted as markup.
 */

const W = 600;
const H = 400;
const HORIZON = 250;

export const ARCHETYPES = ["mountains", "city", "waves", "forest", "arches"];
export const PALETTES = {
  dusk: { sky: ["#ffd9a0", "#e0714a"], sun: "#fff3d6", layers: ["#c2705a", "#9c5350", "#743f47", "#4c2c38", "#2a1a26"] },
  noon: { sky: ["#bfe6f0", "#7fc6d9"], sun: "#fffbe8", layers: ["#8fbf9f", "#6aa287", "#4a806e", "#2f5c55", "#1b3a39"] },
  storm: { sky: ["#9aa7ad", "#5c6b73"], sun: "#e8eef0", layers: ["#6b7a80", "#53636b", "#3d4b53", "#2a353c", "#1a2126"] },
  night: { sky: ["#2b3a63", "#141a30"], sun: "#f2f0d8", layers: ["#3a4a72", "#2e3a5c", "#232c47", "#181f33", "#0e1220"] },
  tricolour: { sky: ["#ff9933", "#fdfaf4"], sun: "#fff7e6", layers: ["#4aa85c", "#31923f", "#1f7a2e", "#136b22", "#0a4715"] },
};

/** Seeded RNG so a postcard id always redraws to the same poster. */
function rngFrom(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const close = (pts) => `M${pts.join(" L")} L${W},${H} L0,${H} Z`;

const SHAPES = {
  mountains(rnd, baseY, amp) {
    const pts = [`0,${baseY}`];
    for (let x = 60; x <= W; x += 60) {
      pts.push(`${x - 30},${(baseY - amp * (0.5 + rnd())).toFixed(1)}`, `${x},${baseY}`);
    }
    return close(pts);
  },

  city(rnd, baseY, amp) {
    const pts = [`0,${baseY}`];
    for (let x = 0; x < W; x += 40) {
      const top = (baseY - amp * (0.25 + rnd() * 0.85)).toFixed(1);
      pts.push(`${x},${top}`, `${x + 40},${top}`);
    }
    pts.push(`${W},${baseY}`);
    return close(pts);
  },

  waves(rnd, baseY, amp) {
    let d = `M0,${baseY}`;
    for (let x = 0; x < W; x += 100) {
      d += ` Q${x + 50},${(baseY - amp * (rnd() - 0.5)).toFixed(1)} ${x + 100},${baseY}`;
    }
    return `${d} L${W},${H} L0,${H} Z`;
  },

  forest(rnd, baseY, amp) {
    const pts = [`0,${baseY}`];
    for (let x = 0; x < W; x += 34) {
      pts.push(`${x + 17},${(baseY - amp * (0.4 + rnd() * 0.7)).toFixed(1)}`, `${x + 34},${baseY}`);
    }
    return close(pts);
  },

  arches(rnd, baseY, amp) {
    let d = `M0,${baseY}`;
    for (let x = 0; x < W; x += 75) {
      const r = 37.5;
      d += ` L${x},${baseY} A${r},${(amp * (0.5 + rnd() * 0.6)).toFixed(1)} 0 0 1 ${x + 75},${baseY}`;
    }
    return `${d} L${W},${H} L0,${H} Z`;
  },
};

/** Clamps untrusted model output onto the supported vocabulary. */
export function normalizeScene(scene = {}, seed = "") {
  const rnd = rngFrom(`${seed}fallback`);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const num = (v, lo, hi, dflt) =>
    Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : dflt;

  return {
    archetype: ARCHETYPES.includes(scene.archetype) ? scene.archetype : pick(ARCHETYPES),
    palette: scene.palette in PALETTES ? scene.palette : pick(Object.keys(PALETTES)),
    sunY: num(scene.sunY, 0, 1, 0.45),
    birds: Math.round(num(scene.birds, 0, 6, 3)),
  };
}

export function renderPoster(scene, seed = "") {
  const { archetype, palette, sunY, birds } = normalizeScene(scene, seed);
  const rnd = rngFrom(seed);
  const p = PALETTES[palette];
  const draw = SHAPES[archetype];

  const layers = p.layers
    .map((fill, i) => {
      const baseY = HORIZON - 30 + i * 34;
      const amp = 95 - i * 13;
      return `<path d="${draw(rnd, baseY, amp)}" fill="${fill}"/>`;
    })
    .join("");

  const flock = Array.from({ length: birds }, () => {
    const x = 40 + rnd() * (W - 80);
    const y = 40 + rnd() * 110;
    const s = 5 + rnd() * 5;
    return `<path d="M${x},${y} q${s},${-s * 0.7} ${s * 2},0 q${s},${-s * 0.7} ${s * 2},0" fill="none" stroke="${p.layers[4]}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`;
  }).join("");

  const sunCy = 40 + (1 - sunY) * (HORIZON - 60);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<circle cx="${(W * 0.68).toFixed(0)}" cy="${sunCy.toFixed(0)}" r="46" fill="${p.sun}" opacity="0.95"/>
${flock}${layers}</svg>`;
}
