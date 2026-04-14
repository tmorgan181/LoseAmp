/**
 * state.js
 * Central game state. Single source of truth.
 * All modules read from and write to this object.
 */

function createGameState() {
  return {
    currentScreen: 'hub',
    inventory: [],
    unlocks: {
      instruments: ['piano', 'bass'],
      effects: ['reverb', 'filter'],
      bpmRange: [15, 80],
      sequencerRows: 2,
      lightModes: ['balanced'],
    },
    soundboard: {
      bpm: 72,
      activeInstruments: [],
      sequence: [],
      presets: [null, null, null],
      effects: {
        reverb: 0,
        delay: 0,
        distortion: 0,
        filter: 0.5,
      },
      lights: {
        warm: 0,
        cool: 0,
        mode: null,
      },
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
    meta: {
      routeMode: 'game',
      awakened: false,
      titleDismissed: false,
    },
  };
}

function createDemoState() {
  const state = createGameState();
  state.unlocks = {
    instruments: ['piano', 'bass', 'pad', 'noise'],
    effects: ['reverb', 'delay', 'distortion', 'filter'],
    bpmRange: [15, 90],
    sequencerRows: 4,
    lightModes: ['balanced', 'warm', 'cool', 'pulse', 'strobe'],
  };
  state.meta.routeMode = 'demo';
  state.meta.awakened = true;
  state.meta.titleDismissed = true;
  return state;
}

export const state = createGameState();

export function configureState(mode = 'game') {
  const next = mode === 'demo' ? createDemoState() : createGameState();
  replaceState(next);
}

function replaceState(nextState) {
  for (const key of Object.keys(state)) {
    delete state[key];
  }
  Object.assign(state, nextState);
}

/**
 * loadState()
 * Load persisted state from localStorage if available.
 * Falls back to defaults above.
 */
export function loadState() {
  // TODO: implement persistence
}

/**
 * saveState()
 * Persist current state to localStorage.
 */
export function saveState() {
  // TODO: implement persistence
}

/**
 * resetState()
 * Wipe state back to defaults (new game).
 */
export function resetState(mode = state.meta?.routeMode || 'game') {
  configureState(mode);
}
