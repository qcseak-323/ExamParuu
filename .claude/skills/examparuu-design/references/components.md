# Components

## CSS classes

Defined in [globals.css](../../../../src/app/globals.css). The hardware set
lives in `@layer components` so Tailwind utilities on the same element still
win the cascade — that is how you override a tone or a background without
fighting specificity.

### Containers

| class | what it is |
|---|---|
| `.pixel-panel` | the base container. `--panel`, 2px ink, radius 12, 2px stamp |
| `.dialogue-frame` | a panel with room for a brass speaker tab riveted to its top edge |
| `.dialogue-frame-inner` | the padding box; auto-grows top padding when a `.dialogue-tab` is present |
| `.dialogue-tab` | the brass speaker plate. `--dialogue-tab--danger` for the wrong-answer voice |
| `.battle-scene` | ruled chart paper — the arena |
| `.gym-map` | the estuary chart. 420px, 480px at ≥640px |

### Controls

| class | what it is |
|---|---|
| `.pixel-button` | stamped hardware button. Colour comes from utilities; `min-height: 44px` |
| `.start-button` | the one brass CTA per screen. 56px tall |
| `.start-button--word` | the outsized one-word landing action. 84px, display face |
| `.menu-item` | an inset chart row on a panel |
| `.select-card` | a big card that *is* the choice — trainer avatars, starter picks |
| `.select-card-pick` | the brass pill inside a select card. A label wearing hardware, **not** a nested button |
| `.tap-target` | pads any element to a 44×44 hit area without moving its visual box |

**Selection state** — the two-state rule from law 3:

```
.menu-item--cursor   gold RING, no fill    → provisional, follows the pointer
.menu-item--gold     gold FILL             → committed, persists
.select-card--picked gold FILL             → committed
```

Both selection classes are duplicated with a `:hover:not(:disabled)` variant.
That is **not** redundancy — `.menu-item:hover:not(:disabled)` scores 0,3,0 and
would otherwise overwrite the ring's `box-shadow`, making the gold invisible at
exactly the moment it has a job. They must also stay *after* `.menu-item` in
source order. Both traps have bitten this file before; don't tidy them away.

### Meters

`.hp-track` is a storm-glass tube (`--well`, 2px ink, radius 999, 1rem tall)
with a `::after` highlight stripe that *is* the glass. `.hp-fill` takes one of
four gradients:

```
--good  verdant   --warn  ember/brass   --low  ember   --xp  tide
```

### Text

`.font-pixel` · `.dialogue-text` · `.prose-measure` (66ch cap) · `.pixelated` ·
`.pal-raster` (pixelated + the dark-theme foam rim)

### Layout

`.full-bleed` — `100vw` plus a negative margin. `body` carries
`overflow-x: clip` (not `hidden`, which would open a new scroll container) to
swallow the scrollbar sliver this leaves on desktop.

## React inventory

Screens are `*Client.tsx`; the rest are shared pieces.

| area | components |
|---|---|
| shell | `Nav`, `ExamNav`, `Footer`, `StorageNotice`, `AuthProvider`, `AudioProvider` |
| landing | `HomeHero`, `BattleDemo`, `StartPrompt`, `ModePanels` |
| onboarding | `SetupClient`, `ProfessorPortrait`, `DialogueBox` |
| learning | `LearningPathClient`, `path/ChallengeCard`, `LessonClient`, `StudyRouteClient`, `FlashcardsClient`, `ReviewCallout` |
| assessment | `QuizClient` (the largest file in the app), `ExamSimClient` |
| battle | `WildEncounter`, `GymLeaderClient`, `GymMap`, `battle/BattleEntrance`, `battle/BattleTransition`, `battle/BlackoutProvider`, `battle/TransitionLink`, `battle/FighterSprite`, `battle/HpBar` |
| sprites | `PalSprite`, `PixelSprite` |
| progress | `ProgressClient`, `ExamProgressClient`, `ProgressSync` |
| account | `PreferencesClient`, `PreferencesEffect`, `TrainerProfileSection`, `AccountDataSection`, `ProfileDangerZone` |
| catalog | `CatalogClient`, `MenuList` |

## Transitions

`BlackoutProvider` runs a three-phase transition driven by `data-phase` on the
overlay — **cover → hold → reveal** — rather than one fixed-length keyframe.
The hold has no duration; it ends when the next screen is ready. This exists
because a timed animation racing a navigation of unknown length either got cut
short (a flash) or expired over the page it was leaving.

`COVER_MS` in `BlackoutProvider` **must** match the cover durations in CSS.

Three variants — `--blinds`, `--iris`, `--dissolve`. None reverses direction:
an earlier version let the dark grab, release, then take the screen, which read
as flickering rather than tension. `#04090e` is a deliberate literal, not a
token — this is the absence of the screen and must not flip with the theme.

`.battle-entrance` lifts its own veil with a `::before` fade, because a
cross-page blackout is rendered by the page it is *leaving* and unmounts the
instant the new route commits — mid-keyframe. Without the veil the arena cuts
in hard.
