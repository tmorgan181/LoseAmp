/**
 * state.js
 * Central game state. Single source of truth.
 * All modules read from and write to this object.
 */

export const state = {
  // Which screen is currently visible: 'hub' | 'bright' | 'still' | 'clock' | 'mirror' | 'threshold'
  currentScreen: 'hub',

  // Inventory: items collected from rooms
  inventory: [],

  // Unlocks: which soundboard capabilities are active
  unlocks: {
    instruments: [],   // e.g. ['piano', 'bass', 'pad', 'noise']
    effects: [],       // e.g. ['reverb', 'delay', 'distortion', 'filter']
    bpmRange: [60, 80], // [min, max] — expands as rooms are cleared
    sequencerRows: 2,  // starts limited, expands
    lightModes: [],    // e.g. ['warm', 'cool', 'pulse', 'strobe']
  },

  // Soundboard: current settings
  soundboard: {
    bpm: 72,
    activeInstruments: [],
    sequence: [],        // 2D array: [row][step] = bool
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

  // Room flags: tracks state per room across visits
  rooms: {
    bright:    { visited: false, cleared: false, flags: {} },
    still:     { visited: false, cleared: false, flags: {} },
    clock:     { visited: false, cleared: false, flags: {} },
    mirror:    { visited: false, cleared: false, flags: {} },
    threshold: { visited: false, cleared: false, flags: {} },
  },

  // Boss sequence
  boss: {
    active: false,
    phase: null,       // 'leadup' | 'puzzle' | 'escape'
    holdStart: null,   // timestamp when correct state first achieved
    escaped: false,
  },
};

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
export function resetState() {
  // TODO
}
