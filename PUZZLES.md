# LoseAmp — Puzzle Design

This document defines the full interconnected puzzle system.
Each room teaches exactly one element of the final answer. Nothing is labeled.
Read alongside DESIGN.md and AGENT.md.

---

## The Final Answer (from `puzzle/logic.js`)

```
BPM:          72
Instruments:  piano + bass (only)
Sequencer:    beats 1, 5, 9, 13 active (four-on-the-floor, rows 1 and 2)
Reverb:       0.45–0.55
Delay:        0.3–0.4
Distortion:   0
Filter:       0.45–0.55
Lights warm:  0.45–0.55
Lights cool:  0.45–0.55
Light mode:   'balanced'
Hold:         8 seconds
```

Update `isConcertSolved()` in `puzzle/logic.js` to include the sequencer pattern check.
Add a `sequenceMatches(target, actual)` helper — check that at minimum the required steps are active.

---

## Puzzle Interconnection Map

```
Room 1 (Bright)   →  instruments:   piano, bass
Room 2 (Still)    →  BPM:           72
Room 3 (Clock)    →  sequence:      [1,5,9,13] + hold: 8s
Room 4 (Mirror)   →  effects:       reverb/delay/filter positions
Room 5 (Threshold)→  lights:        balanced (symmetry — you had to achieve it to get in)
```

Each piece is inert without the others. You cannot guess the final state from one room alone.

---

## Room 1 — Bright: The Signal

**What the player sees:**
An overwhelming particle field. 80–120 particles drifting, spawning, dying. Visually beautiful and hard to parse. No obvious interactive elements.

**The puzzle:**
At a random interval between 30–50 seconds, particles momentarily organize — pulled toward two focal points near the center-left and center-right of the canvas. For about 2.5 seconds, the swarm at each point forms a loose silhouette: a piano (left) and a bass (right). Then the particles scatter back to chaos.

The event repeats indefinitely. Players who aren't watching miss it. Players who are learn: these two, not the others.

**Implementation notes:**
- Use a force-field approach: each particle has a velocity vector. During the "reveal" window, add an attraction force toward the two focal points.
- The silhouettes don't have to be perfect — just suggestive. A cluster at each position is enough.
- No text. No label. Just the shape.
- After the player has seen the reveal once (click anywhere during the reveal window), `state.rooms.bright.flags.signalSeen = true`. The event still repeats but room is now "clearable."
- Interacting with either focal point during a reveal collects the item: adds `'piano'` and `'bass'` to `state.inventory` and unlocks them on the soundboard.
- After collecting: room is cleared. Particles slow to about 40% speed. Something is quieter.

**What unlocks:** `state.unlocks.instruments` gets `'piano'` and `'bass'`. Also unlocks the mirror portal toggle button on the control panel (a small symmetric icon — gives no instruction, player has to figure out what it does).

---

## Room 2 — Still: The Coordinate

**What the player sees:**
An 11x11 grid of faint dots on near-black. Almost nothing moves. Completely silent (no audio context events here). One dot is missing.

**The puzzle:**
The grid is 0-indexed, 0–10 on each axis. The missing dot is always at row 7, column 2. The axes have no labels initially.

After 8 seconds in the room, axis labels fade in — numbers 0–10 along the top and left edges, very faint. The missing dot's absence now reads: column 2, row 7. Or written as a value: **72**.

Players who leave before 8 seconds see nothing useful. Players who stay learn patience AND get the number.

**Secondary encoding:**
The number 8 appears implicitly — it's how long you had to wait. This is the first hint that 8 is meaningful (it's also the hold duration).

**Implementation notes:**
- Grid: CSS grid or canvas. Dots are small circles, ~4px, `rgba(80,90,100,0.4)`.
- The missing dot's grid position is `(col=2, row=7)`. Do not randomize this — it must always be 72.
- After 8s: axis numbers fade in with `opacity` transition over 3 seconds.
- Clicking the empty space at (2,7) after labels are visible collects the item: adds `72` to `state.inventory` as a "frequency code."
- This code is used by `controls.js` — it sets `state.soundboard.bpm = 72` and locks the BPM input to that value (the input still shows, but is grayed and reads "72 ░░"). Player has to manually set it to 72 to activate it — the lock just means they now know the answer, not that it's set for them.

**What unlocks:** BPM knowledge. `state.unlocks.bpmRange` doesn't change — but the player now knows the target.

---

## Room 3 — Clock: The Pattern

**What the player sees:**
A single circle at center, pulsing at 72 BPM (always 72, regardless of current soundboard BPM). A counter in the corner, very small: `0 / 8`. Nothing else.

**The puzzle:**
Click the circle at the peak of each pulse. Each successful hit increments the counter. Miss = reset to 0.

**As the player succeeds, something builds:**
After each hit, a small dot appears in a horizontal row at the bottom of the screen — 16 positions, spaced evenly. Hits land on positions 1, 5, 9, 13 (the four-on-the-floor pattern), because the pulse repeats every 4 steps. The dots that fill in are always at those positions. By the time the player reaches 8/8, the full pattern is visible:

```
● · · · ● · · · ● · · · ● · · ·
```

This is the sequencer pattern. The player should recognize it as a 16-step grid — the same grid they've seen on the Loseamp control panel.

**On clear (8/8):**
- A brief pause. The pattern stays on screen for 5 seconds.
- Then: room cleared, back to hub.
- Unlocks: `state.unlocks.sequencerRows` goes to 4, expanding the grid. Also flags that the pattern was learned: `state.rooms.clock.flags.pattern = [1,5,9,13]`.
- The Loseamp sequencer now has 4 rows and 16 columns. The player must manually enter the pattern.

**The 8 again:**
The counter "8" is the most prominent number in the room. This is the third time 8 appears (once in Still as wait time, once as clock hits, once as the hold timer — though the last one isn't visible yet). By the end, 8 is just part of the fabric.

**What unlocks:** Sequencer rows 3 and 4. The required pattern is known.

---

## Room 4 — Mirror: The Reflection

**Accessing the mirror room:**
The mirror portal on the Loseamp control panel is a toggle. It only activates (opens `#room-mirror`) when `state.soundboard.lights.warm` and `state.soundboard.lights.cool` are within 0.05 of each other — symmetric. If they're not equal, clicking the toggle does nothing (or the portal flickers and dies).

This is not explained anywhere. The player discovers it by experimentation. Equalizing the lights is a puzzle in itself — and it's also part of the final answer.

**What the player sees:**
The mirror room renders a reflected version of the Loseamp control panel — specifically the effects section. The sliders are shown as a horizontal row of vertical bars (like a tiny EQ display). They're set to specific positions:

```
Reverb:      ||||||||░░  (roughly 50%)
Delay:       ██████░░░░  (roughly 35%)
Distortion:  ░░░░░░░░░░  (zero — empty bar)
Filter:      |||||░░░░░  (roughly 50%)
```

But the display is horizontally mirrored — left is right. So "Reverb" label appears on the right, "Filter" on the left. The player has to flip the image mentally to read the values.

**The coded values:**
The bar positions encode: reverb ≈ 0.5, delay ≈ 0.35, distortion = 0, filter ≈ 0.5. These are the target effect levels.

**Distortion = zero is important:**
The empty distortion bar stands out. The player may not even have distortion unlocked yet — but they know it should be absent.

**What else is in the room:**
The number 8 appears once, very faintly, in the bottom right corner. Not labeled. Not explained. The third time they've seen it.

**Also**: delay effect is unlocked by visiting this room — `state.unlocks.effects` gets `'delay'`. The player now has all four effect sliders available.

**What unlocks:** `'delay'` effect. Knowledge of effect target levels. Understanding that symmetry (lights = equal) is load-bearing.

---

## Room 5 — Threshold: The Gate

**Accessing Threshold:**
The door only appears when the Loseamp is in the middle state. Specifically: BPM between 68–78, at least one of piano/bass active, no distortion, lights warm and cool both above 0.3. This is loose — the player doesn't need the full answer to get in, just to be in the right neighborhood.

**What the player sees:**
The sparsest room. Dark. A door outline in the center, very faint. The door does not glow or call attention to itself.

After 3 seconds: one line of monospace text fades in above the door:

```
stay in the middle
```

That's all. No other text ever. On revisit, no text — just the door.

**Clicking the door:**
Triggers `onExitDoorInteract(state)` → returns to hub → triggers boss lead-up.

**What this room does:**
Confirms the metaphor directly, once. The player who has all the other pieces understands immediately. The player who doesn't has one more thing to sit with.

---

## Mirror Portal Puzzle (Hub mechanic)

The mirror portal toggle appears on the control panel after Room 1 is cleared.

**Discovery puzzle:**
- Toggle does nothing if lights are asymmetric
- Toggle activates (portal visual changes, door to Room 4 appears) if `|warm - cool| < 0.05`
- Visual feedback when symmetric: the portal canvas gains the symmetry overlay (a faint vertical axis line through center, waveforms become left-right mirrored)
- Visual feedback when asymmetric: toggle button flickers briefly, nothing else

This mechanic teaches the player that symmetry = access. It's a direct physical metaphor for the final answer's balance condition.

---

## Cross-Room Dependencies (summary)

```
Bright cleared    → mirror portal toggle appears on control panel
Still visited 8s  → player knows BPM = 72
Clock cleared     → sequencer rows expand, pattern known
Mirror accessed   → requires light symmetry (teaches balance)
Mirror visited    → delay unlocked, effect levels known
Threshold visited → boss lead-up triggered
```

All five clues in hand:
- Instruments: piano + bass (Bright)
- BPM: 72 (Still)
- Sequence: [1,5,9,13] (Clock)
- Effects: reverb 0.5, delay 0.35, distortion 0, filter 0.5 (Mirror)
- Balance: lights equal and warm (Mirror access + Threshold text)

Set all of these. Hold for 8 seconds. Out.

---

## The 8 Appearances

The number 8 appears in the game exactly four times, in four different contexts:

1. **Still**: wait 8 seconds for labels to appear
2. **Clock**: hit the circle 8 times in a row
3. **Mirror**: faint "8" in the corner, unlabeled
4. **Hold timer**: the actual hold duration (never shown explicitly — only the progress bar)

A player who notices may deduce the hold duration before the boss phase begins.
A player who doesn't still succeeds if they hold long enough by accident.

---

## What Not To Do

- Do not add a hint system
- Do not add tooltips, tutorials, or help text
- Do not label room doors with room names
- Do not show the player their "progress" toward the final answer
- Do not narrate the metaphor
- The word "bipolar," "medication," or any clinical term never appears anywhere in the codebase including comments
