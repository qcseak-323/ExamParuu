/**
 * The downres pipeline, shared by every art script.
 *
 * Extracted from build-tiers.mjs when the scenery batch needed the same three
 * stages: a raw generation is not pixel art until it has been quantised, so
 * judging candidates before this runs is judging the wrong image.
 *
 *   1. BOX DOWNSAMPLE — generated "pixel art" is not truly on a pixel grid, it
 *      carries sub-pixel noise from the diffusion. Averaging the source block
 *      is more faithful than nearest-neighbour, which samples one arbitrary
 *      noisy pixel per output cell.
 *   2. QUANTISE — median-cut to a fixed colour count. This is what turns a
 *      soft average back into flat pixel art, and it is where the "limited
 *      palette" property is actually enforced — in post, not by asking the
 *      generator for it.
 *   3. ALPHA SNAP — transparency stays binary. A soft alpha edge renders as a
 *      grey halo against the dark theme.
 */

/** Average over the source block; ignore fully transparent pixels. */
export function boxDownsample(src, w, h, tw, th) {
  const out = new Uint8Array(tw * th * 4);
  const sx = w / tw, sy = h / th;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      let r = 0, g = 0, b = 0, n = 0, opaque = 0, total = 0;
      for (let j = Math.floor(y * sy); j < Math.ceil((y + 1) * sy); j++) {
        for (let i = Math.floor(x * sx); i < Math.ceil((x + 1) * sx); i++) {
          if (i >= w || j >= h) continue;
          const s = (j * w + i) * 4;
          total++;
          if (src[s + 3] > 127) {
            r += src[s]; g += src[s + 1]; b += src[s + 2];
            n++; opaque++;
          }
        }
      }
      const d = (y * tw + x) * 4;
      // 40% is the coverage threshold below which a cell reads as background.
      if (n > 0 && opaque / total >= 0.4) {
        out[d] = Math.round(r / n); out[d + 1] = Math.round(g / n);
        out[d + 2] = Math.round(b / n); out[d + 3] = 255;
      } else {
        out[d + 3] = 0; // snapped hard — no soft halo
      }
    }
  }
  return out;
}

/**
 * Median cut. Splits the box with the widest channel until it has n boxes.
 *
 * `pool` optionally supplies the pixels the palette is built from, so a set of
 * images can share one palette. Animation strips need this: quantising frames
 * independently gives each its own 16 colours and the sprite's colours crawl
 * frame to frame.
 */
export function quantise(px, n, pool = null) {
  const source = pool ?? px;
  const pixels = [];
  for (let i = 0; i < source.length; i += 4) {
    if (source[i + 3] > 0) pixels.push([source[i], source[i + 1], source[i + 2]]);
  }
  if (!pixels.length) return px;

  let boxes = [pixels];
  while (boxes.length < n) {
    let bi = -1, best = -1, ch = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of box) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        if (hi - lo > best) { best = hi - lo; bi = i; ch = c; }
      }
    });
    if (bi < 0) break;
    const box = boxes[bi].slice().sort((a, b) => a[ch] - b[ch]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }

  const palette = boxes.filter((b) => b.length).map((box) => {
    const s = box.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
    return s.map((v) => Math.round(v / box.length));
  });

  const out = new Uint8Array(px.length);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    let bestD = Infinity, bestC = palette[0];
    for (const c of palette) {
      const d = (px[i] - c[0]) ** 2 + (px[i + 1] - c[1]) ** 2 + (px[i + 2] - c[2]) ** 2;
      if (d < bestD) { bestD = d; bestC = c; }
    }
    out[i] = bestC[0]; out[i + 1] = bestC[1]; out[i + 2] = bestC[2]; out[i + 3] = 255;
  }
  return out;
}

export function countColours(px) {
  const s = new Set();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 0) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  }
  return s.size;
}

/** Share of the canvas that is opaque. Under ~25% reads as a speck at 32px. */
export function coverage(px) {
  let n = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 0) n++;
  return n / (px.length / 4);
}

/** Tight bounding box of the opaque pixels, or null if fully transparent. */
export function bbox(px, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
