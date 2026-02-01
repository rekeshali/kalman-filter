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
| 20 | Problem type card icons + gradient overlay | `0648e27` |
| 22 | Limit to 3 simulation slots per problem type | `8fde1a2` |

**Merges**: `8fde1a2` (Item 22), `1ce8a94` (Item 20), `6baa407` (Item 19), `2d67481` (timeline-slider)

---

## Remaining Tasks

**Priority**: 1. ❌ Item 21 → 2. ❌ Item 23 → 3. ❌ Item 24 → 4. ❌ Item 25

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

**Acceptance Criteria**:
- ✓ Single wide button (no two ≋ buttons)
- ✓ Button fills full row width
- ✓ Progress bar animates during ramp-up (0→100% over 1s)
- ✓ Progress bar holds at 100% while pointer down (up to 6s max)
- ✓ Progress bar animates during ramp-down (100→0% over 1s)
- ✓ Button auto-releases and resets after 6s sustain (or on pointer release)
- ✓ Envelope values smooth (sin/cos applied to both frequency and amplitude)
- ✓ Simulation responds to envelope changes in real-time

**Verification**:
- Hold button for 1s → bar reaches 100%
- Hold button for 3s → bar stays at 100%
- Release after 3s → bar animates down to 0% over 1s
- Hold for 6s → auto-release (bar animates down)
- Observe simulation perturbation follows envelope shape

---

### Item 23: Consistent Highlight Colors ❌
**Branch**: `feat/highlight-colors`

**Change**: Match highlight color between problem type cards and simulation slots

**Files**: `components/problem-type-selector.js`, `components/simulation-slot.js`

**Acceptance Criteria**:
- ✓ Problem type card active state uses same blue as simulation slot active state
- ✓ Color applied consistently across all problem types (Wave, Sine, Const Vel, Const Accel)
- ✓ Active state clearly distinguishes selected tab from inactive tabs
- ✓ Color matches visual design (no gradient/opacity differences)

**Verification**:
- Open app, observe problem type selector
- Click different problem types → active card highlights in blue
- Switch to each problem type → corresponding simulation slots also use same blue highlight
- No color discrepancy between the two tab groups

---

### Item 24: Reset Button → ✕ with Full Reset ❌
**Branch**: `feat/reset-button`

**Change**: Replace ↺ with ✕, reset both name AND settings on click

**Behavior**:
- Click ✕ → immediately reset slot name to default ("Sim 1", "Sim 2", etc.)
- Click ✕ → immediately reset all parameters to defaults
- No confirm dialog

**Files**: `components/simulation-slot.js`, `controllers/simulation-controller.js`

**Acceptance Criteria**:
- ✓ Reset button displays ✕ (not ↺)
- ✓ Click ✕ → slot name reverts to default ("Sim 1", "Sim 2", "Sim 3")
- ✓ Click ✕ → all parameter values reset to defaults (frequency, amplitude, damping, etc.)
- ✓ Reset is immediate (no confirmation dialog, no delay)
- ✓ Charts update immediately to reflect default parameters
- ✓ No ↺ button visible anywhere

**Verification**:
- Edit slot name → click ✕ → name reverts to default
- Change parameters → click ✕ → all parameters reset to defaults
- Observe charts update immediately
- Confirm ✕ icon displays and ↺ is not visible

---

### Item 25: Simulation Tab Hover Highlight ❌
**Branch**: `feat/slot-hover-highlight`

**Change**: Add hover highlight to simulation slots matching the old + button hover state

**Current State**:
- Inactive slots: `bg-gray-700` with `hover:bg-gray-650`
- Hover should provide stronger visual feedback

**Files**: `components/simulation-slot.js`

**Acceptance Criteria**:
- ✓ Inactive slot shows subtle background color change on hover
- ✓ Hover state is visually distinct from inactive state
- ✓ Hover state does not conflict with active state styling
- ✓ Consistent with old + button hover appearance
- ✓ Smooth transition animation

**Verification**:
- Hover over inactive simulation slots → background highlights
- Active slot hover state unchanged
- Visual feedback is clear and consistent

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
