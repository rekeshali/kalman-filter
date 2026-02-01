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

### Merges & Fixes
- `2d67481` - Merge feature/timeline-slider
- `08b94ac` - BUG-2 fix + layout stability
- `5682d7c` - BUG-3 fix (x-axis tick labels)

---

## Remaining Tasks

**Priority Order**:
1. ❌ Item 19: Header EKF flowchart
2. 🚧 Item 18: GIF recording of plots

---

### Item 19: Header EKF Flowchart ❌
**Branch**: `feat/header-flowchart`
**Feature**: Horizontal EKF block diagram in header (replicate welcome page flowchart)

**Source**: `components/welcome-screen.js` lines 66-233 (Block Diagram section)

**Specs**:
- **Layout**: Horizontal flow (left→right) instead of vertical (top→bottom)
- **Blocks**: Same 9 blocks: Init, True Trajectory, Inertial Prop, Jacobian, Cov Pred, Kalman Gain, Innovation, State Corr, Cov Update
- **Tooltips**: Identical hover content (math formulas, purpose, intuition)
- **Colors**: Same color scheme per block

**Scope Boundaries**:
- IN: Extract flowchart into reusable component
- IN: Horizontal layout variant for header
- IN: Same hover tooltips
- OUT: New tooltip content
- OUT: Different block colors or styles

**Definition of Done**:
1. Create `components/ekf-flowchart.js` with shared block definitions
2. Support `direction="vertical"` (welcome) and `direction="horizontal"` (header)
3. Header displays compact horizontal flowchart between sim grid and title
4. Hover tooltips work identically in both locations

**Verification**:
- [ ] Welcome page flowchart unchanged (still vertical)
- [ ] Header shows same blocks horizontally
- [ ] Hover any block → tooltip appears with math formulas
- [ ] Tooltip content matches between welcome and header

**Acceptance**:
- [ ] Reusable `EKFFlowchart` component created
- [ ] Welcome page uses `direction="vertical"`
- [ ] Header uses `direction="horizontal"`
- [ ] No code duplication between locations

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

## Bugs

### Open

- **BUG-8**: X-axis tick labels fix not applied to all charts
  - **Repro**: Run simulation, observe x-axis labels on charts below position chart
  - **Expected**: All charts show actual time values from labels array
  - **Actual**: Only position chart (top) uses correct tick callback; other 6 charts use `(v) => Number(v).toFixed(2)` which shows index values
  - **Root Cause**: BUG-3 fix (`5682d7c`) only updated position chart callback at line 320
  - **Likely Files**: [views/app-view.js](views/app-view.js) lines 344, 365, 383, 404, 425, 443
  - **Fix**: Apply same `function(v, index, ticks) { return this.chart.data.labels[index]... }` pattern to all 6 remaining chart configs
  - **Priority**: P2 (display consistency)

### Fixed
- **BUG-1**: Mouse wheel scroll blocked
- **BUG-2**: Timeline clock reset (`08b94ac`)
- **BUG-3**: X-axis tick labels (`5682d7c`)
- **BUG-4**: Tab switch time jump (`98b6186`, `1745f53`)
- **BUG-5**: Problem type buttons enlarge (`98b6186`)
- **BUG-6**: Timeline slider stale on slot switch (`98b6186`)
- **BUG-7**: White bubble on active problem type card (`0d9b12a`)

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
