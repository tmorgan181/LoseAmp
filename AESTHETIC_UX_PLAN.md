# LoseAmp — Aesthetic & UX Upgrade Plan

This document translates the current review findings into a practical implementation plan.
It is intended to help Claude Code improve the feel of the playable build without overriding Claude Desktop's room-design ownership.

Use this alongside [DESIGN.md](./DESIGN.md), [PUZZLES.md](./PUZZLES.md), and [DEV.md](./DEV.md).

---

## Goal

Bring the current build closer to the intended identity:

- dark, restrained, phosphor-lit
- Winamp-era control surface, but sadder and quieter
- more authored than generic
- no tutorialized UX
- no gamey progress UI
- clearer interaction feedback without becoming explicit

This plan is biased toward:

- hub polish
- control-surface styling
- feedback systems
- room-adjacent atmosphere support

It deliberately avoids taking over room composition and detailed visual authorship from Claude Desktop.

---

## Current Read

The portal is the most aesthetically mature part of the project.
The rest of the app is functional, but much of it still reads as prototype UI:

- controls look like generic utility controls
- room styling is mostly skeletal
- mirror-state feedback is too subtle
- inventory/status affordances are too literal
- mobile layout reflows, but does not feel intentionally designed

The next step is not "add more stuff."
The next step is to make the existing interactions feel designed.

---

## Ownership Split

### Claude Code should own

- hub and control-panel styling
- interaction feedback
- mirror-state hub feedback
- control affordance polish
- end-state presentation polish
- responsive behavior refinement
- reducing prototype-feeling UI patterns

### Claude Desktop should own

- room composition and scene design
- per-room mood language
- final visual identity of Bright / Still / Clock / Mirror / Threshold
- atmospheric illustration-level choices

### Shared coordination point

Claude Code should expose stable DOM hooks and tasteful shared CSS primitives that Claude Desktop can build on, instead of hard-coding room visuals in JS.

---

## Priority 1

## 1. Rebuild the Hub As An Authored Surface

The hub should feel like an instrument panel, not a generic app footer.

### Targets

- Add panel framing details to the control board:
  - inset borders
  - subtle bevels
  - worn phosphor glow
  - varied panel densities rather than four equal-feeling boxes
- Give each panel a slightly distinct visual identity:
  - `tone` should feel like selector hardware
  - `sequence` should feel grid-driven and mechanical
  - `signal` should feel like calibration
  - `light` should feel ambient and low-contrast
- Introduce a layered hub background:
  - soft radial falloff behind the portal
  - low-opacity grain or scan texture
  - slight tonal variation between header, portal area, and control deck

### Avoid

- glossy sci-fi chrome
- neon saturation
- modern SaaS panel styling
- bright card-based segmentation

---

## 2. Replace Generic Controls With More Characterful Variants

The current buttons/sliders are too plain to carry the setting.

### Instruments

- Make instrument buttons feel like old toggle selectors:
  - narrower, denser, more tactile
  - stronger inactive/active states
  - subtle pressed-in behavior
- Introduce grouping rhythm:
  - active tones should visually “sit forward”
  - inactive ones should feel dormant, not merely disabled

### Sequencer

- Make the 16-step grid feel like the emotional center of the control panel:
  - clearer spacing rhythm in groups of 4
  - softer inactive cells
  - stronger playhead sweep
  - more satisfying active-cell illumination
- Visually separate BPM from the step field so the eye reads tempo first, pattern second

### Effects

- Replace raw slider rows with a more tuned “calibration strip” look:
  - shorter labels
  - stronger numerical styling
  - more deliberate spacing
- If sliders remain native, style the track and thumb to feel custom rather than default

### Lights

- Keep this area quieter than the effects panel
- Emphasize balance/symmetry visually
- Make `balanced` feel special without looking like a solution label

---

## 3. Make Mirror Activation Feel Important In The Hub

Right now, the mirror mechanic exists mostly in logic and portal drawing.
It needs a stronger physical presence.

### Targets

- Implement a visible `#mirror-portal` layer in the hub:
  - faint vertical seam or aperture
  - dormant state when unavailable
  - subtle activation state when symmetry is achieved
- When lights are near-symmetric:
  - introduce a delicate bilateral glow
  - hint at alignment without announcing success
- When the mirror toggle is pressed in an invalid state:
  - give a brief failed response
  - flicker, dim pulse, or collapse effect
  - no text, no tooltip

### UX goal

Players should feel:
"something almost opened"
instead of
"a button did nothing"

---

## Priority 2

## 4. Soften Literal Progress UI

The current inventory/status approach is useful, but too explicit for the tone.

### Targets

- Recast inventory as fragments, traces, or artifacts instead of game rewards
- Reduce the “badge” feeling:
  - quieter borders
  - less label-like contrast
  - more ambient placement
- Keep useful state support, but avoid overtly gamified language

### Direction

Inventory should feel like residue from rooms, not a checklist.

### If retained

Use:

- dimmer tokens
- shorter labels
- subtler spacing

Avoid:

- bright chips
- obvious status categories
- anything that reads like quest progress

---

## 5. Add Transitional Feedback Between States

A lot of the current UX changes state correctly, but not ceremonially.

### Add light-touch transitions for

- door appearance/disappearance
- mirror activation/deactivation
- boss lead-up onset
- room return to hub
- unlock arrival in the HUD/control surface

### Desired quality

- not flashy
- not loud
- just enough to make the world feel continuous

Think:

- fade and drift
- phosphor persistence
- delayed settling

Not:

- pop
- snap
- arcade-style reward bursts

---

## 6. Improve Responsive Intent, Not Just Layout

The current layout stacks acceptably on small screens, but it still feels like a squeezed desktop tool.

### Mobile targets

- Increase hit-area comfort for key controls
- Reduce simultaneous density
- Let the sequencer remain legible in grouped beats of 4
- Preserve the feeling of a single coherent console, not separate mobile cards

### Suggested strategy

- Keep visual continuity with the desktop panel
- Tighten typography and spacing selectively instead of uniformly shrinking everything
- Allow less-important chrome to recede first

---

## Priority 3

## 7. Deepen Typography And Surface Language

The current font choices are serviceable, but generic.

### Targets

- Keep monospace for controls, but tune the hierarchy more aggressively:
  - panel labels should feel archival and faint
  - values should feel more important than labels
  - ambient text should feel fragile
- Use display typography more sparingly and more intentionally
- Standardize letter-spacing rules so everything feels part of the same machine

### Surface language

Define a repeatable visual vocabulary for:

- dormant
- active
- balanced
- unstable
- hidden
- cleared

That vocabulary should show up across:

- buttons
- sequencer cells
- effect values
- room doors
- mirror states

---

## 8. Make The End Screen Land Harder, Quietly

The current ending is directionally correct, but still a little mechanical.

### Targets

- Let the environment finish fading before the word fully settles
- Make `out` feel discovered, not rendered
- Make replay affordance secondary and delayed

### Direction

The ending should feel like release, not UI completion.

---

## Implementation Guidance For Claude Code

## Good next edits

- [styles/loseamp.css](./styles/loseamp.css)
- [styles/main.css](./styles/main.css)
- [src/loseamp/controls.js](./src/loseamp/controls.js)
- [src/loseamp/lights.js](./src/loseamp/lights.js)
- [src/loseamp/portal.js](./src/loseamp/portal.js)
- [index.html](./index.html)

## Avoid for this pass

- room puzzle logic rewrites
- replacing Claude Desktop’s room compositions
- adding explanatory text
- adding tutorial UI
- adding explicit progress meters outside the boss hold bar

## Better implementation style

- prefer reusable CSS classes and variables over inline style blocks
- move visual decisions out of JS when practical
- create shared atmosphere primitives Claude Desktop can reuse
- introduce polish through restraint, not decoration volume

---

## Suggested Sequence

1. Upgrade hub background, panel framing, and control-surface styling.
2. Improve sequencer readability and playhead presence.
3. Implement visible mirror-portal feedback in the hub.
4. Soften inventory/status treatment.
5. Add transition polish for unlocks and state changes.
6. Tighten responsive behavior.
7. Refine end-screen timing and mood.

---

## Done Means

This pass is successful when:

- the control panel feels authored, not generic
- the hub can stand beside the portal aesthetically instead of depending on it
- mirror symmetry feels physically meaningful
- supporting UI becomes quieter and less gamey
- mobile feels intentional
- the app mood stays restrained and melancholic

If a change makes the game clearer but also more explicit, it is probably too much.
If a change makes the game prettier but less specific, it is probably also too much.

The target is not beauty in the abstract.
The target is a coherent instrument for this exact game.
