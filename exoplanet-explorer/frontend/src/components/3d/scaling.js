// Maps NASA planet data to illustrative scene parameters. Nothing here is to scale:
// sizes and distances use bounded logarithmic curves so every system stays visible.

import { NEUTRAL_STAR_RGB, rgbToHex, temperatureToRgb } from '../../utils/stellarColorMapping.js'
import { starScaleFromRadius, starVisuals } from '../../utils/stellarScaling.js'

export { starScaleFromRadius }
export const STAR_RADIUS = 1.5
export const DEFAULT_STAR_COLOR = rgbToHex(NEUTRAL_STAR_RGB) // neutral: used only when a star's temperature and type are both unknown
// Illustrative fallbacks, used (and flagged in the UI) only when NASA has no value.
export const DEFAULTS = { planetSize: 0.5, orbitRadius: 6, orbitSeconds: 14 }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export const planetSizeFromRadius = (rade) => clamp(0.2 + 0.2 * Math.log2(1 + rade), 0.28, 1.0)
export const orbitRadiusFromAu = (au) => 4 + 3 * Math.log10(1 + 10 * au)
// Seconds per visual orbit: shorter real period -> faster animation (monotonic, bounded growth).
// Global orbital-speed multipliers applied on top of the base (log-compressed) orbit period. Relative period
// differences and directions are unchanged; only the clock rate scales. Slow is 0.15x the previous speed.
export const ORBIT_SPEED = { slow: 0.15, normal: 0.4, fast: 1 }
export const orbitSpeedFactor = (mode) => ORBIT_SPEED[mode] ?? ORBIT_SPEED.slow

export const orbitSecondsFromDays = (days) => 4 + 5 * Math.log10(1 + days)

/** Display colour for an effective temperature (see utils/stellarColorMapping.js); neutral when unknown. */
export const starColorFromTemp = (t) => (typeof t === 'number' && Number.isFinite(t) && t > 0 ? rgbToHex(temperatureToRgb(t)) : DEFAULT_STAR_COLOR)

export const TYPE_LABELS = {
  rocky: 'Rocky (illustrative)',
  temperate: 'Temperate rocky (illustrative)',
  subneptune: 'Sub-Neptune sized (illustrative)',
  icegiant: 'Ice giant sized (illustrative)',
  gasgiant: 'Gas giant sized (illustrative)',
  unknown: 'Unknown composition (neutral material)',
}

/** Coarse appearance class from radius (and temperature). Composition is NOT confirmed by this. */
export function classifyPlanet(p) {
  const r = p.radius_earth
  if (r == null) return 'unknown'
  // Radius cut-offs match the dashboard's size classes (habitabilityCalculations.js SIZE_BANDS).
  if (r < 2.0) {
    const t = p.equilibrium_temperature_k
    return t != null && t >= 200 && t <= 350 ? 'temperate' : 'rocky'
  }
  if (r < 4.0) return 'subneptune'
  if (r <= 6) return 'icegiant'
  return 'gasgiant'
}

export function getSceneParams(p) {
  const hasRadius = p.radius_earth != null
  const hasOrbit = p.semi_major_axis_au != null
  const hasPeriod = p.orbital_period_days != null
  return {
    planetSize: hasRadius ? planetSizeFromRadius(p.radius_earth) : DEFAULTS.planetSize,
    orbitRadius: hasOrbit ? orbitRadiusFromAu(p.semi_major_axis_au) : DEFAULTS.orbitRadius,
    orbitSeconds: hasPeriod ? orbitSecondsFromDays(p.orbital_period_days) : DEFAULTS.orbitSeconds,
    star: starVisuals(p),
    starColor: starColorFromTemp(p.star_temperature_k),
    starScale: starScaleFromRadius(p.star_radius_solar),
    type: classifyPlanet(p),
    estimated: { radius: !hasRadius, orbit: !hasOrbit, period: !hasPeriod, star: p.star_temperature_k == null },
  }
}
