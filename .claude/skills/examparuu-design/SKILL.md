---
name: examparuu-design
description: The ExamParuu design system — "The Monsoon Belt". Use whenever writing, reviewing, or changing anything the user SEES in this app: JSX/TSX in src/components or src/app, any Tailwind class, anything in globals.css, colors, typography, spacing, buttons, panels, cards, meters, sprites, layout, dark mode, animation, focus rings, or accessibility. Triggers on "design", "UI", "style", "theme", "dark mode", "color", "contrast", "spacing", "font", "responsive", "mobile", "animation", "make it look", "polish", "a11y", "accessible". Read BEFORE writing UI code — this system has non-obvious rules that look like bugs when broken.
---

# The Monsoon Belt

Mangrove and estuary, brass and storm glass. The UI is the kit a field
naturalist carries: chart-paper panels inked with a 2px border and a hard 2px
stamp shadow, brass hardware, storm-glass tubes for every meter.

Source of truth is [src/app/globals.css](../../../src/app/globals.css). This
skill is the map — when the two disagree, the CSS wins and this file is stale,
so fix it.

## The two weathers

| | Low Tide (bright) | Storm Watch (dark) |
|---|---|---|
| attribute | `[data-theme="bright"]` or absent | `[data-theme="dark"]` |
| page | `#ECEAE3` silt paper | `#0C161E` brine deep |
| panel | `#F7F5EC` chart card | `#12202B` |

`#12202B` is the hinge: it is the bright theme's **ink** and the dark theme's
**panel**. Anything that hardcodes it will invert meaning between themes.

## Ten laws

Each of these has already caused a real bug in this codebase. They are ordered
by how expensive they are to get wrong.

**1. Never use `prefers-color-scheme`.** Tailwind's `dark:` variant is rebound
to the theme attribute:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

The app has its own theme toggle. Reaching for the media query decouples your
element from it — on a light-OS machine set to dark you get black overlays and
dark-on-dark text.

**2. Fill tokens are not text tokens.** `--accent` (brass `#C08A3E`),
`--success-fill`, and `--danger-fill` measure **~3.7:1** — legal for large
graphics and UI shapes, illegal for body text. Text uses the `-ink` / bare
semantic tokens, which are all ≥4.5:1 in both themes:

| need | text token | fill token |
|---|---|---|
| brass | `--accent-ink` | `--accent`, `--accent-hi` |
| correct | `--success` | `--success-fill` |
| wrong | `--danger` | `--danger-fill` |

In dark mode `--success` and `--danger` are already text-safe and the fill
tokens alias them; in bright mode they are genuinely different values. Write
against the semantic name, never the hex.

**3. Brass and gold mean different things.** Brass = hardware, and exactly
**one primary action per screen** wears it (`.start-button`). Gold (`--gold`)
is the *cursor* — the thing you are pointing at or have picked. A gold **ring**
is provisional (hover/cursor); a gold **fill** is committed and persists after
the pointer leaves. Do not use brass for selection or gold for a CTA.

**4. The display face stops at the title step.** Jersey 25 (`--font-pixel`)
is for `--text-hero` / `--text-display` / `--text-title` only. Anything asking
for the pixel face at label size is auto-converted to a sans kicker by
`.font-pixel:where(.text-label)`. Long-form reading is never set in a pixel
font — `html[data-readable-font="true"]` swaps it out entirely.

**5. 14px is the floor, in any face.** `--text-label` and `--text-caption` wear
`max(0.875rem, 14px)` because the text-size preference can set a 15px root,
where a bare `0.875rem` computes to 13.125px. Size in `rem` so the preference
scales it — the exception is `--dialogue-size`, deliberately in whole px so the
pixel font lands on the pixel grid.

**6. Reduced motion kills duration, not delay.** Both gates
(`@media (prefers-reduced-motion)` and `html[data-reduced-motion="true"]`)
collapse `animation-duration` and leave `animation-delay` alone. A delayed
animation therefore sits in its delay phase filling *backwards* — stranded at
its authored offset, off-screen, invisible, forever.

> **So: no `animation-delay` in CSS-gated animation.** Get variety from
> different durations and start positions. If you genuinely need a delay,
> either zero it explicitly under both gates (see `.battle-entrance`) or gate
> the element in JSX so it never renders (see `.attack-bolt`).

**7. Snap, don't glide.** Timing is `steps(n, end)`, not `ease`. A projectile
that slides continuously reads as a DOM element moving; one that snaps reads as
a game. Exceptions are physical rather than animated: `.swipe-card` follows a
finger, `.xp-pop` is a flourish.

**8. 44×44 minimum hit area.** Use `.tap-target` — it pads out to 44px without
disturbing the visual box. `.pixel-button` and `.select-card-pick` already
carry `min-height: 44px`.

**9. Focus is global, don't re-style it.** `:focus-visible` is a 3px `--focus`
ring at 2px offset, app-wide. The offset is load-bearing: the ring sits on the
surface *around* the control, never on the brass fill it outlines — which is
where the ring's contrast died in a previous audit.

**10. Raster art doesn't re-ink itself.** Gradients and tokens follow the theme
for free; PNGs do not. A sprite baked with the `#12202B` outline vanishes on
Storm Watch, where that colour *is* the panel. The idiom is a four-way
`drop-shadow` rim (`.pal-raster`, `.sky-prop`) or a `brightness()`/`saturate()`
shift (`.tree`) — never a blur, which destroys the hard pixel boundary.

## Spacing rhythm

Six steps. Do not invent a seventh.

```
gap-2   inside a control
gap-4   between items in a group
gap-6   between groups
gap-8   between subsections of one band
gap-10  between page sections
gap-16  between major bands, where the subject changes entirely
```

Picking between the last three: if a heading sits at the boundary, it is at
least 10. If the reader should feel they have *finished* something, 16.

`gap-8` and `gap-16` are new — four steps could not express "these two are
related" versus "this is a new section", so every boundary got `gap-6` and
dense pages read as one undifferentiated list.

On a page composing full-bleed bands, use `mt-*` per boundary rather than one
`gap` on the column: some boundaries need to be zero (a band that butts the one
above it is a single stack) and a flex gap cannot express that. `src/app/page.tsx`
is the worked example.

Running text is capped at 66 characters by `.prose-measure`.

## Elevation — three tiers, not one

**This is the rule most recently added, and the one most likely to be broken by
habit.** Everything used to be a single idiom — 2px ink border + 2px hard stamp
+ 12px radius — on panels, cards, buttons, chips and meters alike. One treatment
on everything flattens hierarchy: nothing recedes, so nothing is foreground.

| Tier | Class | Looks like | Use for |
|---|---|---|---|
| flat | `.pixel-panel` | 2px `--line`, no shadow | page furniture, containers — **the default** |
| stamped | `+ .pixel-panel--stamped` | 2px `--border` + `2px 2px 0` stamp, translates on `:active` | anything meant to be **pressed** |
| raised | `+ .pixel-panel--raised` | 2px `--border` + `4px 4px 0` stamp | popovers, modals, the active card |

**The stamp means "you can press this."** That is what made the idiom good, and
putting it on everything is what killed it. A `<div>` wrapping content is flat;
a `<button>` or `<Link>` styled as a panel is stamped.

Two pixels even for flat: a 1px hairline is off the pixel grid every sprite in
this app is drawn to. The weight stays, the *ink* is what changes.

`.pixel-button`, `.menu-item`, `.select-card` and `.start-button` are already
stamped by definition — they are controls. Do not add the modifier to those.

## The hardware idiom

Physical, pressable things are: `2px solid var(--border)` + `box-shadow: 2px 2px
0 var(--stamp)`. Radius is **12px for panels**, **8px for controls**, 999px for
meter tubes. Pressing translates `(2px, 2px)` and drops the shadow — the object
is stamped onto the page, not floating over it.

Reach for an existing class before writing CSS:
`.pixel-panel` · `.pixel-button` · `.menu-item` · `.select-card` ·
`.dialogue-frame` · `.hp-track`/`.hp-fill` · `.start-button` · `.gym-map`

## No glyphs as interface

There are no emoji in this app and no text characters standing in for icons.
Both toggles on the nav bar, the route badges, the shard and the seal are all
`PixelSprite` matrices. If you need a mark, author a matrix in `uiSprites.ts`
(chrome) or `badgeSprites.ts` (earned things) and draw it in `C`, which resolves
to `currentColor` and follows whatever it sits in.

A glyph resolves through whatever font the browser picks, ignores the pixel
grid, and grows with the text preference while the sprites beside it do not.
Colour emoji are worse — they ignore `color` entirely and stay one shade while
the theme inverts around them.

## Five preference attributes

All are stamped on `<html>` before first paint by
[src/lib/preferencesScript.ts](../../../src/lib/preferencesScript.ts). Any UI
you write must survive every combination:

`data-theme` (bright·dark) · `data-contrast` (high) ·
`data-text-scale` (sm·md·lg = 15·16·19px root) ·
`data-readable-font` (true) · `data-reduced-motion` (true)

The nastiest combination is **`lg` text on a ≤430px phone** — already clamped
for dialogue, still worth re-checking for anything you add.

## Before you call UI work done

- [ ] Read in **both** themes, and in `data-contrast="high"`
- [ ] Text on any coloured surface uses a text-safe token (law 2)
- [ ] Keyboard-reachable, and the focus ring is visible against what's behind it
- [ ] Works at 375px, at `data-text-scale="lg"`, and with both together
- [ ] Nothing disappears under `data-reduced-motion="true"` (law 6)
- [ ] Interactive targets are ≥44px

Verify by *looking*, not by reasoning: run the app and screenshot both themes.
See [references/verifying.md](references/verifying.md).

## Deeper reference

- [references/tokens.md](references/tokens.md) — every token, with measured contrast ratios
- [references/components.md](references/components.md) — component classes and the React inventory
- [references/verifying.md](references/verifying.md) — how to drive and screenshot this app
