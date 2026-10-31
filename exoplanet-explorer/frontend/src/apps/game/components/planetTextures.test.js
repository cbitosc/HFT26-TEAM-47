import { describe, expect, it } from 'vitest';
import { describeSurface, starLight } from './planetTextures.js';

describe('surface descriptions follow the planet data', () => {
  it('is deterministic per planet name', () => {
    expect(describeSurface({ pl_name: 'Kepler-452 b', pl_eqt: 265 }, 'temperate').seed).toBe(describeSurface({ pl_name: 'Kepler-452 b', pl_eqt: 300 }, 'temperate').seed);
    expect(describeSurface({ pl_name: 'A' }, 'temperate').seed).not.toBe(describeSurface({ pl_name: 'B' }, 'temperate').seed);
  });

  it('warmer temperate worlds get more land and smaller ice caps', () => {
    const cold = describeSurface({ pl_name: 'x', pl_eqt: 230 }, 'temperate'), warm = describeSurface({ pl_name: 'x', pl_eqt: 300 }, 'temperate');
    expect(warm.land).toBeLessThan(cold.land); // lower threshold = more land
    expect(warm.cap).toBeLessThan(cold.cap);
  });

  it('lava worlds crack more when hotter; hot gas giants are darker and more turbulent', () => {
    expect(describeSurface({ pl_name: 'x', pl_eqt: 1500 }, 'lava').cracks).toBeGreaterThan(describeSurface({ pl_name: 'x', pl_eqt: 900 }, 'lava').cracks);
    const hot = describeSurface({ pl_name: 'x', pl_eqt: 1500, pl_orbper: 3 }, 'giant'), cool = describeSurface({ pl_name: 'x', pl_eqt: 300, pl_orbper: 3000 }, 'giant');
    expect(hot.turbulence).toBeGreaterThan(cool.turbulence);
    expect(hot.colors[0]).not.toBe(cool.colors[0]);
    expect(cool.bands).toBeGreaterThan(hot.bands); // the longer orbit has more cloud bands
  });

  it('uses the host star temperature for the light colour, and flags tidal locking', () => {
    expect(starLight(2900)).not.toBe(starLight(5800));
    expect(starLight(9000)).toBe('#d4e4ff');
    expect(starLight(null)).toBe(starLight(5772)); // unknown -> Sun-like
    expect(describeSurface({ pl_name: 'x' }, 'ice', true).locked).toBe(true);
    expect(describeSurface({ pl_name: 'x' }, 'ice').locked).toBe(false);
  });

  it('missing data still gives a valid surface (no NaN)', () => {
    for (const type of ['temperate', 'ice', 'hot', 'lava', 'giant']) {
      const d = describeSurface({ pl_name: 'Unknown' }, type);
      expect(Object.values(d).every(v => v === undefined || typeof v !== 'number' || Number.isFinite(v))).toBe(true);
    }
  });
});
