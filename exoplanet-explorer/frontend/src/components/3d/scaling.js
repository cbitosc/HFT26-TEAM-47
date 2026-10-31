


import { NEUTRAL_STAR_RGB, rgbToHex, temperatureToRgb } from '../../utils/stellarColorMapping.js'
import { starScaleFromRadius, starVisuals } from '../../utils/stellarScaling.js'

export { starScaleFromRadius }
export const STAR_RADIUS = 1.5
export const DEFAULT_STAR_COLOR = rgbToHex(NEUTRAL_STAR_RGB)

export const DEFAULTS = { planetSize: 0.5, orbitRadius: 6, orbitSeconds: 14 }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export const planetSizeFromRadius = (rade) => clamp(0.2 + 0.2 * Math.log2(1 + rade), 0.28, 1.0)
export const orbitRadiusFromAu = (au) => 4 + 3 * Math.log10(1 + 10 * au)



export const ORBIT_SPEED = { slow: 0.15, normal: 0.4, fast: 1 }
export const orbitSpeedFactor = (mode) => ORBIT_SPEED[mode] ?? ORBIT_SPEED.slow

export const orbitSecondsFromDays = (days) => 4 + 5 * Math.log10(1 + days)


export const starColorFromTemp = (t) => (typeof t === 'number' && Number.isFinite(t) && t > 0 ? rgbToHex(temperatureToRgb(t)) : DEFAULT_STAR_COLOR)

export const TYPE_LABELS = {
  rocky: 'Rocky (illustrative)',
  temperate: 'Temperate rocky (illustrative)',
  subneptune: 'Sub-Neptune sized (illustrative)',
  icegiant: 'Ice giant sized (illustrative)',
  gasgiant: 'Gas giant sized (illustrative)',
  unknown: 'Unknown composition (neutral material)',
}


export function classifyPlanet(p) {
  const r = p.radius_earth
  if (r == null) return 'unknown'

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
