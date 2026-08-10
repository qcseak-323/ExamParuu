/**
 * Screenshot a single Storybook story.
 *
 *   npm run storybook            (in another terminal, note the port)
 *   node scripts/shot-story.mjs <story-id> <out.png> [theme] [port]
 *
 * e.g. node scripts/shot-story.mjs screens-region-map--with-trainer shots/map.png dark
 *
 * ── Why this exists alongside scripts/shots.mjs ──
 *
 * `shots.mjs` drives the real app, and the real app gates most routes on a
 * session — `src/proxy.ts` lets through only the landing page, login and the
 * legal pages. Everything interesting (the region map, the quiz, progress) is
 * behind that gate and therefore invisible to it.
 *
 * Storybook renders those components without a login, so this points a browser
 * at one story's iframe and grabs it. `?globals=theme:dark` drives the same
 * toolbar global that `.storybook/preview.tsx` stamps onto <html>, so the
 * theme switch here goes through the app's real mechanism rather than a
 * Storybook-only approximation.
 */

import { chromium } from "playwright";

const [id, out, theme = "bright", port = "6006"] = process.argv.slice(2);

if (!id || !out) {
  console.error("usage: node scripts/shot-story.mjs <story-id> <out.png> [theme] [port]");
  process.exit(1);
}

const url =
  `http://localhost:${port}/iframe.html` +
  `?id=${encodeURIComponent(id)}&viewMode=story&globals=theme:${theme}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 620 } });

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

  // Sprites and the terrain raster are the slowest things on the page and the
  // whole point of looking; a shot taken before they decode is a shot of empty
  // boxes.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((i) => !i.complete)
        .map((i) => i.decode().catch(() => {})),
    );
  });

  await page.screenshot({ path: out });
  console.log(`wrote ${out}  (${id}, ${theme})`);
} finally {
  await browser.close();
}
