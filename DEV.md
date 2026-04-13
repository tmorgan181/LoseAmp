# LoseAmp — Development Notes

Quick reference for anyone picking up a module.

## Running

```bash
npx serve .
# or
python -m http.server 8080
```
No build step. ES modules via `type="module"`.

## Module Contracts

### state.js
Single import. Never mutate state without calling `saveState()` after.

### puzzle/logic.js → checkPuzzleState(state)
Call this after every soundboard change. It handles boss phase internally.

### loseamp/portal.js → initPortal(canvas)
The render loop is self-sustaining. It reads from state on each frame — no need to push updates to it.

### rooms/manager.js → exitRoom()
All rooms call this to return to hub. It re-evaluates doors on return.

## The Answer

The final puzzle answer is defined in `puzzle/logic.js → isConcertSolved()`.
Do not encode the answer in comments in other files.

## Aesthetic Notes

- Dark. Slow. Never frantic.
- The portal is alive, not decorative.
- The answer looks like nothing special. That's the point.
