# Timeline Slider Implementation Progress

> **Instructions for AI Agent**: Update this file after each commit. Use emoji status indicators:
> - ❌ = Pending/Not Started
> - 🚧 = Work In Progress
> - ✅ = Completed

---

## Overview
Replace pan gestures with a timeline slider control for navigating historical data. Limit history to 10x viewport size (4000 points) with FIFO trimming.

---

## Completed Work ✅

### Phase 1: Core Implementation (`b3e84f5`)
FIFO trimming (4000 pts), timeline slider, navigation handlers, disabled pan (kept zoom)

### Phase 2: UI Refinements
| Item | Summary | Commit |
|------|---------|--------|
| 1 | Trash → ✕ | `7bff6bd` |
| 2 | Playback Controls box (304px) | `f823a6a` |
| 3 | Skinny cursor (4×20px) | `3290c5f` |
| 4 | Removed 0s label + Live Mode text | `804d9a4` |
| 5 | Gray cursor + hover, always enabled | `03f761f` |
| 6-7 | Real-time sync + process model fix | `f390aa8` |
| 8 | Pause/play time jump fix | `fa4666b`, `c5eb5de` |
| 9 | Min 400 pts viewport limit | `37da8c6` |
| 10 | Record button (● symbol) | `31dd9f9` |
| 11 | Button order: Reset→Play→Pause→Restart→Record | `2413fc8` |
| 13 | 304px width all control boxes | `b479cda` |
| 14 | Toggle Record/Download (red, 0.1s) | `eb18601`, `c6df8ea` |
| 15 | Flexbox layout, controls 320px fixed | `ecd5d59` |
| 16 | Splash transient (≋ ripple, 2s cosine) | `d7c7757`, `8096d2f` |

### Merged to Main
- `2d67481` - Merge feature/timeline-slider (all Phase 2 complete)
- `08b94ac` - BUG-2 fix + always-visible slider/scrollbar
- `4dee53a` - Add claude-hitmen submodule

### Item 17: Header Revamp ✅
**Feature**: Three-section header layout with problem types, simulation grid, and dynamic title

**Implementation**:
- Created slot-based simulation management system
- Problem type selector with gradient overlay cards (2 columns)
- Simulation grid (3 rows × N columns, starts with 1 column)
- Pre-created slots with inline editing and reset functionality
- Each problem type has its own isolated simulation set

**Files Created**:
- `models/problem-type-model.js` - Problem type data model
- `components/problem-type-selector.js` - Left section, gradient cards
- `components/simulation-slot.js` - Individual slot component
- `components/simulation-grid.js` - Center section, 3×N grid

**Files Modified**:
- `models/tab-model.js` - Added slot management methods
- `controllers/simulation-controller.js` - Added problem type awareness
- `views/app-view.js` - Replaced header with 3-section layout
- `index.html` - Added script tags for new components

**Acceptance**: All criteria met
- [x] Problem type tabs (2 columns, left side)
- [x] Problem types have gradient overlay sheen effect
- [x] Simulation grid (3 rows × 1 column initial, center)
- [x] Simulations pre-created, renamable, 30 char width
- [x] ↺ resets simulation + name (no close/delete)
- [x] + adds column of 3 simulation slots
- [x] Title shows current problem type
- [x] Clicking problem type → welcome page (with its own sims)
- [x] Clicking simulation → opens that sim

---

## Remaining Tasks

**Priority Order**:
1. ❌ Item 18: GIF recording of plots
2. ❌ Item 12: Drag to navigate history

---

### Item 18: GIF Recording of Plots ❌
**Branch**: `feat/gif-recording`
**Feature**: Record button captures charts as GIF alongside JSON data

**Specs**:
- **Charts**: All 4 visible charts (position, acceleration, velocity, error)
- **Frame rate**: 15 fps
- **Max duration**: 10× context window (40,000 points worth)

**Scope Boundaries**:
- IN: Capture chart canvases only (not controls/UI)
- IN: Single GIF containing all charts (stacked or grid layout)
- OUT: Video formats (MP4, WebM)
- OUT: Configurable frame rate/quality

**Definition of Done**:
1. Click ● starts both JSON logging AND GIF frame capture
2. Click ↓ stops recording, generates GIF, downloads both files
3. Files have matching timestamps in filename
4. GIF plays back chart animation from recording period

**Verification**:
- [ ] Start recording, run sim for 5s, stop → GIF downloads
- [ ] GIF file opens and shows chart animation
- [ ] GIF timestamp matches JSON timestamp
- [ ] GIF captures all 4 chart areas

**Acceptance**:
- [ ] Record button starts GIF capture
- [ ] Stop recording generates GIF
- [ ] GIF downloaded with same timestamp as JSON
- [ ] GIF shows chart animation during recording period

---

### Item 16: Splash Transient Disturbance ✅
**Commits**: `d7c7757`, `8096d2f`
**Feature**: Ripple buttons (≋) trigger 2s cosine transients (1x → 2x → 1x)

**Acceptance**: All passing
- [x] "Scale" → "Amplitude" everywhere
- [x] Ripple button next to Frequency
- [x] Ripple button next to Amplitude
- [x] Click → smooth increase → return to baseline
- [x] Transient visible on charts
- [x] Button matches existing UI style

---

### Item 12: Drag to Navigate History ❌
**Branch**: `feat/drag-timeline`
**Feature**: Pan inside plot to move through history (when paused)

**Scope Boundaries**:
- IN: Pan gestures on chart area when paused
- IN: Bidirectional sync between pan and slider
- OUT: Pan while running (stays disabled)
- OUT: Vertical pan (y-axis navigation)

**Definition of Done**:
1. When paused, dragging left/right on chart moves through history
2. Slider thumb moves in sync with pan gesture
3. Releasing pan leaves view at that position
4. Zoom (pinch/wheel) works in both running and paused states

**Verification**:
- [ ] Pause sim → drag chart left → slider moves left
- [ ] Pause sim → drag chart right → slider moves right
- [ ] Drag slider → chart view matches
- [ ] While running → pan disabled, zoom works
- [ ] While paused → both pan and zoom work

**Acceptance**:
- [ ] Panning updates slider in real-time
- [ ] Pan and slider drag are equivalent
- [ ] Zoom works regardless of pause state

---

## Bugs

### Investigating

(none)

---

### Open

(none)

### Fixed
- **BUG-1**: Mouse wheel scroll blocked - fixed
- **BUG-2**: Timeline clock reset (`08b94ac`) - emit events in `reset()`
- **BUG-3**: X-axis tick labels incorrect - fixed timeline slider/chart time alignment
- **BUG-4**: Tab switch time jump - call `simulationState.resume()` before `_startAnimation()` in `setActiveSlot()`
- **BUG-5**: Problem type buttons enlarge when selected - removed `scale-105` transform from active state
- **BUG-6**: Timeline slider stale on slot switch - emit `timeline-position-changed` when switching slots

---

## Commit History

| Commit | Description | Items |
|--------|-------------|-------|
| `b3e84f5` | Timeline slider core | Phase 1 |
| `7bff6bd`..`2413fc8` | UI refinements | 1-11 |
| `37da8c6` | Viewport min limit | 9 |
| `b479cda` | 304px width | 13 |
| `ecd5d59` | Flexbox layout | 15 |
| `eb18601`, `c6df8ea` | Toggle Record/Download | 14 |
| `08b94ac` | BUG-2 fix + layout stability | BUG-2 |
| `2d67481` | Merge feature/timeline-slider | — |
| `4dee53a` | claude-hitmen submodule | — |
| `d7c7757` | Scale→Amplitude rename | 16 |
| `8096d2f` | Splash transient disturbance | 16 |

---

## Success Criteria

✅ Pan disabled, zoom works
✅ Timeline slider in control panel
✅ Record button (5th icon)
✅ 4000 point FIFO history
✅ Slider always enabled, auto-pauses on drag
✅ Skinny gray cursor with hover
✅ Play from history → jump to live
✅ Time on slider matches chart axis
