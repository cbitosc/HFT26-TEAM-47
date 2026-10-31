












export const PARSEC_TO_LIGHT_YEARS = 3.26156
export const SOLAR_TEFF_K = 5772

export const WEIGHTS = { habitableZone: 35, temperature: 30, planetSize: 20, dataCompleteness: 15 }



export const TEMPERATURE_BANDS = { idealMin: 200, idealMax: 300, zeroLow: 100, zeroHigh: 400 }



export const SIZE_BANDS = [
  { max: 0.3, score: 5, label: 'Very small', note: 'Smaller than Mercury-class bodies; atmosphere retention is doubtful.' },
  { max: 0.5, score: 12, label: 'Small rocky-sized', note: 'Mars-sized or smaller; may struggle to retain an atmosphere.' },
  { max: 1.6, score: 20, label: 'Rocky-planet-sized', note: 'Consistent with a rocky composition, though radius alone cannot confirm it.' },
  { max: 2.0, score: 10, label: 'Super-Earth (transitional)', note: 'Could be rocky or have a thick volatile envelope.' },
  { max: 4.0, score: 4, label: 'Sub-Neptune', note: 'Likely a substantial gas or ice envelope.' },
  { max: Infinity, score: 0, label: 'Giant planet', note: 'Neptune- to Jupiter-sized; no solid surface expected.' },
]

export const CATEGORY_THRESHOLDS = { higher: 70, moderate: 40 }



const KOPPARAPU = {
  recentVenus: [1.7753, 1.4316e-4, 2.9875e-9, -7.5702e-12, -1.1635e-15],
  moistGreenhouse: [1.0140, 8.1774e-5, 1.7063e-9, -4.3241e-12, -6.6462e-16],
  maxGreenhouse: [0.3438, 5.8942e-5, 1.6558e-9, -3.0045e-12, -5.2983e-16],
  earlyMars: [0.3179, 5.4513e-5, 1.5313e-9, -2.7786e-12, -4.8997e-16],
}
export const HZ_TEFF_RANGE = [2600, 7200]

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export const parsecsToLightYears = (pc) => (isNum(pc) ? pc * PARSEC_TO_LIGHT_YEARS : null)


export function stellarLuminosity(p) {
  if (isNum(p.star_luminosity_log_solar)) {
    return { value: 10 ** p.star_luminosity_log_solar, source: 'reported' }
  }

  if (isNum(p.star_radius_solar) && isNum(p.star_temperature_k)) {
    return { value: p.star_radius_solar ** 2 * (p.star_temperature_k / SOLAR_TEFF_K) ** 4, source: 'derived' }
  }
  return null
}

function seff(coeffs, teff) {
  const t = teff - 5780
  const [s0, a, b, c, d] = coeffs
  return s0 + a * t + b * t ** 2 + c * t ** 3 + d * t ** 4
}


export function habitableZoneBounds(teff, luminositySolar) {
  if (!isNum(teff) || !isNum(luminositySolar) || luminositySolar <= 0) return null
  if (teff < HZ_TEFF_RANGE[0] || teff > HZ_TEFF_RANGE[1]) return null
  const au = (coeffs) => Math.sqrt(luminositySolar / seff(coeffs, teff))
  return {
    conservative: { inner: au(KOPPARAPU.moistGreenhouse), outer: au(KOPPARAPU.maxGreenhouse) },
    optimistic: { inner: au(KOPPARAPU.recentVenus), outer: au(KOPPARAPU.earlyMars) },
  }
}

const result = (id, label, max, fields) => ({ id, label, max, available: false, score: null, ...fields })

export function calculateTemperatureScore(p) {
  const t = p.equilibrium_temperature_k
  const base = result('temperature', 'Temperature suitability', WEIGHTS.temperature, { value: t ?? null, unit: 'K' })
  if (!isNum(t)) return { ...base, status: 'unknown', explanation: 'NASA reports no equilibrium temperature for this planet.' }
  const { idealMin, idealMax, zeroLow, zeroHigh } = TEMPERATURE_BANDS
  let frac
  let status
  if (t >= idealMin && t <= idealMax) { frac = 1; status = 'within the comfortable band' }
  else if (t < idealMin) { frac = Math.max(0, (t - zeroLow) / (idealMin - zeroLow)); status = 'colder than the comfortable band' }
  else { frac = Math.max(0, (zeroHigh - t) / (zeroHigh - idealMax)); status = 'hotter than the comfortable band' }
  return {
    ...base, available: true, score: Math.round(frac * base.max * 10) / 10, status,
    explanation: `Full marks for ${idealMin}-${idealMax} K, falling linearly to 0 at ${zeroLow} K and ${zeroHigh} K. ` +
      'Equilibrium temperature is a theoretical value without greenhouse effects; real surface temperature depends on the atmosphere.',
  }
}

export function calculateHabitableZoneScore(p) {
  const base = result('habitableZone', 'Habitable-zone suitability', WEIGHTS.habitableZone, { unit: 'AU' })
  const a = p.semi_major_axis_au
  const lum = stellarLuminosity(p)
  if (!isNum(a)) return { ...base, status: 'unknown', explanation: 'Semi-major axis is not reported, so orbital position cannot be compared with the habitable zone.' }
  if (!lum) return { ...base, value: a, status: 'unknown', explanation: 'Stellar luminosity (or the radius needed to derive it) is not reported.' }
  if (!isNum(p.star_temperature_k)) return { ...base, value: a, status: 'unknown', explanation: 'Host star temperature is not reported.' }
  const zone = habitableZoneBounds(p.star_temperature_k, lum.value)
  if (!zone) return { ...base, value: a, status: 'unknown', explanation: `The habitable-zone model is only valid for stars of ${HZ_TEFF_RANGE[0]}-${HZ_TEFF_RANGE[1]} K.` }

  const { conservative: c, optimistic: o } = zone
  let score, status
  if (a >= c.inner && a <= c.outer) { score = base.max; status = 'inside the conservative habitable zone' }
  else if (a >= o.inner && a <= o.outer) { score = Math.round(base.max * 0.65); status = 'inside the optimistic habitable zone only' }
  else { score = 0; status = a < o.inner ? 'closer to the star than the habitable zone' : 'farther from the star than the habitable zone' }
  return {
    ...base, available: true, score, value: a, status, zone, luminositySource: lum.source, luminosity: lum.value,
    explanation: `Compares the orbit (${a} AU) with Kopparapu et al. (2013) boundaries for this star. ` +
      `Full marks inside the conservative zone, 65% inside the optimistic zone only, 0 outside. ` +
      (lum.source === 'derived' ? 'Luminosity was derived from stellar radius and temperature (not reported directly). ' : '') +
      'Being in the zone does not mean liquid water or an atmosphere exists; eccentric orbits are not considered.',
  }
}

export function classifyPlanetSize(radius) {
  if (!isNum(radius)) return null
  return SIZE_BANDS.find((b) => radius < b.max || b.max === Infinity)
}

export function calculatePlanetSizeScore(p) {
  const base = result('planetSize', 'Planet size suitability', WEIGHTS.planetSize, { value: p.radius_earth ?? null, unit: 'R⊕' })
  const band = classifyPlanetSize(p.radius_earth)
  if (!band) return { ...base, status: 'unknown', explanation: 'NASA reports no radius for this planet.' }
  return {
    ...base, available: true, score: Math.round((band.score / 20) * base.max), status: band.label.toLowerCase(), band,
    explanation: `${band.note} Approximate size class only; composition is not inferred from radius alone.`,
  }
}

export const COMPLETENESS_ITEMS = [
  { key: 'radius', label: 'Planet radius', has: (p) => isNum(p.radius_earth) },
  { key: 'mass', label: 'Planet mass', has: (p) => isNum(p.mass_earth) },
  { key: 'temperature', label: 'Equilibrium temperature', has: (p) => isNum(p.equilibrium_temperature_k) },
  { key: 'orbit', label: 'Orbital distance', has: (p) => isNum(p.semi_major_axis_au) },

  { key: 'star', label: 'Stellar temperature & luminosity', has: (p) => isNum(p.star_temperature_k) && stellarLuminosity(p) != null },
]

export function dataCompleteness(p) {
  const items = COMPLETENESS_ITEMS.map(({ key, label, has }) => ({ key, label, present: has(p) }))
  const count = items.filter((i) => i.present).length
  return { items, count, total: items.length, percent: Math.round((count / items.length) * 100) }
}

export function calculateDataCompletenessScore(p) {
  const c = dataCompleteness(p)
  return {
    id: 'dataCompleteness', label: 'Data completeness', max: WEIGHTS.dataCompleteness, available: true,
    score: Math.round((c.count / c.total) * WEIGHTS.dataCompleteness * 10) / 10, value: c.percent, unit: '%',
    status: `${c.count} of ${c.total} key measurements reported`, completeness: c,
    explanation: 'Share of five key measurements NASA reports. This describes how much is known, not how habitable the planet is.',
  }
}


export function calculateHabitabilityScore(p) {
  const temperature = calculateTemperatureScore(p)
  const habitableZone = calculateHabitableZoneScore(p)
  const planetSize = calculatePlanetSizeScore(p)
  const dataCompleteness = calculateDataCompletenessScore(p)
  const indicators = [habitableZone, temperature, planetSize]
  const known = indicators.filter((i) => i.available)
  const unknown = indicators.filter((i) => !i.available).map((i) => i.label)
  const components = { habitableZone, temperature, planetSize, dataCompleteness }

  if (known.length < 2) {
    return {
      total: null, max: 100, category: 'Insufficient data', unknown, components, knownCount: known.length,
      interpretation: 'Too few measurements are available to produce a meaningful screening score.',
    }
  }
  const total = Math.round([...known, dataCompleteness].reduce((s, i) => s + i.score, 0))
  let category = total >= CATEGORY_THRESHOLDS.higher ? 'Higher screening suitability'
    : total >= CATEGORY_THRESHOLDS.moderate ? 'Moderate screening suitability' : 'Lower screening suitability'
  if (unknown.length > 0 && category === 'Higher screening suitability') category = 'Moderate screening suitability'
  const interpretation = {
    'Higher screening suitability': 'Reported measurements fall mostly within the ranges this screen treats as favourable.',
    'Moderate screening suitability': unknown.length
      ? `Some indicators are unknown (${unknown.join(', ')}), so the result is capped at moderate.`
      : 'Reported measurements are mixed against this screen\'s ranges.',
    'Lower screening suitability': 'Reported measurements fall outside most ranges this screen treats as favourable.',
  }[category]
  return { total, max: 100, category, interpretation, unknown, components, knownCount: known.length }
}
