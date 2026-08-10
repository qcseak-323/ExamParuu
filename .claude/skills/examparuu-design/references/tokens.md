# Tokens

Every value here is declared in [globals.css](../../../../src/app/globals.css).
Contrast ratios are measured, not aspirational. Use the token name in code —
never paste a hex.

## Surfaces

| token | Low Tide | Storm Watch | use |
|---|---|---|---|
| `--background` | `#ECEAE3` | `#0C161E` | the page |
| `--panel` | `#F7F5EC` | `#12202B` | chart cards, the base container |
| `--panel-raised` | `#ECEAE3` | `#1B2E3B` | inset rows sitting on a panel |
| `--well` | `#E0DDD1` | `#081019` | meter tracks, input wells — **never behind text** |
| `--border` | `#12202B` | `#2E4B5C` | the 2px ink on every panel |
| `--line` | `#C9C2AC` | `#2E4B5C` | decorative hairlines only |
| `--stamp` | `#12202B` | `#060B10` | the hard 2px offset shadow |
| `--scrim` | `rgba(18,32,43,.5)` | `rgba(4,10,15,.62)` | modal backdrop |

## Text

| token | Low Tide | ratio | Storm Watch | ratio |
|---|---|---|---|---|
| `--foreground` | `#12202B` | 13.8 on bg · 15.2 on panel | `#EAF2ED` | 14.5 on panel |
| `--foreground-muted` | `#3F564C` | 6.6 on bg · 7.3 on panel | `#A3BAB2` | 8.1 on panel · 6.8 on raised |
| `--foreground-soft` | `#556A60` | 4.8 on bg — **smallest text only** | `#93ACA4` | 6.9 on panel |

`--foreground-soft` has the least headroom in the system. It is safe on
`--background` and `--panel`, and it is the first thing to fail if you move it
onto a coloured surface.

## Semantic colour — the text/fill split

This is law 2 in [SKILL.md](../SKILL.md), and the single most common way to
break accessibility here.

| meaning | **text-safe** | Low Tide | Storm Watch | **fill-only (≥3:1)** |
|---|---|---|---|---|
| brass | `--accent-ink` | `#7E5417` · 5.5 on bg | `#D9A85A` · 7.7 on panel | `--accent` `#C08A3E`, `--accent-hi` `#D9A85A` |
| correct | `--success` | `#29623E` · 6.0 | `#6DB56A` · 6.7 | `--success-fill` `#3E8455` · 3.8 |
| wrong | `--danger` | `#9C3319` · 6.0 | `#E8863F` · 6.2 | `--danger-fill` `#C4553B` · 3.7 |
| link | `--link` | `#245C7B` · 6.0 | `#4FA3B8` · 5.7 | — |
| warning | `--warning` | `#7E5417` | `#F5C86B` | — |
| focus ring | `--focus` | `#245C7B` · 6.0 | `#9FD8DE` | — |

Ink **on** a fill: `--accent-foreground` (`#12202B`, 5.5:1 on brass) and
`--danger-foreground`.

`--accent` is `#C08A3E` in **both** themes — brass is brass in any weather.

## Gold — the cursor

```
--gold     #ffc53d
--gold-hi  #ffe08a
```

Theme-constant by design, so ink on it measures ~11:1 in either weather.
Brighter than brass on purpose: **brass is hardware, gold is the thing you are
pointing at.** Ring = provisional, fill = committed. See law 3.

## High contrast

`[data-contrast="high"]` hardens ink without changing the weather — bright
goes to `#000913`, dark to `#FFFFFF`, and every semantic colour steps toward
its darker/lighter end. Nothing to do per-component; just verify your screen in
it.

## Type scale

Sizes are `rem` so the text-size preference scales them.

**Display face — Jersey 25 (`--font-pixel`). Stops at `--text-title`.**

| token | size | line-height |
|---|---|---|
| `--text-hero` | 2.75rem | 1.02 |
| `--text-display` | 2rem | 1.05 |
| `--text-title` | 1.5rem | 1.1 |

**Kicker — sans semibold uppercase, tracked `.1em`. Never the display face.**

| `--text-label` | `max(0.875rem, 14px)` | 1.4 |
|---|---|---|

**Sans face — Instrument Sans (`--font-sans`). Everything anyone reads.**

| token | size | line-height |
|---|---|---|
| `--text-body-lg` | 1.1875rem | 1.55 |
| `--text-body` | 1rem | 1.55 |
| `--text-caption` | `max(0.875rem, 14px)` | 1.5 |

**Dialogue** is the one size quoted in whole px rather than rem, because a
pixel face only renders crisply at a whole number of CSS pixels:

| `data-text-scale` | root | `--dialogue-size` |
|---|---|---|
| `sm` | 15px | 26px |
| `md` | 16px | 28px |
| `lg` | 19px | 34px → **30px at ≤430px** |

## Locked art palettes

Art and accents only — **never UI text**. Four steps each, dark to light:

```
--verdant-1..4   #1F4A34  #3E8455  #6DB56A  #A8D5C2
--ember-1..4     #7A2E1E  #C4553B  #E8863F  #F5C86B
--tide-1..4      #173B52  #2E6B8C  #4FA3B8  #9FD8DE
--outline        #12202B   (theme-constant sprite ink)
```

`--sprite-outline` is the *variable* counterpart that flips per theme
(`#12202B` bright / `#EAF2ED` dark) for matrix-rendered sprites. Raster sprites
have the outline baked in and need the rim treatment instead — law 10.

## Scene tokens

Themed sets exist for the battle arena (`--arena-*`), the region map
(`--map-*`), and the landing hero (`--hero-*`, `--scn-*`). The scenery PNGs are
declared as custom properties rather than chosen in React so the winning
theme's asset resolves on the first paint and the losing one is never
requested — do not move that decision into a component.

`@theme inline` exposes only `--color-background`, `--color-foreground`, and
the three font families to Tailwind. Everything else is consumed as
`var(--token)` in CSS or via arbitrary values.
