/**
 * Minimal PNG encode/decode — no dependency.
 *
 * Needed in two places: building the palette swatch that PixelLab's
 * `color_image` parameter expects, and later reading generations back for
 * downres and palette re-indexing. Node ships zlib, which is the only hard
 * part of PNG, so pulling in sharp or pngjs for this would be overkill.
 *
 * Encodes/decodes 8-bit truecolour and truecolour+alpha only. That covers
 * everything PixelLab returns.
 */
import zlib from "node:zlib";

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** pixels: Uint8Array of RGBA, length w*h*4. */
export function encodePNG(w, h, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type 6 = truecolour + alpha
  // 10,11,12 = compression/filter/interlace, all 0

  // One filter byte (0 = None) per scanline, then the raw RGBA row.
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const o = y * (1 + w * 4);
    raw[o] = 0;
    pixels.subarray(y * w * 4, (y + 1) * w * 4).forEach((v, i) => { raw[o + 1 + i] = v; });
  }

  return Buffer.concat([
    SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Returns { width, height, pixels } with pixels as RGBA Uint8Array. */
export function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  let off = 8, w = 0, h = 0, depth = 0, type = 0;
  const idat = [];

  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const tag = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (tag === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; type = data[9];
      if (depth !== 8) throw new Error("only 8-bit PNGs supported, got " + depth);
      if (type !== 2 && type !== 6) throw new Error("only truecolour PNGs supported, got type " + type);
    } else if (tag === "IDAT") idat.push(data);
    else if (tag === "IEND") break;
    off += 12 + len;
  }

  const bpp = type === 6 ? 4 : 3;
  const stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(stride);
  const line = new Uint8Array(stride);

  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;   // left
      const b = prev[i];                        // up
      const c = i >= bpp ? prev[i - bpp] : 0;   // up-left
      let v = src[i];
      // The five PNG filter types, per spec.
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp, d = (y * w + x) * 4;
      out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2];
      out[d + 3] = bpp === 4 ? line[s + 3] : 255;
    }
    prev.set(line);
  }
  return { width: w, height: h, pixels: out };
}

/** A palette swatch strip — what `color_image` wants. */
export function paletteSwatch(hexes, block = 8) {
  const w = hexes.length * block, h = block;
  const px = new Uint8Array(w * h * 4);
  hexes.forEach((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    for (let y = 0; y < h; y++) {
      for (let x = i * block; x < (i + 1) * block; x++) {
        const d = (y * w + x) * 4;
        px[d] = r; px[d + 1] = g; px[d + 2] = b; px[d + 3] = 255;
      }
    }
  });
  return encodePNG(w, h, px);
}
