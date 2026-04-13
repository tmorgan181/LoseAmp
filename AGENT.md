# LoseAmp — Agent Implementation Brief

This document is a complete handoff for implementing the LoseAmp project.
Read DESIGN.md for the full game design context. Read DEV.md for module contracts.
This file covers what's done, what needs building, and how to do it.

---

## What's Already Done

- Full project structure (`src/`, `styles/`, `assets/`, all files created)
- `index.html` — complete DOM shell, all sections present
- `styles/main.css` — CSS variables, reset, shared controls, overlay
- `styles/loseamp.css` — hub grid layout, portal area, control panel grid
- `styles/rooms.css` — per-room base styles
- `src/state.js` — full state shape defined, all fields present
- `src/main.js` — entry point, wires modules, handles escape event
- `src/loseamp/portal.js` — **fully implemented** canvas visualizer with demo mode
- `src/loseamp/controls.js` — stub with correct structure
- `src/loseamp/lights.js` — stub with correct structure
- `src/audio/engine.js` — stub with correct structure
- `src/rooms/manager.js` — stub with correct structure
- `src/rooms/bright.js` through `threshold.js` — stubs
- `src/puzzle/logic.js` — puzzle answer encoded, boss phases defined, hold timer implemented

The portal canvas is **live and animating** in demo mode. Running `npx serve .` from the project root shows the hub with the animated Loseamp portal.

---

## Stack

Vanilla HTML/CSS/JS, ES modules, no build step. Run with `npx serve .` or `python -m http.server 8080`.

---

## Implementation Order (recommended)

### 1. Soundboard Controls (`src/loseamp/controls.js`)

Build a working control panel in `#control-panel`. The state shape is already defined in `state.js`.

**Instruments panel** (`#instruments-panel`):
- Toggle buttons for: `piano`, `bass`, `pad`, `noise`
- Start with only `piano` and `bass` visible (others locked until unlocked from rooms)
- Active state: button gets class `active`, instrument added to `state.soundboard.activeInstruments`

**Sequencer panel** (`#sequencer-panel`):
- BPM: number input or +/- buttons, range defined by `state.unlocks.bpmRange` (starts [60, 80])
- Display current BPM in `#bpm-display`
- 16-step grid, rows limited to `state.unlocks.sequencerRows` (starts at 2)
- Steps are toggle buttons with class `seq-step`, `.on` when active
- A "playhead" class `playing` moves across columns at the current BPM

**Effects panel** (`#effects-panel`):
- Sliders for: `reverb` (0–1), `delay` (0–1), `distortion` (0–1), `filter` (0–1)
- Start with only `reverb` and `filter` visible (delay/distortion unlocked from rooms)
- Label each with a short name, display current value

**On any change**: call `import { checkPuzzleState } from '../puzzle/logic.js'` then `checkPuzzleState(state)`.

---

### 2. Lights (`src/loseamp/lights.js`)

Build light controls in `#lights-panel`.

- Two sliders: `warm` (0–1) and `cool` (0–1)
- Mode buttons: `off`, `warm`, `cool`, `balanced` (others like `pulse`, `strobe` unlocked later)
- On change: set `--light-warm` and `--light-cool` CSS vars on `:root`
- These drive the ambient glow in `#portal-area::before` (already in CSS)
- Call `checkPuzzleState(state)` on change

---

### 3. Audio Engine (`src/audio/engine.js`)

Wire Web Audio API to the soundboard state.

- Create `AudioContext` on first user gesture (click anywhere)
- Build instrument oscillators/sources for: `piano` (sine, lower freq), `bass` (sine, very low), `pad` (triangle, slow attack), `noise` (white noise buffer)
- Connect through effects chain: distortion (WaveShaperNode) → filter (BiquadFilterNode) → delay (DelayNode) → reverb (ConvolverNode or simple feedback delay) → master gain
- Run a sequencer: `setInterval` at the correct BPM interval, iterate through `state.soundboard.sequence`, trigger active steps
- `getSignalLevel()`: use `AnalyserNode` to return a normalized 0–1 RMS value

**Connect to portal**: in `portal.js`, the `getIntensity()` function currently uses demo mode. Replace it with:
```js
import { getSignalLevel } from '../audio/engine.js';
// in getIntensity():
return getSignalLevel(); // 0..1
```
Keep the demo oscillator as a fallback if audio hasn't started yet.

---

### 4. Room Manager (`src/rooms/manager.js`)

Implement door logic and screen transitions.

**`evaluateDoors(state)`** — import from `puzzle/logic.js`, already defined there. Wire the result to door button rendering.

**Door buttons**: inject into `#room-doors`. Each button:
- Shows room name (you can use abstract labels — not room 1/2/3, but something atmospheric)
- Has class `visible` when the door is open, `locked` when conditionally closed, hidden when `'hidden'`
- Click triggers `enterRoom(name)`

**Screen transitions**:
- `enterRoom(name)`: remove `active` from `#hub`, add `active` to `#room-{name}`, call the room's enter function
- `exitRoom()`: reverse, re-evaluate doors

---

### 5. The Five Rooms

Each room is a full interactive scene rendered into its container div. Build them one at a time.

#### Room 1 — Bright (`#room-bright`)

**Aesthetic**: fast, particle-heavy, overwhelming. The clue is hidden in the noise.

- Canvas or CSS particle system: 80–120 particles drifting in random directions, occasional bursts
- Hidden clue: a number or symbol that's visible only when particles clear a specific zone (random, changes each visit)
- Player finds the clue by hovering/clicking to "push" particles away — reveals a 3-digit code underneath
- Collecting the code: adds `'pad'` to `state.unlocks.instruments`, marks room cleared
- Back button always visible

#### Room 2 — Still (`#room-still`)

**Aesthetic**: near-black, almost nothing moving. Clue is in absence.

- Render a grid of very faint dots (CSS or canvas)
- One dot is missing. Player must click the empty space where a dot should be.
- After 8 seconds in the room, the missing dot's zone gets an imperceptibly lighter background — the only hint
- Finding it: reveals a symbol or letter, adds `'delay'` to `state.unlocks.effects`, marks cleared
- Back button

#### Room 3 — Clock (`#room-clock`)

**Aesthetic**: a single pulsing element at center. No other decoration.

- A circle that pulses at a set interval (tied to current BPM from state, or a fixed internal BPM of 72)
- Player must click the circle at the peak of its pulse, 8 times in a row
- Miss = reset counter, room subtly shifts color to signal failure
- On clear: expands `state.unlocks.bpmRange` to [55, 90] and adds sequencer row 3
- The rhythm mechanic is the metaphor — consistency, not speed

#### Room 4 — Mirror (accessible via Loseamp portal only)

**Aesthetic**: looks exactly like Room 1 (Bright) — same layout, same particles — but one thing is different.

- The missing thing: a specific instrument toggle that appears in the mirror version but not in Bright
- Player clicks the extra element — it reveals a 4-digit code
- This code is used in Room 2 or 3 to unlock something (your call on the cross-puzzle connection)
- Marks cleared, adds `'noise'` to `state.unlocks.instruments`

**Mirror portal activation** (in `loseamp/portal.js` / `controls.js`):
- When `state.soundboard.mirrorActive` is true, the portal shows a symmetry overlay
- Add a toggle button to the control panel (appears after Room 1 is cleared)
- Clicking it sets `mirrorActive`, updates the portal visual, unlocks `#room-mirror` door temporarily

#### Room 5 — Threshold (`#room-threshold`)

**Aesthetic**: the most sparse room. A single door outline in the center.

- Nothing to interact with except the door
- Door is faintly visible at all times
- Clicking it calls `onExitDoorInteract(state)` → triggers boss lead-up back in hub
- First-visit text (one line, monospace, fades in after 3 seconds): something like `stay in the middle`
- Never shown again on revisit

---

### 6. Boss Sequence Completion

`puzzle/logic.js` already has `triggerBossLeadup()`, `checkPuzzleState()`, and `isConcertSolved()` implemented. The hold timer and escape trigger are wired.

What needs building:

**Lead-up phase visual** (in `portal.js` or a new overlay):
- When `state.boss.phase === 'leadup'`, the portal shifts — waveforms slow down, a new color appears, the control panel gets class `boss-active`
- Display a subtle UI hint (one line of text, fades in) suggesting something has changed

**Hold feedback** (in `controls.js` or `puzzle/logic.js`):
- While the player holds the correct state, show a progress indicator — a thin bar filling slowly over 8 seconds
- If they break the state, the bar empties

**The correct answer** (defined in `puzzle/logic.js → isConcertSolved()`):
```
BPM:          70–75
Instruments:  piano + bass only (no pad, no noise)
Reverb:       0.3–0.6
Delay:        0.2–0.5
Distortion:   0 (off)
Filter:       0.4–0.6
Lights warm:  0.4–0.6
Lights cool:  0.4–0.6
Light mode:   not 'strobe' or 'pulse'
Duration:     held for 8 seconds
```
Do not change these values. Do not add hints that directly describe this answer.

**End screen** (in `main.js → showEndScreen()`):
- Already wired to the `loseamp:escaped` event
- Currently shows the word `out` — this is intentional, do not change it
- Add a slow fade-in (2–3 seconds)

---

## Aesthetic Rules (do not violate these)

- **Dark.** Background is `#0a0a0f`. Nothing is bright.
- **Slow.** Animations use `--transition-slow: 1.2s`. Transitions never feel snappy.
- **Phosphor, not neon.** Colors are muted teal (`#507060`), slate (`#708090`), dim amber (`#c87040`). Not electric, not saturated.
- **Monospace for controls.** `Courier New` / `Lucida Console`. No modern UI fonts.
- **No explanatory text.** The game never tells the player what it's about or what to do. Clues only.
- **The answer is the middle.** Visually, aurally, mechanically. Reinforce this without stating it.
- **The end is quiet.** No fanfare. One word. Fade.

---

## CSS Variables (from `main.css`)

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
    instruments: ['piano', 'bass'],      // start
    effects: ['reverb', 'filter'],       // start
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

- `state.js` `loadState()` / `saveState()` are stubs. Implement with `localStorage` if you want persistence, or leave as no-ops for now — the game works either way.
- The mirror room's source room (`state.rooms.mirror.flags.sourceRoom`) defaults to `'bright'`. You can leave it there.
- Room door labels visible to the player should be abstract — shapes, symbols, or atmospheric words. Not room names or numbers.
- Do not add a tutorial, tooltip system, or help screen. Ever.
