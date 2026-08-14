import { writeFileSync } from "node:fs";
import { renderPoster, ARCHETYPES, PALETTES } from "../backend/poster.mjs";

const cells = [];
for (const archetype of ARCHETYPES) {
  for (const palette of Object.keys(PALETTES)) {
    cells.push(`<figure><div class="p">${renderPoster(
      { archetype, palette, sunY: 0.45, birds: 3 },
      `${archetype}-${palette}`,
    )}</div><figcaption>${archetype} / ${palette}</figcaption></figure>`);
  }
}

writeFileSync(
  new URL("./preview.html", import.meta.url),
  `<!doctype html><meta charset="utf-8"><style>
body{background:#16211f;color:#f4ead6;font:13px system-ui;margin:0;padding:20px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.p{aspect-ratio:3/2;border:6px solid #f4ead6;border-radius:3px;overflow:hidden;line-height:0}
figure{margin:0}figcaption{opacity:.6;padding-top:4px}
</style><div class="grid">${cells.join("")}</div>`,
);
console.log("wrote preview.html");
