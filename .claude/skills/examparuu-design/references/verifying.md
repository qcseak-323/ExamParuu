# Verifying UI work

Design claims are verified by **looking**, not by reasoning about CSS. This
file is how to get eyes on the app.

## Starting the app

Use the Browser pane, never a Bash-launched dev server. The launch config is
[.claude/launch.json](../../../../../.claude/launch.json) at the *workspace*
root (one level above `ExamParuu/`), and the config's own `name` — the string
`preview_start` takes — is `examparuu-dev`, port 3000. The folder and the
config name are different things; pass the config name.

```
preview_start { name: "examparuu-dev" }
```

**Port 3000 is frequently already taken** by a parallel session's dev server.
That is not a failure — attach to what is running instead of trying to kill it:

```
preview_start { url: "http://localhost:3000" }
```

## Storybook — the system without the app around it

The component library runs at port 6006, config name `examparuu-storybook`:

```
preview_start { name: "examparuu-storybook" }
```

Reach for it **before** the app when the question is about a component rather
than a screen. It needs no session, so it sidesteps the gated-screen problem
entirely, and the five preference axes are toolbar switches rather than
`document.documentElement.dataset` pokes — which means they go through the same
path the real toggles do.

Stories live in `src/stories/`. Foundations cover colour, typography, spacing
and elevation; the rest cover buttons, selection, dialogue and meters. Each
carries variant stories for the combinations in the matrix below, so
`controls-selection--storm-watch` is one navigation rather than a story plus
four attribute edits.

Direct-load a single story, skipping the manager UI:

```
http://localhost:6006/iframe.html?id=<story-id>&viewMode=story
```

`curl -s http://localhost:6006/index.json` lists every id.

Two caveats. The a11y addon is set to `test: "todo"`, so violations are
reported and never fail anything — read the panel, don't assume green. And a
story is a component in isolation: it cannot tell you that two correct
components collide on a real page, so a layout claim still has to be checked
against the app.

## Use Chrome for anything that must be *seen*

The in-app Browser pane fails `computer { action: "screenshot" }` with *"the
Browser pane is not displayed, so the page is not compositing frames"* whenever
the pane is hidden, and it has reported a 0×0 viewport. `read_page`,
`get_page_text`, `read_console_messages` and `javascript_tool` still work
against it, so it is fine for *measuring* and useless for *looking*.

**`mcp__claude-in-chrome__*` drives the user's real Chrome**, has no such
problem, and is already signed in. Measure in the pane; look in Chrome.

## Reaching gated screens

Auth is **Resend magic-link email only** — no password provider exists.

| public | gated |
|---|---|
| `/` landing (incl. the live battle demo) | `/exams/[examCode]/*` — path, quiz, exam, gym, study, flashcards, progress |
| `/catalog` | `/progress`, `/preferences`, `/setup` |
| `/login`, `/legal/*` | |

Two ways in, both established:

1. **Drive the user's Chrome** — their session is live, nothing to sign in to.
   Cheapest, try first.
2. **Sign in as the dev account** `qcseak@outlook.com` (not the user's own):
   submit at `/login`, retrieve the message from `sign-in@mail.examparuu.com`
   via the Outlook MCP, verify the link's host really is `examparuu.com`, then
   follow it. Sessions are database-backed rows plus a cookie.

Never report a gated screen as verified from reading its source. Style-only
verification is what let real bugs stand here before.

## What cannot be verified at all

**Audio.** No tool renders sound, so the chiptune tracks and blackout cues are
the user's call — say so rather than implying they were checked.

## Flipping the five preference attributes

Faster than clicking through `/preferences`, and it works on public pages
without a session:

```js
document.documentElement.dataset.theme = "dark";        // bright | dark
document.documentElement.dataset.contrast = "high";
document.documentElement.dataset.textScale = "lg";      // sm | md | lg
document.documentElement.dataset.readableFont = "true";
document.documentElement.dataset.reducedMotion = "true";
```

The dataset keys are camelCase; the attributes they set are `data-text-scale`,
`data-readable-font`, `data-reduced-motion`. Note this bypasses
`preferencesScript.ts`, so it tests the *CSS*, not the persistence path — for
that, use the real toggles.

## The matrix worth checking

Not every combination every time. These four catch nearly everything:

1. **1280 × bright** — the baseline
2. **1280 × dark** — law 10 territory: raster art melting into the surface
3. **375 × dark × `text-scale: lg`** — the layout's worst case
4. **`reduced-motion: true`** — law 6 territory: does anything vanish?

```
resize_window { preset: "mobile" }   // 375×812, also emulates touch
resize_window { preset: "desktop" }  // 1280×800
```

Reload after switching to mobile so load-time device gates re-run.

## Catching things that don't hold still

Overlays and transitions dismiss themselves before you can look at them. Two
techniques that have already settled real questions here:

- **Freeze a timed overlay** by patching `window.setTimeout` to swallow its
  exact delay — e.g. the battle entrance's 5000ms dismissal — then screenshot.
- **Prove an overlay survives a route change** with a `MutationObserver`
  recording mount/unmount timestamps. That is how the cross-page blackout seam
  was settled.

## Reading contrast rather than guessing it

```js
getComputedStyle(document.querySelector(sel)).color
```

Resolve both the text colour and the colour of what is actually behind it, then
check the pair against [tokens.md](tokens.md). Guessing which surface an element
sits on is how the fill-vs-text mistake (law 2) survives review.

**Automated sweeps have one blind spot here, and this app trips it constantly.**
Every piece of hardware is painted with `background-image: linear-gradient(...)`
and leaves `background-color` transparent — `.start-button`, `.pixel-button`,
`.dialogue-tab`, `.select-card-pick`, `.menu-item--gold`, `.hp-fill`. A checker
that walks up the tree looking for an opaque `background-color` sails past the
brass and compares the ink against the *page*, reporting a catastrophic 1.1:1
where the real value is 5.5:1.

So before reporting any contrast failure, read `backgroundImage` on the element
itself. If it is a gradient, hand-check against its stops instead.
