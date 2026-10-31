// Educational indicator content for the habitability section. Pure functions (unit tested): all the science lives
// here, the UI only renders it. Nothing here is scored; the score is in habitabilityCalculations.js.
import { COMPLETENESS_ITEMS, stellarLuminosity } from './habitabilityCalculations.js'
import { classifyStar } from './stellarClassification.js'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
export const EARTH_DENSITY_G_CM3 = 5.514
export const EARTH_EQ_TEMPERATURE_K = 255

/** Planet mass, plus bulk density when radius is also known (derived: density = Earth's x M / R^3). */
export function massIndicator(p) {
  const m = p.mass_earth, r = p.radius_earth
  const why = 'Mass, together with radius, gives a planet\'s average density, which helps astronomers judge whether it is more likely rock-and-metal-rich or carries a thick gas or ice envelope. Mass alone does not fix composition.'
  if (!isNum(m)) return { available: false, value: null, unit: 'M⊕', density: null, explanation: `${why} NASA reports no mass for this planet.` }
  const density = isNum(r) && r > 0 ? EARTH_DENSITY_G_CM3 * m / r ** 3 : null
  const caveat = p.discovery_method === 'Radial Velocity' ? ' Planets found by radial velocity often have only a minimum mass (M sin i).' : ''
  return {
    available: true, value: m, unit: 'M⊕',
    density: density == null ? null : { value: density, derived: true, relativeToEarth: density / EARTH_DENSITY_G_CM3 },
    explanation: why + (density == null ? ' Radius is unavailable, so density cannot be derived.' : '') + caveat,
  }
}

/** What the equilibrium temperature can and cannot say about surface conditions. */
export function temperatureRelevance(p) {
  const t = p.equilibrium_temperature_k
  const caveat = `Equilibrium temperature is what a planet would have if it simply absorbed starlight and re-radiated it, with no atmosphere or greenhouse effect. It is NOT the surface temperature: Earth's equilibrium temperature is about ${EARTH_EQ_TEMPERATURE_K} K (−18 °C) while its actual average surface temperature is about 288 K (15 °C).`
  if (!isNum(t)) return { available: false, value: null, summary: 'Data unavailable', explanation: `NASA reports no equilibrium temperature for this planet. ${caveat}` }
  const c = t - 273.15
  const rel = t < 273 ? 'below the freezing point of water (273 K)' : t <= 373 ? 'between the freezing and boiling points of water (273-373 K)' : 'above the boiling point of water (373 K)'
  return {
    available: true, value: t, celsius: c,
    summary: `${Math.round(t)} K (${Math.round(c)} °C), ${rel}`,
    explanation: `${caveat} A planet's real conditions depend on its atmosphere, so this is only a rough starting point.`,
  }
}

/** Host-star characteristics relevant to habitability. Stellar activity is not part of this dataset. */
export function hostStarCharacteristics(p) {
  const cls = classifyStar(p)
  const lum = stellarLuminosity(p)
  return {
    classification: cls,
    temperature: isNum(p.star_temperature_k) ? p.star_temperature_k : null,
    spectralType: p.star_spectral_type ?? null,
    luminosity: lum ? { value: lum.value, source: lum.source } : null,
    activity: {
      available: false,
      note: 'No stellar activity measurement (flares, spots) is included in this dataset.'
        + (cls.spectralClass === 'M' ? ' In general, M dwarfs are often magnetically active and can flare, which can affect planetary atmospheres; that is general astronomy, not a measurement of this star.' : ''),
    },
  }
}

/** Which of the key measurements are measured, derived, or unavailable (what the completeness score counts). */
export function dataAvailability(p) {
  const lum = stellarLuminosity(p)
  const items = COMPLETENESS_ITEMS.map(({ key, label, has }) => {
    let state = has(p) ? 'measured' : 'unavailable'
    let note = null
    if (key === 'star' && state === 'measured' && lum?.source === 'derived') { state = 'derived'; note = 'luminosity calculated from radius and temperature' }
    return { key, label, state, note }
  })
  return { items, measured: items.filter((i) => i.state === 'measured').length, derived: items.filter((i) => i.state === 'derived').length, unavailable: items.filter((i) => i.state === 'unavailable').length }
}
