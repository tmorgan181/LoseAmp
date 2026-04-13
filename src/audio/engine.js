/**
 * audio/engine.js
 * Web Audio API wrapper.
 * Handles all sound output based on soundboard state.
 *
 * Responsibilities:
 * - Create and manage AudioContext
 * - Play/stop instruments based on state.soundboard.activeInstruments
 * - Apply effects chain (reverb, delay, distortion, filter) from state
 * - Run the beat sequencer on state.soundboard.bpm
 * - Expose methods for puzzle/logic.js to use (e.g. isPlaying, currentLevel)
 *
 * Note: Audio only starts after a user gesture (browser requirement).
 */

let audioCtx = null;
let masterGain = null;
let sequencerTimer = null;

/**
 * initAudio()
 * Set up AudioContext and effects chain.
 * Called from main.js — actual playback starts on first user interaction.
 */
export function initAudio() {
  // TODO: create AudioContext, set up master gain, build effects chain
}

/**
 * startSequencer()
 * Begin the beat sequencer at current BPM.
 */
export function startSequencer() {
  // TODO
}

/**
 * stopSequencer()
 */
export function stopSequencer() {
  // TODO
}

/**
 * updateFromState(state)
 * Called whenever soundboard state changes.
 * Syncs audio output to match.
 */
export function updateFromState(state) {
  // TODO: update instruments, effects, BPM, sequence
}

/**
 * getSignalLevel()
 * Returns a normalized 0–1 value of current output level.
 * Used by portal.js to drive the visualizer.
 */
export function getSignalLevel() {
  // TODO: use AnalyserNode
  return 0;
}
