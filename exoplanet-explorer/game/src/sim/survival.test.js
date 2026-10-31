import { beforeEach, describe, expect, it } from 'vitest';
import demoPlanets from '../../public/planets.json';
import { applyLocalConditions, computeSurvival, survivalPercent, survivalTuning } from './survival';
import { useGame } from '../store/useGame';

const planet = name => demoPlanets.find(p => p.pl_name === name);
const finalHealth = p => survivalPercent(computeSurvival(p), 60);
function numericModelValues(value,out=[]){if(typeof value==='number')out.push(value);else if(Array.isArray(value))value.forEach(v=>numericModelValues(v,out));else if(value&&typeof value==='object')Object.values(value).forEach(v=>numericModelValues(v,out));return out;}

describe('survival pacing requirements', () => {
  it('Earth survives 60 seconds with more than 80 health', () => {
    expect(finalHealth(planet('Earth'))).toBeGreaterThan(80);
  });

  it('TRAPPIST-1 e survives with visible danger and health between 10 and 60', () => {
    const p = planet('TRAPPIST-1 e'); const sim = computeSurvival(p); const health = finalHealth(p);
    expect(sim.timeToDeath).toBeGreaterThan(60);
    expect(health).toBeGreaterThan(10);
    expect(health).toBeLessThan(35); // Enters the pulsing red-vignette range before the demo ends.
  });

  it('55 Cnc e dies in 3–10 seconds, with thermal as its largest hazard', () => {
    const sim = computeSurvival(planet('55 Cnc e'));
    expect(sim.timeToDeath).toBeGreaterThanOrEqual(3);
    expect(sim.timeToDeath).toBeLessThanOrEqual(10);
    expect(sim.cause).toBe('thermal');
  });

  it('HD 209458 b dies in under 1.5 seconds from its no-ground and thermal hazards', () => {
    const sim = computeSurvival(planet('HD 209458 b'));
    expect(sim.timeToDeath).toBeLessThan(1.5);
    expect(sim.hazards.find(h => h.id === 'surface').dps).toBeGreaterThan(0);
    expect(sim.hazards.find(h => h.id === 'thermal').dps).toBeGreaterThan(0);
  });

  it('Proxima Cen b is dead or at critical health after 60 seconds from flare exposure', () => {
    const p = planet('Proxima Cen b'); const sim = computeSurvival(p);
    expect(sim.hazards.find(h => h.id === 'radiation').value).toContain('flare');
    expect(finalHealth(p) <= 0 || finalHealth(p) <= 35).toBe(true);
  });

  it('keeps Earth data and tuning constants explicit', () => {
    expect(planet('Earth')).toMatchObject({ pl_rade: 1, pl_bmasse: 1, pl_eqt: 255, pl_insol: 1 });
    expect(survivalTuning).toMatchObject({ thermal: 12, radiation: 10.5, dwarfFlares: 1.15, gravity: 13, surface: 60 });
  });
});

describe('finite data handling and fixed-step state', () => {
  it('returns finite model numbers for every cached planet and with null catalog fields', () => {
    for (const p of demoPlanets) expect(numericModelValues(computeSurvival(p)).every(Number.isFinite), p.pl_name).toBe(true);
    expect(numericModelValues(computeSurvival({ pl_rade: null, pl_bmasse: null, pl_eqt: null, pl_insol: null, st_teff: null, pl_orbper: null, pl_orbsmax: null, st_rad: null })).every(Number.isFinite)).toBe(true);
  });

  it('produces identical survival outcomes across large and small frame batches', () => {
    const p = planet('TRAPPIST-1 e');
    useGame.getState().reset(); useGame.getState().drop(p);
    useGame.getState().tick(3); useGame.getState().tick(60);
    const batched = useGame.getState();
    useGame.getState().reset(); useGame.getState().drop(p);
    for (let i = 0; i < 630; i++) useGame.getState().tick(0.1);
    const chunked = useGame.getState();
    expect(chunked.phase).toBe(batched.phase);
    expect(chunked.elapsed).toBe(batched.elapsed);
    expect(chunked.health).toBeCloseTo(batched.health, 8);
    expect(chunked.history.at(-1).t).toBe(60);
  });
});

describe('movement survival modifiers', () => {
  it('lets a TRAPPIST-1 e run that reaches the terminator and shelter finish above 50 health', () => {
    const p = planet('TRAPPIST-1 e');
    useGame.getState().reset(); useGame.getState().drop(p); useGame.getState().tick(3);
    // The controller publishes this state after the player walks to the twilight shelter.
    useGame.getState().setPlayerState({ s: 0, sheltered: true });
    useGame.getState().setRunMetrics({ distanceWalked: 180 });
    useGame.getState().tick(60);
    expect(useGame.getState().phase).toBe('survived');
    expect(useGame.getState().health).toBeGreaterThan(50);
    expect(useGame.getState().runMetrics).toMatchObject({ distanceWalked: 180, timeSheltered: 60, closestApproachToTerminator: 0 });
  });

  it('leaves a stationary day-side player with less health than a sheltered terminator run', () => {
    const p = planet('TRAPPIST-1 e');
    useGame.getState().reset(); useGame.getState().drop(p); useGame.getState().tick(3);
    useGame.getState().setPlayerState({ s: .6, sheltered: false }); useGame.getState().tick(60);
    const dayHealth = useGame.getState().health;
    useGame.getState().reset(); useGame.getState().drop(p); useGame.getState().tick(3);
    useGame.getState().setPlayerState({ s: 0, sheltered: true }); useGame.getState().tick(60);
    expect(dayHealth).toBeLessThan(useGame.getState().health);
  });

  it('shelter never raises any hazard severity or total damage', () => {
    const sim = computeSurvival(planet('TRAPPIST-1 e'));
    const exposed = applyLocalConditions(sim, { s: 0, sheltered: false });
    const covered = applyLocalConditions(sim, { s: 0, sheltered: true });
    expect(covered.totalDps).toBeLessThanOrEqual(exposed.totalDps);
    for (const id of ['thermal', 'radiation']) {
      expect(covered.hazards.find(h => h.id === id).sev).toBeLessThanOrEqual(exposed.hazards.find(h => h.id === id).sev);
    }
  });

  it('reduces TRAPPIST-1 e thermal damage when moving from the day-side spawn toward the terminator', () => {
    const sim = computeSurvival(planet('TRAPPIST-1 e'));
    const day = applyLocalConditions(sim, { s: 0.6 }).hazards.find(h => h.id === 'thermal');
    const twilight = applyLocalConditions(sim, { s: 0 }).hazards.find(h => h.id === 'thermal');
    expect(day.value).toContain('312 K');
    expect(twilight.value).toContain('264 K');
    expect(twilight.dps).toBeLessThan(day.dps);
  });

  it('keeps every modeled numeric value finite for every planet and all day-night coordinates', () => {
    for (const p of demoPlanets) {
      const sim = computeSurvival(p);
      for (let i = 0; i <= 20; i++) {
        const local = applyLocalConditions(sim, { s: -1 + i / 10, sheltered: i % 2 === 0 });
        expect(numericModelValues(local).every(Number.isFinite), `${p.pl_name}, s=${-1 + i / 10}`).toBe(true);
      }
    }
  });
});

describe('game phases', () => {
  beforeEach(() => useGame.getState().reset());
  it('runs a 3-second descent before starting alive time', () => {
    useGame.getState().drop(planet('Earth'));
    expect(useGame.getState().phase).toBe('descent');
    useGame.getState().tick(2.95);
    expect(useGame.getState().phase).toBe('descent');
    useGame.getState().tick(0.05);
    expect(useGame.getState().phase).toBe('alive');
    expect(useGame.getState().elapsed).toBe(0);
  });
  it('saves each result to the session leaderboard and keeps it after reset', () => {
    const previousCount=useGame.getState().sessionLeaderboard.length;
    useGame.getState().drop(planet('HD 209458 b'));
    useGame.getState().tick(3);useGame.getState().tick(2);
    expect(useGame.getState().phase).toBe('dead');
    expect(useGame.getState().sessionLeaderboard.at(-1)).toMatchObject({planet:'HD 209458 b',outcome:'dead',causeOfDeath:'No solid ground'});
    useGame.getState().reset();
    expect(useGame.getState().sessionLeaderboard).toHaveLength(previousCount+1);
    expect(useGame.getState().planet.pl_name).toBe('HD 209458 b');
  });
});
