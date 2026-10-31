import { create } from 'zustand';
import { applyLocalConditions, computeSurvival } from '../sim/survival.js';

export const FIXED_STEP = 0.05;
let carry = 0;
let descentElapsed = 0;
let descentTicks = 0;
let aliveTicks = 0;

const initial = {
  phase: 'select', planet: null, sim: null, health: 100, elapsed: 0,
  descentElapsed: 0, history: [], narrationLines: [], sessionLeaderboard: [], muted: false,
  baseSim: null, playerState: { s: 0.6, sheltered: false, stamina: 100, terminatorBearing: 180 },
  runMetrics: { distanceWalked: 0, timeSheltered: 0, closestApproachToTerminator: null }, pointerLocked: false, hasPointerLocked: false,
};

export const useGame = create((set, get) => ({
  ...initial,
  selectPlanet: (planet) => { const sim = computeSurvival(planet); set({ planet, sim, baseSim: sim, phase: 'select' }); },
  drop: (planet = get().planet) => {
    if (!planet) return;
    carry = 0; descentElapsed = 0; descentTicks = 0; aliveTicks = 0;
    const sim = computeSurvival(planet);
    set({ planet, sim, baseSim: sim, playerState: { s: 0.6, sheltered: false, stamina: 100, terminatorBearing: 180 }, runMetrics: { distanceWalked: 0, timeSheltered: 0, closestApproachToTerminator: sim.tidallyLocked ? 240 : null }, pointerLocked: false, phase: 'descent', health: 100, elapsed: 0, descentElapsed: 0, history: [{ t: 0, health: 100 }], narrationLines: [] });
  },
  tick: (dt) => {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const accumulated = carry + dt;
    const steps = Math.floor((accumulated + 1e-10) / FIXED_STEP);
    carry = accumulated - steps * FIXED_STEP;
    if (carry < 0 && carry > -1e-8) carry = 0;
    for (let stepIndex = 0; stepIndex < steps; stepIndex++) {
      const state = get();
      if (state.phase === 'descent') {
        descentTicks += 1;
        descentElapsed = Math.min(3, descentTicks * FIXED_STEP);
        set({ descentElapsed, ...(descentTicks >= 60 ? { phase: 'alive' } : {}) });
        continue;
      }
      if (state.phase !== 'alive' || !state.sim) continue;
      const localSim = applyLocalConditions(state.baseSim || state.sim, state.playerState);
      const previousMetrics = state.runMetrics || initial.runMetrics;
      const closestNow = state.baseSim?.tidallyLocked ? Math.abs(Number(state.playerState?.s) || 0) * 400 : null;
      const runMetrics = {
        ...previousMetrics,
        timeSheltered: Number((previousMetrics.timeSheltered + (state.playerState?.sheltered ? FIXED_STEP : 0)).toFixed(2)),
        closestApproachToTerminator: closestNow == null ? null : Math.min(previousMetrics.closestApproachToTerminator ?? Infinity, closestNow),
      };
      aliveTicks += 1;
      const elapsed = Math.min(60, aliveTicks * FIXED_STEP);
      const health = Math.max(0, state.health - localSim.totalDps * FIXED_STEP);
      const done = health <= 0 || elapsed >= 60;
      const phase = health <= 0 ? 'dead' : elapsed >= 60 ? 'survived' : 'alive';
      let history = state.history;
      if (aliveTicks % 5 === 0 || done) {
        history = [...history, { t: elapsed, health }];
      }
      const sessionLeaderboard = done ? [...state.sessionLeaderboard, {
        planet: state.planet?.pl_name || 'Unknown planet', survivalTime: elapsed,
        causeOfDeath: phase === 'dead' ? localSim.hazards.find(h => h.id === localSim.cause)?.label || localSim.cause : 'Survived',
        outcome: phase,
      }] : state.sessionLeaderboard;
      set({ elapsed, health, history, phase, sessionLeaderboard, sim: localSim, runMetrics });
    }
  },
  setNarrationLines: (narrationLines) => set({ narrationLines: Array.isArray(narrationLines) ? narrationLines : [] }),
  reset: () => { const state=get(); carry = 0; descentElapsed = 0; descentTicks = 0; aliveTicks = 0; set({ ...initial, planet:state.planet, sim:state.sim, muted: state.muted, sessionLeaderboard: state.sessionLeaderboard }); },
  toggleMuted: () => set(s => ({ muted: !s.muted })),
  setStamina: (stamina) => set(s => ({ playerState: { ...s.playerState, stamina: Math.max(0, Math.min(100, Number(stamina) || 0)) } })),
  setPlayerState: (patch) => set(s => ({ playerState: { ...s.playerState, ...patch, s: Math.max(-1, Math.min(1, Number.isFinite(Number(patch.s)) ? Number(patch.s) : s.playerState.s)), stamina: Math.max(0, Math.min(100, Number.isFinite(Number(patch.stamina)) ? Number(patch.stamina) : s.playerState.stamina)) } })),
  setRunMetrics: (patch = {}) => set(s => ({ runMetrics: {
    ...s.runMetrics,
    ...(Number.isFinite(Number(patch.distanceWalked)) ? { distanceWalked: Math.max(0, Number(patch.distanceWalked)) } : {}),
    ...(Number.isFinite(Number(patch.timeSheltered)) ? { timeSheltered: Math.max(0, Number(patch.timeSheltered)) } : {}),
    ...(Object.hasOwn(patch, 'closestApproachToTerminator') && (patch.closestApproachToTerminator == null || Number.isFinite(Number(patch.closestApproachToTerminator))) ? { closestApproachToTerminator: patch.closestApproachToTerminator == null ? null : Math.max(0, Number(patch.closestApproachToTerminator)) } : {}),
  } })),
  setPointerLocked: (pointerLocked) => set({ pointerLocked: Boolean(pointerLocked), ...(pointerLocked ? { hasPointerLocked: true } : {}) }),
}));
