# LoseAmp

A browser-based escape room built around a central soundwave portal called the **Loseamp**.

No explicit narrative. No direct references to what it's actually about. You have to be looking for the signs and know the strategy.

---

## Structure

```
index.html          — entry point, renders the Loseamp hub
DESIGN.md           — full game design document
src/
  main.js           — bootstraps the app, wires modules together
  state.js          — central game state (inventory, unlocks, room flags)
  loseamp/
    portal.js       — the central soundwave portal (canvas visualizer)
    controls.js     — the soundboard control panel
    lights.js       — stage lighting system
  audio/
    engine.js       — Web Audio API wrapper
  rooms/
    manager.js      — room routing, transitions, door logic
    bright.js       — room 1
    still.js        — room 2
    clock.js        — room 3
    mirror.js       — room 4 (mirror world, accessed via Loseamp portal)
    threshold.js    — room 5 (the exit room)
  puzzle/
    logic.js        — puzzle validation, inventory use, unlock conditions
styles/
  main.css          — global styles, CSS variables, typography
  loseamp.css       — hub/portal styles
  rooms.css         — shared room styles
assets/             — audio samples, images, etc.
```

## Stack

Vanilla HTML/CSS/JS with ES modules. No build step required — open `index.html` in a browser or run a simple dev server.

```bash
npx serve .
```

## Design

See [DESIGN.md](./DESIGN.md) for the full game design document including room descriptions, puzzle logic, and the final boss sequence.
