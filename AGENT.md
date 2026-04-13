# LoseAmp — Agent Implementation Brief

This document is a complete handoff for implementing the LoseAmp project.
Read **DESIGN.md** for game design context. Read **PUZZLES.md** for the full puzzle spec.
Read **DEV.md** for module contracts. This file covers what's done, what needs building, and how.

---

## What's Already Done

- Full project structure (`src/`, `styles/`, `assets/`, all files created)
- `index.html` — complete DOM shell, all sections present
- `styles/main.css` — CSS variables, reset, shared controls, overlay
- `styles/loseamp.css` — hub grid layout, portal area, control panel grid
- `styles/rooms.css` — per-room base styles
- `src/state.js` — full state shape defined
- `src/main.js` — entry point, wires modules, handles escape event
- `src/loseamp/portal.js` — **fully implemented** canvas visualizer with demo mode
- All other `src/` files — stubs with correct structure and comments

The portal canvas is **live and animating** in demo mode. Run `npx serve .` from the project root.

---

## Stack

Vanilla HTML/CSS/JS, ES modules, no build step. Run with `npx serve .` or `python -m http.server 8080`.

---

## Puzzle System

**Read PUZZLES.md before implementing any room or the boss sequence.**

The puzzle system is fully designed. Each room teaches exactly one piece of the final answer:

| Room | Teaches | Mechanic |
|------|---------|----------|
| Bright | Instruments: piano + bass | Particles briefly organize into silhouettes |
| Still | BPM: 72 | Grid coordinate (col 2, row 7) of missing dot |
| Clock | Sequencer pattern + hold = 8s | Pattern built by successful rhythm hits |
| Mirror | Effect levels (reverb/delay/filter) | Reflected EQ bars — must mentally un-mirror |
| Threshold | Balance (lights symmetric) | Required to even access the mirror room |

The final answer is defined in `puzzle/logic.js → isConcertSolved()`. Do not change those values.
The sequencer pattern check must be added — see PUZZLES.md.

---

## Implementation Order

### 1. Soundboard Controls (`src/loseamp/controls.js`)

Build a working control panel in `#control-panel`. State shape is in `state.js`.

**Instruments panel** (`#instruments-panel`):
- Toggle buttons for: `piano`, `bass`, `pad`, `noise`
- Only show instruments in `state.unlocks.instruments` (starts: `['piano', 'bass']`)
- Active = class `active`, added to `state.soundboard.activeInstruments`

**Sequencer panel** (`#sequencer-panel`):
- BPM: +/- buttons or number input, constrained to `state.unlocks.bpmRange`
- 16-step grid, rows = `state.unlocks.sequencerRows` (starts: 2)
- Step buttons: class `seq-step`, `.on` when active, `.playing` for the moving playhead
- Playhead advances at BPM tempo

**Effects panel** (`#effects-panel`):
- Sliders for each effect in `state.unlocks.effects` (starts: `['reverb', 'filter']`)
- Short label + numeric value display per slider

**Mirror portal toggle** (appears after Room 1 cleared):
- Small symmetric icon button
- No label
- On click: if `|warm - cool| < 0.05`, activate mirror portal; else flicker and die
- When active: portal canvas shows symmetry overlay, `#room-mirror` door becomes visible

**On any change**: `checkPuzzleState(state)` from `puzzle/logic.js`.

---

### 2. Lights (`src/loseamp/lights.js`)

Build light controls in `#lights-panel`.

- Two sliders: `warm` (0–1) and `cool` (0–1)
- Mode buttons for modes in `state.unlocks.lightModes` (starts: `['balanced']`)
- On change: set `--light-warm` and `--light-cool` on `:root`
- On change: re-check mirror portal activation condition
- On change: `checkPuzzleState(state)`

---

### 3. Audio Engine (`src/audio/engine.js`)

Wire Web Audio API to soundboard state.

- `AudioContext` starts on first user gesture
- Instrument oscillators: `piano` (sine ~220Hz), `bass` (sine ~55Hz), `pad` (triangle ~110Hz, slow attack), `noise` (white noise buffer)
- Effects chain: distortion (WaveShaperNode) → filter (BiquadFilterNode) → delay (DelayNode) → reverb (ConvolverNode or feedback delay) → master gain
- Sequencer: runs at `state.soundboard.bpm`, steps through `state.soundboard.sequence`
- `getSignalLevel()`: AnalyserNode returning normalized 0–1 RMS

**Connect to portal:**
In `portal.js → getIntensity()`, replace demo oscillator with `getSignalLevel()`. Keep demo as fallback if audio not started.

---

### 4. Room Manager (`src/rooms/manager.js`)

- `renderDoors()`: inject buttons into `#room-doors` based on `evaluateDoors(state)` from `puzzle/logic.js`
- Door button labels: use abstract symbols or atmospheric words, never room names
- `enterRoom(name)`: remove `.active` from hub, add `.active` to `#room-{name}`
- `exitRoom()`: reverse, call `renderDoors()`
- Re-evaluate doors on every soundboard change

---

### 5. Rooms

Implement each room per the full spec in **PUZZLES.md**. Build one at a time, test before moving on.

#### Room 1 — Bright

- Canvas particle system (80–120 particles)
- Every 30–50s: particles attract toward two focal points forming piano/bass silhouettes for 2.5s
- Click during reveal → `state.rooms.bright.cleared = true`, unlock piano+bass, unlock mirror toggle

#### Room 2 — Still

- 11×11 dot grid, dot missing at col=2, row=7
- After 8s: axis labels fade in
- Click (2,7) with labels visible → collect "72", player now knows BPM target

#### Room 3 — Clock

- Single pulsing circle at 72 BPM
- Counter: `0 / 8`
- Successful hits build pattern dots at positions 1,5,9,13 in a 16-step row
- On 8/8: display pattern 5s, then clear. Unlock sequencer rows 3+4.
- `state.rooms.clock.flags.pattern = [1,5,9,13]`

#### Room 4 — Mirror

- Accessible only via mirror portal (requires light symmetry to activate)
- Shows reflected EQ bar display: reverb ~0.5, delay ~0.35, distortion 0, filter ~0.5
- Display is horizontally mirrored — player must mentally flip
- Faint "8" in bottom-right corner
- Unlocks `'delay'` effect on soundboard

#### Room 5 — Threshold

- Appears when Loseamp is in rough middle state (see PUZZLES.md for loose gating condition)
- Near-empty room, faint door outline
- After 3s: `stay in the middle` fades in (first visit only)
- Click door → `onExitDoorInteract(state)` → boss lead-up

---

### 6. Boss Sequence

`puzzle/logic.js` has the phases, hold timer, and escape trigger implemented.

**Lead-up** (`state.boss.phase === 'leadup'`):
- Portal waveforms slow down, shift toward --accent-portal color
- Control panel gets class `boss-active`
- After 6s: phase shifts to `'puzzle'`

**Puzzle phase**:
- Show a thin progress bar (0–8s) that fills while `isConcertSolved()` is true
- Empties immediately if state breaks
- At full: `triggerEscape(state)` fires automatically

**Escape**:
- `playEscapeSequence()` in `portal.js` — already implemented
- On `loseamp:escaped` event: `showEndScreen()` in `main.js` — shows `out`, slow fade

---

## Aesthetic Rules

- **Dark.** Background `#0a0a0f`. Nothing is bright.
- **Slow.** `--transition-slow: 1.2s`. Never snappy.
- **Phosphor, not neon.** Muted teal, slate, dim amber. Not electric.
- **Monospace for controls.** No modern UI fonts.
- **No explanatory text.** Clues only. No tooltips, tutorials, help screens.
- **The answer is the middle.** Reinforce without stating.
- **The end is quiet.** One word. Fade.
- **Never use clinical terms** in code, comments, or UI — anywhere.

---

## CSS Variables

```css
--bg:            #0a0a0f
--surface:       #111118
--surface-2:     #1a1a24
--border:        #2a2a3a
--fg:            #c8c8d8
--fg-dim:        #6a6a80
--fg-muted:      #3a3a50
--accent-warm:   #c87040
--accent-cool:   #4080a0
--accent-mid:    #708090
--accent-portal: #507060
```

---

## State Shape Reference

```js
state = {
  currentScreen: 'hub',
  inventory: [],
  unlocks: {
    instruments: ['piano', 'bass'],
    effects: ['reverb', 'filter'],
    bpmRange: [60, 80],
    sequencerRows: 2,
    lightModes: ['balanced'],
  },
  soundboard: {
    bpm: 72,
    activeInstruments: [],
    sequence: [],
    effects: { reverb: 0, delay: 0, distortion: 0, filter: 0.5 },
    lights: { warm: 0, cool: 0, mode: null },
    mirrorActive: false,
  },
  rooms: {
    bright:    { visited: false, cleared: false, flags: {} },
    still:     { visited: false, cleared: false, flags: {} },
    clock:     { visited: false, cleared: false, flags: {} },
    mirror:    { visited: false, cleared: false, flags: {} },
    threshold: { visited: false, cleared: false, flags: {} },
  },
  boss: {
    active: false,
    phase: null,
    holdStart: null,
    escaped: false,
  },
}
```

---

## Notes

- `loadState()` / `saveState()` are stubs. Implement with `localStorage` or leave as no-ops.
- Room door labels should be abstract — shapes, symbols, atmospheric words. Not room names.
- The mirror room's `sourceRoom` defaults to `'bright'` — leave it.
- Do not add persistence for the puzzle answer — the game should be replayable.
