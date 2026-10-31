// Camera framing and multi-scale journeys (Milky Way <-> star systems). Pure functions (unit tested).
//
// The scene spans ~7 orders of magnitude (a galaxy 100 units across, a planetary system 0.16 units across), so
// zooming interpolates the camera distance in LOG space: every part of the zoom feels equally fast.
import { Spherical } from 'three'
import { GALAXY_FRAME_RADIUS } from '../../utils/galaxy.js'

export const REFRAME_SECONDS = 1.0 // same-system view changes (system <-> planet)
export const FOCUS_SECONDS = 1.9 // system <-> enlarged planet view
export const MAX_VIEW_DISTANCE = 520 // OrbitControls zoom-out limit
export const FRAME_ELEVATION = Math.atan(0.45) // default viewing angle for a planetary system (~24 degrees)
export const GALAXY_ELEVATION = 0.9 // default viewing angle for the Milky Way (~52 degrees: the spiral reads clearly)
export const GALAXY_THETA = 0.35
export const SYSTEM_VISIBLE_RATIO = 8 // a system is drawn only while the camera is within 8x its framing distance

const TAU = Math.PI * 2

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const clamp01 = (t) => clamp(t, 0, 1)
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2
const lnLerp = (a, b, t) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t)

/**
 * Camera distance that frames a disc of radius `outer` (a system's outermost orbit, or the galaxy) entirely inside
 * the part of the screen not covered by UI (fx, fy = usable fraction of width / height). Exact perspective bounds
 * for a circle seen from `elevation`, plus a margin.
 */
export function frameDistanceFor(outer, { fov = 50, aspect = 1.6, fx = 1, fy = 1, elevation = FRAME_ELEVATION } = {}) {
  const t = Math.tan((fov * Math.PI) / 360)
  const cosE = Math.cos(elevation), sinE = Math.sin(elevation)
  const dx = outer * Math.sqrt(1 / (t * aspect * Math.max(fx, 0.2)) ** 2 + cosE ** 2)
  const dy = outer * (sinE / (t * Math.max(fy, 0.2)) + cosE)
  return Math.max(dx, dy) * 1.12
}

/**
 * Camera distance at which a sphere of `radius` fills `fill` of the smaller dimension of the usable screen area
 * (fx, fy = usable fraction of width / height). Used by the enlarged planet view.
 */
export function planetFrameDistance(radius, { fov = 50, aspect = 1.6, fx = 1, fy = 1, fill = 0.82 } = {}) {
  const t = Math.tan((fov * Math.PI) / 360)
  const reach = t * Math.min(Math.max(fy, 0.2), aspect * Math.max(fx, 0.2)) * fill
  return radius / Math.sin(Math.atan(reach))
}

export const frameSpherical = (outer, framing, elevation = FRAME_ELEVATION, theta = 0) =>
  new Spherical(frameDistanceFor(outer, { ...framing, elevation }), Math.PI / 2 - elevation, theta)

/** Default Milky Way overview: the whole disk visible, tilted so the spiral structure is clear. */
export const galaxyFrameSpherical = (framing) => frameSpherical(GALAXY_FRAME_RADIUS, framing, GALAXY_ELEVATION, GALAXY_THETA)

export function lerpSpherical(a, b, t, out = new Spherical()) {
  const dTheta = ((((b.theta - a.theta + Math.PI) % TAU) + TAU) % TAU) - Math.PI
  out.radius = a.radius + (b.radius - a.radius) * t
  out.phi = a.phi + (b.phi - a.phi) * t
  out.theta = a.theta + dTheta * t
  return out
}

// ---- journeys ----------------------------------------------------------------------------------------

/**
 * Peak camera distance of a journey. Going between two planetary systems the camera first pulls back far enough that
 * both are tiny specks (so one can be unloaded before the other loads) and far enough to see across the gap.
 */
export function peakRadius({ startR, endR, frameA = 0, frameB = 0, dist = 0, systemToSystem = false }) {
  if (!systemToSystem) return Math.max(startR, endR)
  return Math.max(startR, endR, SYSTEM_VISIBLE_RATIO * 1.25 * Math.max(frameA, frameB) + 2.5 * dist)
}

/** j = { startR, endR, peak, startSph, endSph } -> adds `rise` / `fall` flags. */
export function planJourney(j) {
  const rise = j.peak > j.startR * 1.05
  const fall = j.peak > j.endR * 1.05
  return { ...j, rise, fall, hold: rise && fall } // `hold`: pull back, cross, then close in (system -> system)
}

export function journeyRadius(s, j) {
  if (!j.hold) return lnLerp(j.startR, j.endR, easeInOutCubic(s)) // one smooth zoom (galaxy <-> system)
  if (s < 0.28) return lnLerp(j.startR, j.peak, easeInOutSine(s / 0.28))
  if (s < 0.58) return j.peak
  return lnLerp(j.peak, j.endR, easeInOutCubic((s - 0.58) / 0.42))
}

/** Camera pose at progress s: `t` is how far the look-at point has travelled from start to end (0..1). */
export function journeyPose(s, j, out = {}) {
  out.radius = journeyRadius(s, j)
  out.t = easeInOutCubic(clamp01(j.hold ? (s - 0.12) / 0.68 : (s - 0.05) / 0.8))
  const g = easeInOutCubic(clamp01((s - 0.15) / 0.7))
  const dTheta = ((((j.endSph.theta - j.startSph.theta + Math.PI) % TAU) + TAU) % TAU) - Math.PI
  out.phi = j.startSph.phi + (j.endSph.phi - j.startSph.phi) * g
  out.theta = j.startSph.theta + dTheta * g
  return out
}

/** Seconds: grows with how many orders of magnitude the camera zooms, bounded. */
export const journeyDuration = (j) => clamp(3.5 + 0.55 * (Math.abs(Math.log(j.peak / j.startR)) + Math.abs(Math.log(j.peak / j.endR))), 5, 10)

// ---- visibility: when a planetary system should exist -------------------------------------------------

/** A system is removed once the camera is so far away that it is a speck. */
export const systemTooSmall = (radius, frame) => radius > SYSTEM_VISIBLE_RATIO * frame

/** A system is created once the camera is close enough and heading at it (sep = look-at distance from the star). */
export const systemCloseEnough = (radius, frame, sep) => radius <= SYSTEM_VISIBLE_RATIO * frame && sep <= 2 * radius
