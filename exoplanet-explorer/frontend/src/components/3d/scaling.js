// Maps NASA planet data to illustrative scene parameters. Nothing here is to scale:
// sizes and distances use bounded logarithmic curves so every system stays visible.

export const STAR_RADIUS = 1.5
export const DEFAULT_STAR_COLOR = '#ffd9a0'
// Illustrative fallbacks, used (and flagged in the UI) only when NASA has no value.
export const DEFAULTS = { planetSize: 0.5, orbitRadius: 6, orbitSeconds: 14 }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export const planetSizeFromRadius = (rade) => clamp(0.2 + 0.2 * Math.log2(1 + rade), 0.28, 1.0)
export const orbitRadiusFromAu = (au) => 4 + 3 * Math.log10(1 + 10 * au)
// Seconds per visual orbit: shorter real period -> faster animation (monotonic, bounded growth).
export const orbitSecondsFromDays = (days) => 4 + 5 * Math.log10(1 + days)

/** Approximate blackbody colour for an illustrative star tint (not a spectrum). */
export function starColorFromTemp(t) {
  if (t == null) return DEFAULT_STAR_COLOR
  const k = clamp(t, 1000, 40000) / 100
  let r, g, b
  if (k <= 66) {
    r = 255
    g = 99.4708025861 * Math.log(k) - 161.1195681661
  } else {
    r = 329.698727446 * Math.pow(k - 60, -0.1332047592)
    g = 288.1221695283 * Math.pow(k - 60, -0.0755148492)
  }
  b = k >= 66 ? 255 : k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307
  const hex = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

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
  if (r < 1.6) {
    const t = p.equilibrium_temperature_k
    return t != null && t >= 200 && t <= 350 ? 'temperate' : 'rocky'
  }
  if (r < 3.5) return 'subneptune'
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
    starColor: starColorFromTemp(p.star_temperature_k),
    type: classifyPlanet(p),
    estimated: { radius: !hasRadius, orbit: !hasOrbit, period: !hasPeriod, star: p.star_temperature_k == null },
  }
}
