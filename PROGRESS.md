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

---

## Remaining Tasks

**Priority Order**:
1. ❌ Item 18: GIF recording of plots
2. ❌ Item 17: Header revamp (problem types + simulation grid)
3. ❌ Item 12: Drag to navigate history

---

### Item 18: GIF Recording of Plots ❌
**Branch**: `feat/gif-recording`
**Feature**: Record button captures charts as GIF alongside JSON data

**Requirements**:
1. When recording starts (● → ↓), begin capturing chart frames
2. When recording stops, generate GIF from captured frames
3. Download GIF alongside the JSON debug log
4. Capture at reasonable frame rate (10-15 fps?)

**Implementation Options**:
- Use `html2canvas` or `canvas.toDataURL()` to capture frames
- Use `gif.js` or similar library to encode GIF
- Consider which chart(s) to capture (main position chart? all?)

**Files**: `controllers/simulation-controller.js`, `views/app-view.js`

**Specs**:
- **Charts**: All visible charts
- **Frame rate**: 15 fps
- **Max duration**: 10× context window (40,000 points worth)

**Acceptance**:
- [ ] Record button starts GIF capture
- [ ] Stop recording generates GIF
- [ ] GIF downloaded with same timestamp as JSON
- [ ] GIF shows chart animation during recording period

---

### Item 17: Header Revamp ❌
**Branch**: `feat/header-revamp`
**Feature**: Two-tier navigation - problem types (left) and simulation grid (right)

**Layout** (initial state - 1 column):
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Problem Types]     │ [Sims: 3×1]              │ Title                      │
│ ┌───────┬─────────┐ │ ┌──────────────────────┐ │                            │
│ │Simple │(Empty)  │ │ │ 1 (up to 30 chars)   │ │ EKF: Simple Wave           │
│ │ Wave  │         │ │ ├──────────────────────┤ │                            │
│ │       │         │ │ │ 2                    │ │                            │
│ │       │         │ │ ├──────────────────────┤ │                            │
│ │       │         │ │ │ 3                    │ │                            │
│ └───────┴─────────┘ │ └──────────────────────┘ │                            │
│                     │ [+]                      │                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**After clicking + (2 columns)**:
```
│ ┌──────────────────────┬──────────────────────┐ │
│ │ 1                    │ 4                    │ │
│ ├──────────────────────┼──────────────────────┤ │
│ │ 2                    │ 5                    │ │
│ ├──────────────────────┼──────────────────────┤ │
│ │ 3                    │ 6                    │ │
│ └──────────────────────┴──────────────────────┘ │
│ [+]                                             │
```

**Requirements**:
1. **Problem Types** (left): 2 columns
   - "Simple Wave" (active) + 1 placeholder (different physics problems)
   - Click → goes to that type's welcome page
   - Each problem type has its **own set of simulations**
   - **Visual style**: Flashy design with:
     - Background image (user-supplied) describing the problem
     - Transparent overlay / sheen effect
     - Color accents
   - Images TBD (user will supply)
2. **Simulations** (center): 3 rows × N columns
   - **Start with 1 column** (3 slots)
   - **Column width**: 30 characters
   - **Pre-created**: All 3 slots always exist per column
   - **Renamable**: editable like current tabs
   - **Reset button** (↺): replaces ✕, resets sim AND name to default
   - Named by 1D index (1,2,3 | 4,5,6 | 7,8,9...)
   - `+` button below adds new column (3 more slots)
3. **Title** (far right): "EKF: [Problem Type]"
   - Updates when problem type changes

**Files**: `views/app-view.js`, `components/tab-bar.js`

**Acceptance**:
- [ ] Problem type tabs (2 columns, left side)
- [ ] Problem types have image bg + sheen/overlay effect
- [ ] Simulation grid (3 rows × 1 column initial, right side)
- [ ] Simulations pre-created, renamable, 30 char width
- [ ] ↺ resets simulation + name (no close/delete)
- [ ] + adds column of 3 simulation slots
- [ ] Title shows current problem type
- [ ] Clicking problem type → welcome page (with its own sims)
- [ ] Clicking simulation → opens that sim

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

**Implementation**:
- Enable pan gestures when paused only
- Pan left = backward, pan right = forward
- Sync slider position during pan

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
