/**
 * Composite the hero sky band to a PNG, both themes, so the scenery can be
 * looked at without a browser.
 *
 *   node scripts/preview-sky.mjs
 *
 * Writes art/gen/out/preview-sky.png.
 *
 * This exists because the contrast question is the whole reason the rim was
 * added, and a number (1.03:1) is not proof that the fix reads. It renders
 * the same layers the CSS does, in the same order, with the same rim, so the
 * output is a fair check rather than a flattering mock-up:
 *
 *   sky gradient -> mangrove mounds -> clouds and celestial body, rimmed
 *
 * The left half is drawn WITHOUT the rim and the right half WITH it, so the
 * fix can be judged against the thing it replaces rather than in isolation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 880, BAND = 260;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const THEMES = [
  { name: "Low Tide", top: "#9FD8DE", bottom: "#DCE8E1", trees: "#3E8455", far: "#1F4A34",
    rim: [28, 68, 80, 0.55], celestial: "sun", clouds: ["cloud-1", "cloud-2", "cloud-2"] },
  { name: "Storm Watch", top: "#0C161E", bottom: "#1B2E3B", trees: "#1F4A34", far: "#12202B",
    rim: [6, 14, 20, 0.6], celestial: "moon", clouds: ["cloud-1.dark", "cloud-2.dark", "cloud-2.dark"] },
];

const load = (name, size) =>
  decodePNG(fs.readFileSync(path.join(ROOT, `public/scenery/v1/${size}/${name}.png`)));

/** Nearest-neighbour scale — the same thing image-rendering:pixelated does. */
function scaleNN(src, sw, sh, dw, dh) {
  const out = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.floor((y * sh) / dh);
    for (let x = 0; x < dw; x++) {
      const sx = Math.floor((x * sw) / dw);
      const s = (sy * sw + sx) * 4, d = (y * dw + x) * 4;
      out[d] = src[s]; out[d + 1] = src[s + 1]; out[d + 2] = src[s + 2]; out[d + 3] = src[s + 3];
    }
  }
  return out;
}

function blit(dst, dw, dh, src, sw, sh, ox, oy, rim) {
  // The rim first, as four one-pixel offset silhouettes, so the art lands on
  // top of its own outline exactly as drop-shadow layers it.
  if (rim) {
    const [rr, rg, rb, ra] = rim;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          if (src[(y * sw + x) * 4 + 3] === 0) continue;
          const px = ox + x + dx, py = oy + y + dy;
          if (px < 0 || py < 0 || px >= dw || py >= dh) continue;
          const d = (py * dw + px) * 4;
          dst[d] = Math.round(dst[d] * (1 - ra) + rr * ra);
          dst[d + 1] = Math.round(dst[d + 1] * (1 - ra) + rg * ra);
          dst[d + 2] = Math.round(dst[d + 2] * (1 - ra) + rb * ra);
        }
      }
    }
  }
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const s = (y * sw + x) * 4;
      if (src[s + 3] === 0) continue;
      const px = ox + x, py = oy + y;
      if (px < 0 || py < 0 || px >= dw || py >= dh) continue;
      const d = (py * dw + px) * 4;
      dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2]; dst[d + 3] = 255;
    }
  }
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

  // Mangrove mounds: the same three ellipses .hero-canvas paints.
  for (const [cx, rx, ry, col] of [
    [0.03, 0.42, 110, t.far], [0.48, 0.44, 96, t.trees], [0.98, 0.40, 104, t.far],
  ]) {
    const [mr, mg, mb] = hex(col);
    const ecx = cx * W, erx = rx * W;
    for (let y = 0; y < BAND; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - ecx) / erx, dy = (y - BAND) / ry;
        if (dx * dx + dy * dy <= 1) {
          const d = (y * W + x) * 4;
          px[d] = mr; px[d + 1] = mg; px[d + 2] = mb;
        }
      }
    }
  }

  // Left half bare, right half rimmed — the comparison is the point.
  const place = [
    { name: t.celestial, size: 96, w: 96, h: 96, y: 26, x: 300 },
    { name: t.clouds[0], size: 96, w: 128, h: 71, y: 34, x: 40 },
    { name: t.clouds[1], size: 96, w: 96, h: 52, y: 128, x: 170 },
    { name: t.clouds[2], size: 48, w: 64, h: 35, y: 82, x: 250 },
  ];
  for (const p of place) {
    const img = load(p.name, p.size);
    const scaled = scaleNN(img.pixels, img.width, img.height, p.w, p.h);
    blit(px, W, BAND, scaled, p.w, p.h, p.x, p.y, null);            // bare
    blit(px, W, BAND, scaled, p.w, p.h, p.x + W / 2 + 20, p.y, t.rim); // rimmed
  }

  // Hairline splitting the two halves.
  for (let y = 0; y < BAND; y++) {
    const d = (y * W + Math.floor(W / 2)) * 4;
    px[d] = 200; px[d + 1] = 60; px[d + 2] = 60; px[d + 3] = 255;
  }
  return px;
});

const H = BAND * THEMES.length;
const out = new Uint8Array(W * H * 4);
bands.forEach((b, i) => out.set(b, i * W * BAND * 4));

const dest = path.join(ROOT, "art/gen/out/preview-sky.png");
fs.writeFileSync(dest, encodePNG(W, H, out));
console.log(`${W}x${H} -> ${dest}`);
console.log(`top band: ${THEMES[0].name}   bottom band: ${THEMES[1].name}`);
console.log("left of the red line = no rim, right = rimmed");
