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

### Phase 2: UI Refinements (`7bff6bd`..`8096d2f`)
| Item | Summary | Commit |
|------|---------|--------|
| 1-5 | Trash→✕, 304px box, skinny cursor, gray+hover | `7bff6bd`..`03f761f` |
| 6-8 | Real-time sync, process model, pause/play fix | `f390aa8`..`c5eb5de` |
| 9-11 | Min viewport, Record●, button order | `37da8c6`..`2413fc8` |
| 13-15 | 304px width, Record/Download toggle, flexbox | `b479cda`..`ecd5d59` |
| 16 | Splash transient (≋ ripple, 2s cosine) | `d7c7757`, `8096d2f` |

### Item 17: Header Revamp (`f4638fa`)
Slot-based simulation management: problem type selector (2-col gradient cards), simulation grid (3×N), inline editing, per-type isolation

### Item 12: Drag to Navigate History (`f68aa3b`)
Custom drag handlers on chart grid: pan left/right when paused to navigate history, syncs with slider

### Item 19: Header EKF Flowchart (`42328d3`)
Reusable EKFFlowchart component with direction prop: horizontal 3-row layout in header, vertical in welcome page, shared block definitions with identical tooltips

### Merges & Fixes
- `6baa407` - Merge feat/header-flowchart (Item 19)
- `2d67481` - Merge feature/timeline-slider
- `08b94ac` - BUG-2 fix + layout stability
- `5682d7c` - BUG-3 fix (x-axis tick labels)

---

## Remaining Tasks

**Priority Order**:
1. 🚧 Item 18: GIF recording of plots
2. ❌ Item 20: Problem type card styling enhancements

---

### Item 18: GIF Recording of Plots 🚧
**Branch**: `feat/gif-recording`
**Feature**: Record button captures charts as GIF alongside JSON data

**Specs**:
- **Capture**: Entire chart grid container (all 4 charts as unified image)
- **Libraries**: html2canvas (DOM→canvas) + gif.js (frames→GIF)
- **Frame rate**: 15 fps
- **Max duration**: 10× context window (40,000 points worth)

**Scope Boundaries**:
- IN: Capture entire chart grid container as one image
- IN: Single GIF containing all 4 charts in their grid layout
- OUT: Video formats (MP4, WebM)
- OUT: Selective chart capture (all or nothing)
- OUT: Control panel capture

**Definition of Done**:
1. Click ● starts both JSON logging AND GIF frame capture
2. Click ↓ stops recording, generates GIF, downloads both files
3. Files have matching timestamps in filename
4. GIF plays back chart animation from recording period

**Verification**:
- [ ] Start recording, run sim for 5s, stop → GIF downloads
- [ ] GIF file opens and shows chart animation
- [ ] GIF timestamp matches JSON timestamp
- [ ] GIF captures all 4 chart areas in grid layout

**Acceptance**:
- [ ] Record button starts GIF capture alongside JSON
- [ ] Stop recording generates and downloads GIF
- [ ] GIF filename matches JSON filename (same timestamp)
- [ ] GIF shows all 4 charts during recording period

---

### Item 20: Problem Type Card Styling ❌
**Branch**: `feat/problem-type-styling`
**Feature**: Enhanced visual styling for problem type selector cards

**Likely Files**: `components/problem-type-selector.js`

**Specs**: (TBD — user to specify desired enhancements)
- Animations?
- Improved gradients?
- Icons per problem type?
- Hover/transition effects?

**Scope Boundaries**:
- IN: Visual/CSS enhancements to existing cards
- OUT: Functional changes to card behavior
- OUT: New problem types

**Definition of Done**:
1. Problem type cards have enhanced visual styling
2. Maintains existing selection/activation behavior

**Verification**:
- [ ] Cards visually improved per specs
- [ ] Selection behavior unchanged
- [ ] No layout regressions

---

## Bugs

### Open

- **BUG-9**: Y-axis zoom conflicts with window scrolling
  - **Repro**: Scroll mouse wheel over chart area
  - **Expected**: Page scrolls normally
  - **Actual**: Chart Y-axis zooms, blocking page scroll
  - **Likely Files**: [views/app-view.js](views/app-view.js) (chartjs-plugin-zoom config)
  - **Fix**: Disable Y-axis zoom in zoom plugin config (`zoom.wheel.mode: 'x'` or disable wheel zoom entirely)
  - **Priority**: P1 (UX blocker)

### Fixed
- **BUG-1**: Mouse wheel scroll blocked
- **BUG-2**: Timeline clock reset (`08b94ac`)
- **BUG-3**: X-axis tick labels (`5682d7c`)
- **BUG-4**: Tab switch time jump (`98b6186`, `1745f53`)
- **BUG-5**: Problem type buttons enlarge (`98b6186`)
- **BUG-6**: Timeline slider stale on slot switch (`98b6186`)
- **BUG-7**: White bubble on active problem type card (`0d9b12a`)
- **BUG-8**: X-axis tick labels on all charts (`db3e1d8`)

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
