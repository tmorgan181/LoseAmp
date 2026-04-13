# LoseAmp — Design Document

## Concept

A browser-based escape room. The mechanic is the metaphor. No direct references to what it's about — only subtext, pattern, and structure. If you know what you're looking for, the strategy makes sense. If you don't, you spin.

---

## The Hub — The Loseamp

The central room. Everything converges here.

**Visual:** A large soundwave portal dominates the screen — the Loseamp. It oscillates based on the current soundboard state. Too flat and it dies. Too wild and it distorts. There's a window in the middle where it looks right.

**The Soundboard:** Full control panel with:
- Instruments / tones (selectable sound sources)
- Effects (reverb, delay, distortion, filter) — knobs/sliders
- Beat sequencer / timing (BPM, 16-step grid)
- Lights (stage lighting, color, pattern)

**Doors:** Room doors appear and disappear based on soundboard state. Not all doors are visible at once.

**The Mirror Portal:** Activated by toggling the right symmetry in the controls. Opens a mirrored version of a target room where something has changed.

**Inventory:** Items and unlocks collected from rooms expand the soundboard — new instruments, effects, tempo ranges, light modes.

---

## The Rooms

### Room 1 — Bright
Too much happening. Fast, beautiful, overwhelming. Clues are hidden in the noise.
- Puzzle style: find the signal in the chaos
- Reward: unlocks a new instrument or tone on the soundboard

### Room 2 — Still
Almost nothing moves. Dark. You have to look carefully and wait.
- Puzzle style: patience, close inspection, absence as information
- Reward: unlocks an effect or filter

### Room 3 — Clock
A rhythm puzzle. Something must be done at a specific interval. Miss it enough and the room resets.
- Puzzle style: timing, repetition, habit
- Reward: expands BPM range or unlocks sequencer rows

### Room 4 — Mirror
Only accessible via the Loseamp mirror portal. Looks like another room but something is wrong, missing, or added.
- Puzzle style: spot the difference, hidden clue revealed by inversion
- Reward: a code or position sequence used elsewhere

### Room 5 — Threshold
Only appears when the Loseamp is in the middle state — not too hot, not too quiet.
- Contains the exit.
- Puzzle style: final room gating — getting here requires balance, not power.

---

## Puzzle Loop

```
Find items in rooms
  → bring them to the Loseamp
    → new soundscape combinations unlock
      → new doors appear / rooms change state
        → revisit rooms (changed by what you've set)
          → repeat until Threshold opens
```

Rooms affect each other. The soundboard state is persistent and has cross-room consequences. Some rooms must be visited multiple times.

---

## The Final Boss — The Concert

### Context
All rooms have been cleared. All instruments, effects, and lights are unlocked. The Loseamp portal is fully active.

### Lead-Up Phase
The Loseamp begins behaving differently — small visual cues that something is about to shift. The portal pulses in a new pattern. A new UI element or overlay appears suggesting the final input is possible.

### The Puzzle
You must construct the right combination:
- **BPM / timing** — not too fast, not too slow. The middle.
- **Instruments** — specific combination active (the foundation, not the excess)
- **Effects** — moderate. Present but not overwhelming.
- **Lights** — balanced warm and cool simultaneously.
- **Duration** — must be held for a set number of bars. Sustained, not triggered.

The answer mirrors the metaphor: stability is the solution. The middle path is the exit. Nothing about it feels like winning — it feels like arriving.

### Escape Sequence
When the correct state is held long enough:
1. The Loseamp portal opens fully — the waveform resolves into something simple and clean
2. A brief follow-up phase: lights dim, a final visual plays, the sound fades to a single tone
3. A quiet end screen. No fanfare. Just out.

---

## Visual / Aesthetic Direction

- Dark background, muted palette
- Soft glow on the portal — not neon, more phosphor
- Winamp-era layout nostalgia, but sadder
- Animations: slow, deliberate, never frantic
- Typography: monospace for controls, something atmospheric for ambient labels
- The Loseamp visualizer should feel alive — responsive to state, not decorative

---

## What It's Actually About

The structure, the strategy, the metaphor — all deliberately unnamed. The puzzle *is* the explanation. The player either recognizes it or they don't.
