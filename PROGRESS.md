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

**Merges**: `6baa407` (Item 19), `2d67481` (timeline-slider)

---

## Remaining Tasks

**Priority**: 1. 🚧 Item 18 → 2. ❌ Item 20 → 3. ❌ Item 21

---

### Item 18: GIF Recording 🚧
**Branch**: `feat/gif-recording` | **Blocker**: BUG-10

Capture chart grid as GIF (html2canvas + gif.js, 15fps)

**Done when**: ● starts JSON+GIF capture, ↓ downloads both with matching timestamps

**Acceptance**: [ ] GIF downloads [ ] Shows 4 charts in grid [ ] Timestamps match JSON

---

### Item 20: Problem Type Card Styling ❌
**Branch**: `feat/problem-type-styling` (started, has wave icon)

Wave = custom icon + gradient overlay; others = "Coming Soon"

**Files**: `components/problem-type-selector.js`, `assets/icons/problem-types/`

**Done when**: Cards have icons with gradient overlay, selection unchanged

---

### Item 21: Splash Hold-to-Sustain ❌
**Branch**: `feat/splash-hold`

**Envelope**: 1s half-sin ramp up → sustain at 1 → 1s half-sin ramp down
- **Click**: full bump (up→down)
- **Hold**: sustain until release or 6s timeout
- **Animation**: progress bar fills left→right (6s), same blue

**Files**: `components/parameter-controls.js`, `controllers/simulation-controller.js`

**Done when**: Wide button, hold sustains, bar animates, auto-cutoff at 6s

---

## Bugs

### Open
- **BUG-10**: GIF renders charts stacked (not grid) — **blocks Item 18**
  - Fix: html2canvas must preserve CSS grid layout
  - Files: `views/app-view.js`

### Fixed
BUG-1→9: scroll, reset, tick labels, tab switch, button size, slot switch, white bubble, all charts ticks, wheel zoom
(`08b94ac`, `5682d7c`, `98b6186`, `1745f53`, `0d9b12a`, `db3e1d8`, `c2ccd8b`)

---

## Success Criteria ✅
Pan disabled, timeline slider, Record button, 4000pt FIFO, auto-pause on drag, skinny cursor, play→live jump, time sync
