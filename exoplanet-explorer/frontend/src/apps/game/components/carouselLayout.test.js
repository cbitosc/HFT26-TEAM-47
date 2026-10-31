import { describe, expect, it } from 'vitest';
import { cardPose, carouselLayout, stageHeight } from './carouselLayout.js';

describe('curved carousel layout', () => {
  it('uses less curvature and fewer visible cards on smaller screens', () => {
    const d = carouselLayout(1200), t = carouselLayout(700), m = carouselLayout(375);
    expect([d.mode, t.mode, m.mode]).toEqual(['desktop', 'tablet', 'mobile']);
    expect(d.angle).toBeGreaterThan(t.angle);
    expect(t.angle).toBeGreaterThan(m.angle);
    expect(d.visible).toBeGreaterThan(m.visible);
    expect(m.cw).toBeLessThanOrEqual(375 * 0.72 + 1); // the centre card never fills the whole screen width
  });

  it('puts the selected card top centre, flat and full size', () => {
    const p = cardPose(0, carouselLayout(1200));
    expect(p).toMatchObject({ x: 0, y: 0, z: 0, rotateY: 0, scale: 1, hidden: false });
    expect(p.zIndex).toBe(100);
  });

  it('is symmetric: neighbours drop, shrink, recede and turn towards the middle', () => {
    const L = carouselLayout(1200);
    const left = cardPose(-1, L), right = cardPose(1, L), far = cardPose(2, L);
    expect(left.x).toBe(-right.x);
    expect(left.y).toBe(right.y);
    expect(right.y).toBeGreaterThan(0);
    expect(far.y).toBeGreaterThan(right.y);
    expect(far.scale).toBeLessThan(right.scale);
    expect(far.z).toBeLessThan(right.z);
    expect(right.rotateY).toBeLessThan(0);
    expect(left.rotateY).toBeGreaterThan(0);
    expect(far.zIndex).toBeLessThan(right.zIndex);
  });

  it('spacing is constant and rotation is capped', () => {
    const L = carouselLayout(1200);
    const xs = [0, 1, 2, 3].map((o) => cardPose(o, L).x);
    expect(xs[1] - xs[0]).toBe(xs[2] - xs[1]);
    expect(Math.abs(cardPose(9, L).rotateY)).toBeLessThanOrEqual(45);
    expect(cardPose(L.visible, L).hidden).toBe(false);
    expect(cardPose(L.visible + 1, L).hidden).toBe(true);
  });

  it('stage hugs the cards: at least one card tall, and no big reserved gap below', () => {
    for (const W of [1200, 700, 375]) {
      const L = carouselLayout(W);
      expect(stageHeight(L)).toBeGreaterThanOrEqual(L.ch);
      expect(stageHeight(L)).toBeLessThanOrEqual(L.ch + 60);
    }
  });
});
