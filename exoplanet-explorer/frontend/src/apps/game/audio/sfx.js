import { useGame } from '../store/useGame.js';

let context;
let master;
let rumble = null;
let heartbeatTimer = null;
let crackleTimer = null;
let heartbeatActive = false;
let crackleActive = false;
let noiseBuffer = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.68;
    master.connect(context.destination);
  }
  return context;
}

// Call only from a user-initiated event (drop, unmute). No module-load audio work.
export async function unlockAudio() {
  if (useGame.getState().muted) return false;
  const ctx = getContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running';
  } catch { return false; }
}

function makeNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const length = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) channel[i] = (Math.random() * 2 - 1) * .7;
  return noiseBuffer;
}

export function playTone(freq = 440, duration = .12, type = 'sine', volume = .08) {
  const ctx = context;
  if (!ctx || !master || useGame.getState().muted) return;
  try {
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const now = ctx.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now + duration);
  } catch { /* Optional audio never affects the simulation. */ }
}

function thump(volume, at = context?.currentTime || 0) {
  if (!context || !master || useGame.getState().muted) return;
  const osc = context.createOscillator(); const gain = context.createGain(); const filter = context.createBiquadFilter();
  osc.type = 'sine'; osc.frequency.setValueAtTime(76, at); osc.frequency.exponentialRampToValueAtTime(42, at + .13);
  filter.type = 'lowpass'; filter.frequency.value = 115; filter.Q.value = .7;
  gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + .19);
  osc.connect(filter); filter.connect(gain); gain.connect(master); osc.start(at); osc.stop(at + .2);
}

// Short synthesized ground contact; its low-pass pitch falls as surface gravity rises.
export function playFootstep(gravity = 1, landing = false) {
  if (!context || context.state !== 'running' || !master || useGame.getState().muted) return;
  try {
    const ctx = context; const now = ctx.currentTime;
    const source = ctx.createBufferSource(); const filter = ctx.createBiquadFilter(); const gain = ctx.createGain();
    source.buffer = makeNoiseBuffer(ctx);
    filter.type = 'lowpass'; filter.frequency.value = Math.max(105, Math.min(650, 560 / Math.sqrt(Math.max(.3, gravity)))); filter.Q.value = .7;
    const volume = landing ? Math.min(.19, .035 + Math.max(.2, gravity) * .025) : .028;
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (landing ? .18 : .105));
    source.connect(filter); filter.connect(gain); gain.connect(master);
    source.start(now, Math.random() * .6, landing ? .18 : .11); source.stop(now + (landing ? .19 : .12));
  } catch { /* Sound is optional and never gates the game. */ }
}

function currentRadiationSeverity() {
  const { sim } = useGame.getState();
  return Math.max(0, Math.min(1, sim?.hazards.find(h => h.id === 'radiation')?.sev || 0));
}

function scheduleHeartbeat() {
  if (!heartbeatActive) return;
  const state = useGame.getState();
  if (state.phase !== 'alive' || state.muted) { stopHeartbeat(); return; }
  const danger = Math.max(0, Math.min(1, 1 - state.health / 100));
  const bpm = 60 + danger * 110;
  const volume = .025 + danger * .16;
  const now = context.currentTime;
  thump(volume, now);
  thump(volume * .58, now + .12);
  heartbeatTimer = window.setTimeout(scheduleHeartbeat, 60000 / bpm);
}

function startHeartbeat() {
  if (heartbeatActive || !context || useGame.getState().muted) return;
  heartbeatActive = true;
  scheduleHeartbeat();
}

function stopHeartbeat() {
  heartbeatActive = false;
  if (heartbeatTimer != null) window.clearTimeout(heartbeatTimer);
  heartbeatTimer = null;
}

function geigerClick(severity) {
  if (!context || !master || useGame.getState().muted) return;
  const ctx = context; const now = ctx.currentTime;
  const osc = ctx.createOscillator(); const filter = ctx.createBiquadFilter(); const gain = ctx.createGain();
  osc.type = 'square'; osc.frequency.setValueAtTime(1700 + Math.random() * 2500, now);
  filter.type = 'bandpass'; filter.frequency.value = 3800; filter.Q.value = .8;
  gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.012 + severity * .045, now + .0015); gain.gain.exponentialRampToValueAtTime(.0001, now + .018 + Math.random() * .012);
  osc.connect(filter); filter.connect(gain); gain.connect(master); osc.start(now); osc.stop(now + .034);
}

function scheduleCrackle() {
  if (!crackleActive) return;
  const state = useGame.getState();
  if (state.phase !== 'alive' || state.muted) { stopCrackle(); return; }
  const severity = currentRadiationSeverity();
  geigerClick(severity);
  const clicksPerSecond = .5 + severity * 28;
  const jitter = .72 + Math.random() * .56;
  crackleTimer = window.setTimeout(scheduleCrackle, (1000 / clicksPerSecond) * jitter);
}

function startCrackle() {
  if (crackleActive || !context || useGame.getState().muted || currentRadiationSeverity() <= 0) return;
  crackleActive = true; scheduleCrackle();
}

function stopCrackle() {
  crackleActive = false;
  if (crackleTimer != null) window.clearTimeout(crackleTimer);
  crackleTimer = null;
}

export function startDescentRumble() {
  if (useGame.getState().muted) return;
  const ctx = getContext();
  if (!ctx || rumble) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const source = ctx.createBufferSource(); const lowpass = ctx.createBiquadFilter(); const gain = ctx.createGain();
  source.buffer = makeNoiseBuffer(ctx); source.loop = true;
  lowpass.type = 'lowpass'; lowpass.frequency.setValueAtTime(150, ctx.currentTime); lowpass.frequency.linearRampToValueAtTime(230, ctx.currentTime + 2.8);
  gain.gain.setValueAtTime(.0001, ctx.currentTime); gain.gain.linearRampToValueAtTime(.105, ctx.currentTime + .55);
  source.connect(lowpass); lowpass.connect(gain); gain.connect(master); source.start();
  rumble = { source, gain };
}

export function stopDescentRumble() {
  if (!rumble || !context) return;
  const old = rumble; rumble = null;
  try {
    old.gain.gain.cancelScheduledValues(context.currentTime);
    old.gain.gain.setTargetAtTime(.0001, context.currentTime, .12);
    old.source.stop(context.currentTime + .55);
  } catch { /* Already stopped. */ }
}

export function startSurvivalAudio() {
  if (!context || useGame.getState().muted) return;
  startHeartbeat(); startCrackle();
}

export function stopSurvivalAudio() {
  stopHeartbeat(); stopCrackle();
}

export function syncAudioToGame() {
  if (useGame.getState().muted || !context) return;
  const phase = useGame.getState().phase;
  if (phase === 'descent') startDescentRumble(); else stopDescentRumble();
  if (phase === 'alive') startSurvivalAudio(); else stopSurvivalAudio();
}

export function stopAllAudio() {
  stopSurvivalAudio(); stopDescentRumble();
}

export function setMutedAudio(muted) {
  if (muted) stopAllAudio();
  if (master && context) {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(muted ? .0001 : .68, context.currentTime, .025);
  }
}

export function playDeathFlatline() {
  if (!context || useGame.getState().muted) return;
  stopSurvivalAudio(); stopDescentRumble();
  const ctx = context; const osc = ctx.createOscillator(); const gain = ctx.createGain(); const now = ctx.currentTime;
  osc.type = 'sine'; osc.frequency.setValueAtTime(680, now);
  gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(.065, now + .08); gain.gain.setValueAtTime(.065, now + .72); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.35);
  osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now + 1.4);
}

export function playSurvivalChime() {
  if (!context || useGame.getState().muted) return;
  stopSurvivalAudio(); stopDescentRumble();
  const notes = [{ f: 523.25, t: 0 }, { f: 659.25, t: .16 }, { f: 783.99, t: .32 }, { f: 1046.5, t: .53 }];
  for (const note of notes) {
    const osc = context.createOscillator(); const gain = context.createGain(); const at = context.currentTime + note.t;
    osc.type = 'sine'; osc.frequency.value = note.f;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(.07, at + .025); gain.gain.exponentialRampToValueAtTime(.0001, at + .48);
    osc.connect(gain); gain.connect(master); osc.start(at); osc.stop(at + .5);
  }
}

export function playOutcome(survived) {
  if (survived) playSurvivalChime(); else playDeathFlatline();
}
