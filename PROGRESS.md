# Timeline Slider Implementation Progress

> ❌ = Pending | 🚧 = In Progress | ✅ = Completed

---

## Completed Work ✅

| Item | Summary | Commit |
|------|---------|--------|
| Phase 1 | FIFO trimming (4000 pts), timeline slider, disabled pan | `b3e84f5` |
| 1-11 | UI polish: trash→✕, cursor, Record●, flexbox, sync | `7bff6bd`..`2413fc8` |
| 12 | Drag chart to navigate history when paused | `f68aa3b` |
| 13-16 | 304px width, Record/Download toggle, splash ≋ | `b479cda`..`8096d2f` |
| 17 | Header revamp: slot-based sims, problem type selector | `f4638fa` |
| 19 | EKF flowchart component (vertical/horizontal) | `42328d3` |
| 18 | GIF recording alongside JSON export | `31f1e3a`, `e4d0fb5` |

**Merges**: `6baa407` (Item 19), `2d67481` (timeline-slider)

---

## Remaining Tasks

**Priority**: 1. ❌ Item 20 → 2. ❌ Item 21

---

### Item 20: Problem Type Card Styling ❌
**Branch**: `feat/problem-type-styling` (started, has wave icon)

Wave = custom icon + gradient overlay; others = "Coming Soon"

**Files**: `components/problem-type-selector.js`, `assets/icons/problem-types/`

**Done when**: Cards have icons with gradient overlay, selection unchanged

---

### Item 21: Splash Hold-to-Sustain ❌
**Branch**: `feat/splash-hold`

**UI**: Single wide button replaces both ≋ buttons, fills row
```
┌─────────────────────────────────────┐
│ ≋ SPLASH ████████░░░░░░░░░░░░░░░░░░ │  ← blue progress bar
└─────────────────────────────────────┘
```

**Envelope** (half-sin):
- Ramp up: `sin(π/2 × t/1s)` — 0→1 over 1s
- Sustain: hold at 1 while pressed (max 6s)
- Ramp down: `cos(π/2 × t/1s)` — 1→0 over 1s

**State Machine**:
```
idle →[press]→ rampUp →[1s]→ sustain →[release|6s]→ rampDown →[1s]→ idle
```

**Events**:
- `onPointerDown` → `startSplash()`
- `onPointerUp/Leave` → `releaseSplash()`
- animation frame → `updateSplash()` returns progress %

**Files**: `components/parameter-controls.js`, `controllers/simulation-controller.js`

**Done when**: Wide button, hold sustains, bar animates (6s), auto-cutoff, smooth envelope

---

## Bugs

### Open
(None)

### Fixed
BUG-1→10: scroll, reset, tick labels, tab switch, button size, slot switch, white bubble, all charts ticks, wheel zoom, GIF grid layout
(`08b94ac`, `5682d7c`, `98b6186`, `1745f53`, `0d9b12a`, `db3e1d8`, `c2ccd8b`, `e4d0fb5`)

---

## Success Criteria ✅
Pan disabled, timeline slider, Record button, 4000pt FIFO, auto-pause on drag, skinny cursor, play→live jump, time sync
