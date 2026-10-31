const pitches = { Transit: 660, 'Radial Velocity': 520, Imaging: 740, Microlensing: 440, Timing: 350, Other: 590 };
let context;
let enabled = false;
let lastTick = -Infinity;

export async function enableTicks() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  context ||= new AudioContextClass();
  if (context.state === 'suspended') await context.resume();
  enabled = true;
  return true;
}

export function disableTicks() { enabled = false; }

export function playDiscoveryTick(method) {
  if (!enabled || !context || context.state !== 'running') return;
  const now = context.currentTime;
  if (now - lastTick < 0.1) return;
  lastTick = now;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = pitches[method] || pitches.Other;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.009, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(now); oscillator.stop(now + 0.12);
}
