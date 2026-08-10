# Reference — Hoenn region map (Pokémon Emerald)

`ref-pokemon-hoenn-map.png` — 747×437, saved 2026-08-10. The annotated GameFAQs
version by ShinyCelebi.

**We design against this; we do not reproduce it.** The structure and the
figure/ground logic are the lesson. The tiles are Game Freak's.

## Measured, not eyeballed — and do not eyedrop it

The map body carries **14,239 unique colours**, collapsing to **519** once
channel values are snapped to a 24-step grid. That is compression noise around a
small real palette: the file is a resampled fan image, not a clean rip.

**Composition and density are trustworthy. Exact hex values are not.** This is
the `README.md` warning about colours, demonstrated.

---

## First, what is *not* part of the design

The black text labels with leader lines — "Fallarbor Town", "Mt. Chimney" —
are the annotator's addition. **The game's map names nothing.** A single name
appears in a panel at the lower right when the cursor lands on a location.

Taking "label everything" from this reference would be the wrong lesson, and it
is the easiest mistake to make from that image.

---

## The five things worth stealing

### 1. Land is the figure; water is the ground

One connected landmass with a real, irregular coastline. Water is flat texture
around it, not a stage the land sits on.

**Ours inverts this.** `GymMap` draws six separate island blobs — three ellipses
each, plus a dashed shore ripple — floating in brine that is roughly 70% of the
frame. Hoenn has almost no dead space.

### 2. Routes are places, not connections

Wide tan corridors with numbers (113, 114, 121), occupying real area between
towns. You walk *on* a route; it is somewhere you are.

**This is the finding that reopened the map decision.** `GymMap` draws the route
as a 2.4px polyline with a dashed overlay — pure connective tissue, no
substance. And ExamParuu has seven wild Paruu, one per route, shipped last week.
**Every one of them lives on a hairline.** The road tileset
(`mangrove-road.png`) is what fixes this, which is why it is suddenly the most
important of the three.

### 3. Towns sit *in* the terrain

Small, consistent silhouette, same pixel density as the ground around them. They
read as part of the map rather than as pins dropped on it.

**Ours hover.** A 48px tower on a marker with a label block underneath and a
separate ✓ badge — three stacked layers above the surface.

### 4. Hierarchy comes from luminance, not from restraint

**An earlier read of this file claimed the reference was mostly muted with one
loud accent. Measurement says the opposite, and the correction matters.**

Terrain region, 487×243, snapped to collapse compression noise:

| Colour | Area | Sat | Lum | What it is |
|---|---|---|---|---|
| `#a8c0f0` | 12.9% | 0.30 | 190 | shallow water |
| `#007800` | 8.9% | **1.00** | 86 | dark forest |
| `#90c0f0` | 8.2% | 0.40 | 185 | water |
| `#30a800` | 5.4% | **1.00** | 130 | mid green |
| `#3090d8` | 4.4% | 0.78 | 129 | deep water |
| `#60d800` | 2.8% | **1.00** | 175 | light green |
| `#f0c030` | 2.5% | 0.80 | 192 | **route** |
| `#d8a800` | 2.5% | **1.00** | 166 | **route, shaded** |

**34.6% of the terrain is loud** — high saturation *and* bright. Nothing here is
muted; it is a GBA palette and near-everything is fully saturated, because the
hardware and the style are.

What separates the layers is **value**. Land sits at luminance 86–130. The
routes sit at 166–192. **A route reads as walkable ground because it is the
brightest large mass on the map**, not because it is the only colourful one.

**The lesson for us is therefore contrast by value, not rationing saturation.**
Brass does not need to be the app's only loud colour; it needs to be at a
different value from what surrounds it. Which is the same finding as redesign
cause 1 arriving from a different direction: everything currently shares one
surface treatment, so nothing sits at a different depth from anything else.

### 5. It is a screen in a device

Framed: a titled header band across the top, a footer of button prompts along
the bottom. It is not a section on a page — it is a thing you have opened.

---

## Constraints this reference does not resolve

- **The dark theme.** The reference is single-theme. Our tiles are painted in one
  fixed palette and the tile water matches *neither* `--map-water` — not Low
  Tide's `#4FA3B8`, not Storm Watch's `#173B52`. A raster cannot re-ink, and the
  gap is too wide for a filter. A real second answer is required.
- **What happens to the chart's furniture.** The compass rose, wave marks, dashed
  shipping lane, region markers, trainer avatar and badge ticks are all SVG in
  theme tokens today. Each needs re-homing onto a surface that will not re-ink
  itself.
- **Scale.** Hoenn is a full handheld screen of terrain. Our region screen sits
  above the catalog on a scrolling page, on desktop and mobile. The density does
  not transfer unexamined.
