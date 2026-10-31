/**
 * Tiny synthesized paper sounds — no audio files, all WebAudio.
 * crumple (buttons), stamp thunk (trades), coins (profit), sad slide (loss).
 */

let ctx: AudioContext | null = null;
let muted = false;
let noise: AudioBuffer | null = null;

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuf(a: AudioContext) {
  if (!noise) {
    noise = a.createBuffer(1, (a.sampleRate * 0.3) | 0, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Paper crumple — filtered noise burst. */
export function crumple() {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuf(a);
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(1200, t);
  f.frequency.exponentialRampToValueAtTime(2600, t + 0.12);
  f.Q.value = 0.7;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + 0.2);
}

/** Rubber-stamp thunk. */
export function stampSound() {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.11);
  const g = a.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.15);

  const src = a.createBufferSource();
  src.buffer = noiseBuf(a);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 350;
  const ng = a.createGain();
  ng.gain.setValueAtTime(0.12, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(lp).connect(ng).connect(a.destination);
  src.start(t);
  src.stop(t + 0.1);
}

/** Two bright blips for a profitable sale. */
export function coinSound() {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  [[987, 0], [1318, 0.09]].forEach(([freq, dt]) => {
    const o = a.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.exponentialRampToValueAtTime(0.08, t + dt + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.14);
    o.connect(g).connect(a.destination);
    o.start(t + dt);
    o.stop(t + dt + 0.16);
  });
}

/** Sliding down note for a loss. */
export function sadSound() {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.28);
  const g = a.createGain();
  g.gain.setValueAtTime(0.07, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.32);
}

/** Pen scratch — tiny noise swipe for signature strokes. */
export function signSound() {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuf(a);
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(1700 + Math.random() * 900, t);
  f.frequency.exponentialRampToValueAtTime(700, t + 0.05);
  f.Q.value = 1.4;
  const g = a.createGain();
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + 0.08);
}
