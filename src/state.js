/**
 * state.js
 * Central game state. Single source of truth.
 * All modules read from and write to this object.
 */

export const SEQUENCE_STEPS = 16;
export const PRESET_SLOTS = 3;
export const MAX_SEQUENCER_ROWS = 4;
export const SUPPORTED_INSTRUMENTS = ['piano', 'bass', 'pad', 'noise'];
export const SUPPORTED_EFFECTS = ['reverb', 'delay', 'distortion', 'filter'];
export const SUPPORTED_LIGHT_MODES = ['warm', 'cool', 'balanced', 'pulse', 'strobe'];

function createEffectState(overrides = {}) {
  return {
    reverb: 0,
    delay: 0,
    distortion: 0,
    filter: 0.5,
    ...overrides,
  };
}

function createChannelEffects() {
  return Object.fromEntries(
    SUPPORTED_INSTRUMENTS.map(name => [name, createEffectState()]),
  );
}

function createSequence(rows, activeStepsByRow = []) {
  return Array.from({ length: rows }, (_, rowIndex) => {
    const activeSteps = activeStepsByRow[rowIndex] || [];
    return Array.from({ length: SEQUENCE_STEPS }, (_, stepIndex) => activeSteps.includes(stepIndex));
  });
}

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
      bpm: 48,
      volume: 0.5,
      activeInstruments: ['bass'],
      sequence: createSequence(2, [
        [1, 5, 9],
        [1, 5, 9],
      ]),
      presets: Array.from({ length: PRESET_SLOTS }, () => null),
      effects: createEffectState(),
      channelEffects: createChannelEffects(),
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
      starterBoardSeeded: false,
    },
  };
}

function createDemoState() {
  const state = createGameState();
  state.unlocks = {
    instruments: [...SUPPORTED_INSTRUMENTS],
    effects: [...SUPPORTED_EFFECTS],
    bpmRange: [15, 90],
    sequencerRows: MAX_SEQUENCER_ROWS,
    lightModes: [...SUPPORTED_LIGHT_MODES],
  };
  state.soundboard.bpm = 72;
  state.soundboard.volume = 0.5;
  state.soundboard.activeInstruments = [...SUPPORTED_INSTRUMENTS];
  state.soundboard.sequence = createSequence(MAX_SEQUENCER_ROWS, [
    [0, 4, 8, 12],
    [2, 6, 10, 14],
    [0, 3, 8, 11],
    [1, 5, 9, 13],
  ]);
  state.soundboard.presets = Array.from({ length: PRESET_SLOTS }, () => null);
  state.soundboard.effects = createEffectState({
    reverb: 0.5,
    delay: 0.35,
    distortion: 0.12,
    filter: 0.5,
  });
  state.soundboard.channelEffects = createChannelEffects();
  state.soundboard.channelEffects.piano = createEffectState({
    reverb: 0.38,
    delay: 0.16,
    distortion: 0,
    filter: 0.6,
  });
  state.soundboard.channelEffects.bass = createEffectState({
    reverb: 0.12,
    delay: 0.08,
    distortion: 0.1,
    filter: 0.42,
  });
  state.soundboard.channelEffects.pad = createEffectState({
    reverb: 0.58,
    delay: 0.3,
    distortion: 0,
    filter: 0.64,
  });
  state.soundboard.channelEffects.noise = createEffectState({
    reverb: 0.18,
    delay: 0.12,
    distortion: 0.22,
    filter: 0.35,
  });
  state.soundboard.lights = {
    warm: 0.5,
    cool: 0.5,
    mode: 'balanced',
  };
  state.soundboard.mirrorActive = true;
  state.rooms.bright.cleared = true;
  state.rooms.still.cleared = true;
  state.rooms.clock.cleared = true;
  state.rooms.mirror.cleared = true;
  state.rooms.threshold.cleared = true;
  state.meta.routeMode = 'demo';
  state.meta.awakened = true;
  state.meta.titleDismissed = true;
  state.meta.starterBoardSeeded = true;
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

const STORAGE_KEY = 'loseamp-state';

/**
 * saveState()
 * Persist current state to localStorage.
 * No-op in demo mode.
 */
export function saveState() {
  if (state.meta?.routeMode === 'demo') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) { /* quota exceeded or private browsing */ }
}

/**
 * loadState()
 * Overlay persisted state onto current state.
 * Deep-merges with defaults so new schema fields always have values.
 * Falls back to defaults on any error.
 */
export function loadState() {
  if (state.meta?.routeMode === 'demo') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.meta?.routeMode !== 'game') return;
    replaceState(deepMerge(createGameState(), saved));
  } catch (_) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
  }
}

export function seedStarterBoard() {
  if (state.meta?.routeMode === 'demo') return false;
  if (state.meta?.starterBoardSeeded) return false;
  if (state.rooms?.clock?.cleared) return false;
  if (state.unlocks?.instruments?.length !== 2) return false;

  state.soundboard.bpm = 48;
  state.soundboard.activeInstruments = ['bass'];
  state.soundboard.sequence = createSequence(2, [
    [1, 5, 9],
    [1, 5, 9],
  ]);
  state.meta.starterBoardSeeded = true;
  saveState();
  return true;
}

/**
 * resetState()
 * Wipe state back to defaults and clear persistence.
 */
export function resetState(mode = state.meta?.routeMode || 'game') {
  configureState(mode);
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
}

/**
 * deepMerge(base, override)
 * Recursively merge override into base. Arrays are replaced wholesale.
 */
function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override)) {
    const bv = base[key];
    const ov = override[key];
    if (
      ov !== null && typeof ov === 'object' && !Array.isArray(ov) &&
      bv !== null && typeof bv === 'object' && !Array.isArray(bv)
    ) {
      out[key] = deepMerge(bv, ov);
    } else {
      out[key] = ov;
    }
  }
  return out;
}
