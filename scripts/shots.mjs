/**
 * Screenshot harness — renders the app to PNGs so a human (or an agent) can
 * look at it.
 *
 *   npm run shots                          everything public, both themes, 3 widths
 *   npm run shots -- --route=/             one route
 *   npm run shots -- --theme=dark          one weather
 *   npm run shots -- --width=1280          one viewport
 *   npm run shots -- --scale=lg --contrast the nasty preference combinations
 *   npm run shots -- --full                whole page rather than the fold
 *
 * ── Why this exists ──
 *
 * Nothing in this repo produced an image. Every check we had — types, lint,
 * asset counts, contrast ratios — tells you the UI is *correct*, and none of
 * them tells you it is *good*. "It looks like a child's doodle" is not a
 * measurable defect, and the redesign brief that came out of it could not be
 * verified by any tool in the project. This closes that gap.
 *
 * ── Filters are the point, not a convenience ──
 *
 * The full matrix is 5 routes x 2 themes x 3 widths = 30 images. Reading PNGs
 * is expensive for an agent's context, so shoot the screen you are actually
 * changing. Defaulting to everything on every run is how the loop becomes
 * unaffordable.
 *
 * ── The theme is set BEFORE first paint ──
 *
 * `preferencesScript.ts` stamps `data-theme` on <html> from localStorage
 * before the page renders. Setting the attribute after load would work
 * visually but skips that path entirely — including the flash it exists to
 * prevent. `addInitScript` seeds localStorage in a fresh context so the real
 * pre-paint stamping runs.
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "shots");
const BASE = process.env.SHOTS_BASE_URL ?? "http://localhost:3000";

/**
 * Only these render without a session — everything else redirects to /login
 * (see PUBLIC_PATHS in src/proxy.ts). To shoot a gated screen, put a valid
 * session cookie in SHOTS_SESSION and add the route here.
 */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/login/check-email",
  "/legal/terms",
  "/legal/privacy",
];

/**
 * Real device viewports, width AND height.
 *
 * The height used to be derived from the width by a made-up formula, which
 * gave mobile a 530px-tall window. Anything sized against `svh` — the title
 * screen is — then rendered against a viewport no phone has, and the first
 * mobile shot showed a collapsed fold that did not exist on a real device.
 * A screenshot harness that invents its own viewport is worse than none: it
 * reports bugs that are not there and hides the ones that are.
 */
const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
};

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.includes("=") ? hit.split("=").slice(1).join("=") : true;
};

const only = flag("route");
const themeArg = flag("theme");
const widthArg = flag("width");
const fullPage = Boolean(flag("full"));
const textScale = flag("scale") || "md";
const highContrast = Boolean(flag("contrast"));
const reducedMotion = Boolean(flag("still"));

const routes = only ? [only] : PUBLIC_ROUTES;
const themes = themeArg ? [themeArg] : ["bright", "dark"];
const sizes = widthArg
  ? [
      Object.values(VIEWPORTS).find((v) => v.width === Number(widthArg)) ?? {
        width: Number(widthArg),
        height: 900,
      },
    ]
  : Object.values(VIEWPORTS);

const slug = (route) =>
  route === "/" ? "landing" : route.replace(/^\//, "").replace(/\//g, "-");

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const written = [];
let failed = 0;

for (const theme of themes) {
  const prefs = {
    theme,
    readableFont: false,
    reducedMotion,
    highContrast,
    textScale,
    bgmEnabled: true,
    sfxEnabled: true,
    instantText: false,
  };

  for (const { width, height } of sizes) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      // Kills the OS-level motion preference as a variable: the app has its
      // own reduced-motion gate and we want to control it explicitly.
      reducedMotion: reducedMotion ? "reduce" : "no-preference",
    });

    await context.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* storage can be blocked; the app falls back to defaults */
        }
      },
      ["examready-preferences", JSON.stringify(prefs)],
    );

    if (process.env.SHOTS_SESSION) {
      await context.addCookies([
        {
          name: "authjs.session-token",
          value: process.env.SHOTS_SESSION,
          url: BASE,
        },
      ]);
    }

    const page = await context.newPage();

    for (const route of routes) {
      const name = `${slug(route)}-${theme}-${width}.png`;
      const file = path.join(OUT, name);
      try {
        const res = await page.goto(`${BASE}${route}`, {
          waitUntil: "networkidle",
          timeout: 30_000,
        });

        // A gated route silently becomes /login, which looks like a working
        // screenshot until you wonder why every page is the sign-in form.
        const landed = new URL(page.url()).pathname;
        if (landed !== route && landed === "/login") {
          console.log(`  ${name.padEnd(38)} SKIPPED — redirected to /login`);
          continue;
        }
        if (res && !res.ok()) {
          console.log(`  ${name.padEnd(38)} HTTP ${res.status()}`);
          failed++;
          continue;
        }

        // Sprites are the slowest thing on the page and the whole point of
        // looking; a shot taken before they decode is a shot of empty boxes.
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images]
              .filter((i) => !i.complete)
              .map((i) => i.decode().catch(() => {})),
          );
        });

        await page.screenshot({ path: file, fullPage });
        const kb = (fs.statSync(file).size / 1024).toFixed(0);
        written.push(name);
        console.log(`  ${name.padEnd(38)} ${kb.padStart(5)} KB`);
      } catch (err) {
        console.log(`  ${name.padEnd(38)} FAILED — ${err.message.split("\n")[0]}`);
        failed++;
      }
    }

    await context.close();
  }
}

await browser.close();

console.log(
  `\n${written.length} written to shots/${failed ? ` · ${failed} failed` : ""}` +
    `${fullPage ? " · full page" : " · fold only (pass --full for the whole page)"}`,
);
if (failed) process.exitCode = 1;
