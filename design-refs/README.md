# Design references

Drop images here that you want Claude to design *against*. This is separate
from `art/`, which holds generated sprite assets and their tooling — nothing
here ships to `public/`.

## Why this exists

"Make it look better" is a coin flip. "Match the density of
`design-refs/ref-linear-sidebar.png`" is an instruction. Pointing at a concrete
image is the highest-leverage thing you can do to get a design you actually
wanted.

## Naming

```
ref-<what>-<where>.png      something to emulate
current-<screen>-<theme>.png  how it looks now, for before/after
target-<screen>.png           a mockup of where it should land
```

Examples: `ref-duolingo-streak-card.png`, `current-quiz-dark.png`,
`target-progress-mobile.png`.

## What makes an image readable

Claude reads these visually at full resolution, but there are real limits.

**Do:**
- **Crop to the thing.** A 1440×3000 full-page capture gets downscaled and
  loses text and 4px spacing differences. One card per file beats one page.
- **Put the viewport width in the filename or say it** — `-mobile`, `-375`.
  Every judgment about layout depends on it.
- **Annotate and number.** Red arrows with ①②③, then say "fix ② and ③".
  Far more reliable than "the thing on the right".
- **Pair before/after** in one message.
- **Use PNG.** JPEG artifacts on UI text and 1px borders read as real defects.

**Don't expect:**
- **Exact measurements.** Claude can say "this gap is roughly 1.5× that one",
  not "that is 22px". If a number matters, type the number.
- **Exact colours.** Give the hex; do not ask for it to be eyedropped.
- **Motion, timing, or font rendering.** A still frame cannot carry these.

The way around all three limits is the same: point at the *source* rather than
a picture of the result — the token name, the CSS rule, or the running app,
which Claude can measure directly. A screenshot says *what is wrong*; the
source says *what it should be*.

## Keeping the repo small

These are development inputs, not app assets. If the folder grows past a few
MB of screenshots, add `design-refs/` to `.gitignore` and keep it local.
