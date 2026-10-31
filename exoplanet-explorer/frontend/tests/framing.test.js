import test from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Spherical, Vector3 } from 'three'
import {
  GALAXY_ELEVATION, FRAME_ELEVATION, easeInOutCubic, frameDistanceFor, frameSpherical, galaxyFrameSpherical, journeyDuration, journeyPose,
  journeyRadius, lerpSpherical, peakRadius, planJourney, systemCloseEnough, systemTooSmall,
} from '../src/components/3d/framing.js'
import { GALAXY_FRAME_RADIUS, SYSTEM_SCALE } from '../src/utils/galaxy.js'

test('easing endpoints, monotonic', () => {
  assert.equal(easeInOutCubic(0), 0); assert.equal(easeInOutCubic(1), 1)
  let prev = -1
  for (let i = 0; i <= 100; i++) { const v = easeInOutCubic(i / 100); assert.ok(v >= prev); prev = v }
})

test('spherical interpolation takes the shortest azimuth path', () => {
  const a = new Spherical(10, 1.0, Math.PI - 0.2), b = new Spherical(50, 1.4, -Math.PI + 0.2)
  assert.ok(Math.abs(lerpSpherical(a, b, 0.5).theta - Math.PI) < 1e-9)
})

// Project a disc through a real PerspectiveCamera (with the app's view offset) and check it lands in the free area.
function fits(outer, elevation, theta, { W, H, L, R, T, B }) {
  const aspect = W / H
  const framing = { fov: 50, aspect, fx: (W - L - R) / W, fy: (H - T - B) / H }
  const cam = new PerspectiveCamera(50, aspect, 0.001, 4000)
  cam.position.setFromSpherical(frameSpherical(outer, framing, elevation, theta))
  cam.lookAt(0, 0, 0)
  cam.setViewOffset(W, H, -(L - R) / 2, -(T - B) / 2, W, H)
  cam.updateMatrixWorld(true)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2
    const p = new Vector3(Math.cos(a) * outer, 0, Math.sin(a) * outer).project(cam)
    const px = ((p.x + 1) / 2) * W, py = ((1 - p.y) / 2) * H
    minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py)
  }
  return { ok: minX >= L && maxX <= W - R && minY >= T && maxY <= H - B, minX, maxX, minY, maxY }
}

test('planetary systems AND the whole galaxy fit inside the area not covered by UI', () => {
  const screens = [
    { W: 1440, H: 900, L: 300, R: 360, T: 90, B: 90 },
    { W: 1920, H: 1000, L: 300, R: 360, T: 90, B: 90 },
    { W: 1440, H: 900, L: 300, R: 20, T: 90, B: 90 }, // right panel closed (galaxy view)
  ]
  for (const s of screens) {
    for (const outerUnits of [6.5, 13.4]) {
      const r = fits(outerUnits * SYSTEM_SCALE, FRAME_ELEVATION, 0, s)
      assert.ok(r.ok, `system ${outerUnits} @${s.W}x${s.H}: x ${r.minX.toFixed(0)}-${r.maxX.toFixed(0)} y ${r.minY.toFixed(0)}-${r.maxY.toFixed(0)}`)
    }
    const g = fits(GALAXY_FRAME_RADIUS, GALAXY_ELEVATION, 0.35, s)
    assert.ok(g.ok, `galaxy @${s.W}x${s.H}: x ${g.minX.toFixed(0)}-${g.maxX.toFixed(0)} y ${g.minY.toFixed(0)}-${g.maxY.toFixed(0)}`)
  }
})

test('galaxy and system frames differ by orders of magnitude and scale with size', () => {
  const g = galaxyFrameSpherical({ fov: 50, aspect: 1.6, fx: 0.5, fy: 0.8 }).radius
  const sys = frameSpherical(13.4 * SYSTEM_SCALE, { fov: 50, aspect: 1.6, fx: 0.5, fy: 0.8 }).radius
  assert.ok(g / sys > 300, `ratio ${g / sys}`)
  assert.ok(frameDistanceFor(2) > frameDistanceFor(1))
})

test('galaxy <-> system journeys zoom smoothly in log space (one monotone motion)', () => {
  const j = planJourney({ startR: 270, endR: 0.5, peak: peakRadius({ startR: 270, endR: 0.5 }), startSph: new Spherical(270, 0.7, 0.35), endSph: new Spherical(0.5, 1.2, 0) })
  assert.equal(j.hold, false)
  assert.ok(Math.abs(journeyRadius(0, j) - 270) < 1e-9 && Math.abs(journeyRadius(1, j) - 0.5) < 1e-9)
  let prev = Infinity
  for (let i = 0; i <= 100; i++) { const r = journeyRadius(i / 100, j); assert.ok(r <= prev + 1e-9); prev = r } // only ever closer
  // halfway through the time the camera is at the geometric middle: equal "zoom speed" at every scale
  assert.ok(Math.abs(journeyRadius(0.5, j) - Math.sqrt(270 * 0.5)) < 1e-6)
  const back = planJourney({ startR: 0.5, endR: 270, peak: 270, startSph: new Spherical(0.5, 1.2, 0), endSph: new Spherical(270, 0.7, 0.35) })
  assert.equal(back.hold, false)
  assert.ok(journeyDuration(j) >= 5 && journeyDuration(j) <= 10)
  const p1 = journeyPose(1, j)
  assert.equal(p1.t, 1); assert.ok(Math.abs(p1.phi - 1.2) < 1e-9)
})

test('system -> system pulls back, crosses, and closes in', () => {
  const frameA = 0.5, frameB = 0.4
  const peak = peakRadius({ startR: frameA, endR: frameB, frameA, frameB, dist: 4, systemToSystem: true })
  assert.ok(peak > 10 * Math.max(frameA, frameB) && peak > 2.5 * 4)
  const j = planJourney({ startR: frameA, endR: frameB, peak, startSph: new Spherical(frameA, 1.1, 0.5), endSph: new Spherical(frameB, 1.1, 0) })
  assert.equal(j.hold, true)
  assert.equal(journeyRadius(0.4, j), peak) // holds at the peak while crossing
  assert.ok(Math.abs(journeyRadius(1, j) - frameB) < 1e-9)
})

test('the old system is a speck (unloaded) before the new one is loaded', () => {
  const frameA = 0.5, frameB = 0.4, dist = 3
  const peak = peakRadius({ startR: frameA, endR: frameB, frameA, frameB, dist, systemToSystem: true })
  const j = planJourney({ startR: frameA, endR: frameB, peak, startSph: new Spherical(frameA, 1, 0), endSph: new Spherical(frameB, 1, 0) })
  let unloadAt = null, loadAt = null
  for (let i = 0; i <= 1000; i++) {
    const s = i / 1000, p = journeyPose(s, j)
    const sepB = dist * (1 - p.t) // look-at point's distance from the destination star
    if (unloadAt === null && systemTooSmall(p.radius, frameA)) unloadAt = s
    if (loadAt === null && unloadAt !== null && systemCloseEnough(p.radius, frameB, sepB)) loadAt = s
  }
  assert.ok(unloadAt !== null && loadAt !== null && unloadAt < loadAt, `unload ${unloadAt}, load ${loadAt}`)
  assert.ok(loadAt - unloadAt > 0.1) // a real stretch with no system on screen
  assert.equal(systemTooSmall(1, 0.5), false)
  assert.equal(systemCloseEnough(100, 0.5, 0), false) // far away: never loaded
  assert.equal(systemCloseEnough(2, 0.5, 100), false) // close but pointing elsewhere: not loaded
})

import { planetFrameDistance } from '../src/components/3d/framing.js'
import { pickActiveSection } from '../src/utils/sectionNav.js'

test('planet frame distance scales with radius and grows when the free area shrinks', () => {
  const d1 = planetFrameDistance(0.01), d2 = planetFrameDistance(0.02)
  assert.ok(d1 > 0.01)
  assert.ok(Math.abs(d2 / d1 - 2) < 1e-9)
  assert.ok(planetFrameDistance(0.01, { fx: 0.3, aspect: 1.6 }) > d1) // narrower free area -> camera pulls back
  // the planet disc (angular radius) fits inside the usable area
  const t = Math.tan((50 * Math.PI) / 360), ang = Math.asin(0.01 / d1)
  assert.ok(Math.tan(ang) <= t * 1 * 1 + 1e-12)
})

test('active section: first visible wins, bottom wins last, previous kept when none visible', () => {
  const order = ['overview', 'properties', 'habitability', 'host-star']
  assert.equal(pickActiveSection(order, new Set(['properties', 'habitability']), 'overview'), 'properties')
  assert.equal(pickActiveSection(order, new Set(['overview']), 'host-star', true), 'host-star')
  assert.equal(pickActiveSection(order, new Set(), 'habitability'), 'habitability')
  assert.equal(pickActiveSection(order, new Set(), undefined), 'overview')
})
