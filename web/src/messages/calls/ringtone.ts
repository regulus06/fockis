/* ============================================================================
   FOCKIS CALL SOUNDS
   Synthesised with Web Audio, so there's no audio file to load or license.
   - ringtone: the Fockis incoming-call motif (three rising notes, repeated)
   - ringback: what the caller hears while it rings
   - ended:    a short falling tone
   Browsers only allow sound after the user has interacted with the page;
   until then, ringing falls back to vibration and the visual call screen.
============================================================================ */

let ctx: AudioContext | null = null;
let loop: number | null = null;
let vibrateLoop: number | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, gain = 0.18, type: OscillatorType = "sine") {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + start;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(gain, t + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function ringOnce() {
  // E5 → G#5 → B5, then a softer echo: bright, recognisably "Fockis".
  tone(659.25, 0, 0.32);
  tone(830.61, 0.18, 0.32);
  tone(987.77, 0.36, 0.5);
  tone(659.25, 0.95, 0.25, 0.1);
  tone(987.77, 1.12, 0.4, 0.1);
}

function ringbackOnce() {
  tone(440, 0, 0.9, 0.06);
  tone(480, 0, 0.9, 0.06);
}

export function stopSounds() {
  if (loop !== null) window.clearInterval(loop);
  if (vibrateLoop !== null) window.clearInterval(vibrateLoop);
  loop = null;
  vibrateLoop = null;
  try {
    navigator.vibrate?.(0);
  } catch {
    /* not supported */
  }
}

export function playRingtone() {
  stopSounds();
  ringOnce();
  loop = window.setInterval(ringOnce, 2600);
  try {
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400]);
      vibrateLoop = window.setInterval(() => navigator.vibrate?.([400, 200, 400]), 2600);
    }
  } catch {
    /* not supported */
  }
}

export function playRingback() {
  stopSounds();
  ringbackOnce();
  loop = window.setInterval(ringbackOnce, 3000);
}

export function playEnded() {
  stopSounds();
  tone(620, 0, 0.18, 0.12);
  tone(440, 0.2, 0.3, 0.12);
}

/** Call once from any click so later rings can make sound. */
export function unlockAudio() {
  audio();
}
