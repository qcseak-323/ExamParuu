/**
 * Composite the battle effects over the arena, both themes.
 *
 *   node scripts/preview-fx.mjs
 *
 * Writes art/gen/out/preview-fx.png.
 *
 * `.attack-bolt` had no CSS at all until this batch, so nobody has ever seen
 * one. A browser screenshot needs the preview pane displayed, which is not
 * always available, and the effects are transient states inside a signed-in
 * battle — so this renders the same assets over the same arena colours to
 * show what now lands on screen.
 *
 * Row 1 is the four bolts at their three real sizes (16 / 24 / 32, the sizes
 * QuizClient sets inline for base / super / ultimate). Row 2 is the impact
 * spark, the faint dust, both gusts and the speed lines at render size.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 760, BAND = 190;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const THEMES = [
  { name: "Low Tide", top: "#DCE3D8", bottom: "#ECEAE3", line: [18, 32, 43, 0.03] },
  { name: "Storm Watch", top: "#10222E", bottom: "#0C161E", line: [159, 216, 222, 0.045] },
];

const load = (n, s) => decodePNG(fs.readFileSync(path.join(ROOT, `public/scenery/v1/${s}/${n}.png`)));

function scaleNN(src, sw, sh, d) {
  const out = new Uint8Array(d * d * 4);
  for (let y = 0; y < d; y++) {
    const sy = Math.floor((y * sh) / d);
    for (let x = 0; x < d; x++) {
      const sx = Math.floor((x * sw) / d);
      const s = (sy * sw + sx) * 4, o = (y * d + x) * 4;
      out[o] = src[s]; out[o + 1] = src[s + 1]; out[o + 2] = src[s + 2]; out[o + 3] = src[s + 3];
    }
  }
  return out;
}

function blit(dst, src, d, ox, oy) {
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const s = (y * d + x) * 4;
      if (src[s + 3] === 0) continue;
      const px = ox + x, py = oy + y;
      if (px < 0 || py < 0 || px >= W || py >= BAND) continue;
      const o = (py * W + px) * 4;
      dst[o] = src[s]; dst[o + 1] = src[s + 1]; dst[o + 2] = src[s + 2]; dst[o + 3] = 255;
    }
  }
}

/** Draw one asset at `size`, choosing the source tier that divides it. */
function place(px, name, size, x, y) {
  const tier = size % 48 === 0 ? 48 : 96;
  const img = load(name, tier);
  blit(px, scaleNN(img.pixels, img.width, img.height, size), size, x, y);
}

const bands = THEMES.map((t) => {
  const px = new Uint8Array(W * BAND * 4);
  const [tr, tg, tb] = hex(t.top), [br, bg, bb] = hex(t.bottom);

  for (let y = 0; y < BAND; y++) {
    const k = y / (BAND - 1);
    const r = Math.round(tr + (br - tr) * k);
    const g = Math.round(tg + (bg - tg) * k);
    const b = Math.round(tb + (bb - tb) * k);
    for (let x = 0; x < W; x++) {
      const d = (y * W + x) * 4;
      px[d] = r; px[d + 1] = g; px[d + 2] = b; px[d + 3] = 255;
    }
  }
  // The arena's ruled lines: every 28px, 2px thick.
  const [lr, lg, lb, la] = t.line;
  for (let y = 0; y < BAND; y += 28) {
    for (let yy = y; yy < Math.min(y + 2, BAND); yy++) {
      for (let x = 0; x < W; x++) {
        const d = (yy * W + x) * 4;
        px[d] = Math.round(px[d] * (1 - la) + lr * la);
        px[d + 1] = Math.round(px[d + 1] * (1 - la) + lg * la);
        px[d + 2] = Math.round(px[d + 2] * (1 - la) + lb * la);
      }
    }
  }

  // Row 1 — the four bolts at base / super / ultimate.
  let x = 22;
  for (const el of ["fire", "water", "wood", "brass"]) {
    let bx = x;
    for (const s of [16, 24, 32]) {
      place(px, `bolt-${el}`, s, bx, 30 + (32 - s));
      bx += s + 8;
    }
    x += 128;
  }

  // Row 2 — impact, defeat, weather.
  place(px, "spark-hit", 48, 30, 108);
  place(px, "dust-faint", 96, 110, 84);
  place(px, "gust-1", 48, 250, 108);
  place(px, "gust-2", 48, 330, 108);
  place(px, "speed-line", 48, 420, 108);

  return px;
});

const H = BAND * THEMES.length;
const out = new Uint8Array(W * H * 4);
bands.forEach((b, i) => out.set(b, i * W * BAND * 4));

const dest = path.join(ROOT, "art/gen/out/preview-fx.png");
fs.writeFileSync(dest, encodePNG(W, H, out));
console.log(`${W}x${H} -> ${dest}`);
console.log("row 1: bolt-fire / water / wood / brass at 16, 24, 32px");
console.log("row 2: spark-hit 48, dust-faint 96, gust-1, gust-2, speed-line 48");
console.log("top band Low Tide, bottom band Storm Watch");
