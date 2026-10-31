import test from 'node:test'
import assert from 'node:assert/strict'
import { EARTH_DENSITY_G_CM3, dataAvailability, hostStarCharacteristics, massIndicator, temperatureRelevance } from '../src/utils/planetaryIndicators.js'
import { WEIGHTS, calculateHabitabilityScore } from '../src/utils/habitabilityCalculations.js'

const KEPLER452 = {
  radius_earth: 1.63, mass_earth: null, equilibrium_temperature_k: 265, semi_major_axis_au: 1.046, discovery_method: 'Transit',
  star_temperature_k: 5757, star_radius_solar: 1.11, star_spectral_type: 'G2',
}

test('score weights are 35 / 30 / 20 / 15 and sum to 100', () => {
  assert.deepEqual(WEIGHTS, { habitableZone: 35, temperature: 30, planetSize: 20, dataCompleteness: 15 })
  assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 100)
})

test('scores under the new weights are transparent and never favour missing data', () => {
  const full = calculateHabitabilityScore({ radius_earth: 1, mass_earth: 1, equilibrium_temperature_k: 255, semi_major_axis_au: 1, star_temperature_k: 5772, star_luminosity_log_solar: 0 })
  assert.equal(full.total, 100)
  const r = calculateHabitabilityScore({ ...KEPLER452, star_luminosity_log_solar: 0.0845 })
  assert.equal(r.components.temperature.score, 30) // 265 K is inside the 200-300 K comfortable band
  assert.equal(r.components.habitableZone.score, 23) // optimistic zone only (65% of 35)
  assert.equal(r.components.planetSize.score, 10)
  assert.equal(r.components.dataCompleteness.score, 12) // 4 of 5 measurements = 80% of 15
  assert.equal(r.total, 75)
  // components are listed in the order shown to the user
  assert.deepEqual(Object.keys(r.components), ['habitableZone', 'temperature', 'planetSize', 'dataCompleteness'])
  // essential data missing -> no overall score at all
  assert.equal(calculateHabitabilityScore({ radius_earth: 1, mass_earth: 2 }).total, null)
})

test('mass indicator: density only when mass AND radius are known; missing mass is unavailable', () => {
  const earth = massIndicator({ mass_earth: 1, radius_earth: 1 })
  assert.ok(Math.abs(earth.density.value - EARTH_DENSITY_G_CM3) < 1e-9 && earth.density.derived === true)
  assert.ok(Math.abs(earth.density.relativeToEarth - 1) < 1e-9)
  const dense = massIndicator({ mass_earth: 8, radius_earth: 1.6 }) // M/R^3 = 1.95 -> denser than Earth
  assert.ok(dense.density.relativeToEarth > 1.9 && dense.density.relativeToEarth < 2.0)
  const noRadius = massIndicator({ mass_earth: 1.055 })
  assert.equal(noRadius.available, true); assert.equal(noRadius.density, null); assert.match(noRadius.explanation, /density cannot be derived/)
  const none = massIndicator({})
  assert.equal(none.available, false); assert.equal(none.value, null); assert.match(none.explanation, /no mass/)
  assert.match(massIndicator({ mass_earth: 193.9, discovery_method: 'Radial Velocity' }).explanation, /minimum mass/)
  assert.doesNotMatch(massIndicator({ mass_earth: 1, discovery_method: 'Transit' }).explanation, /minimum mass/)
})

test('equilibrium temperature is always explained as NOT the surface temperature', () => {
  const t = temperatureRelevance(KEPLER452)
  assert.equal(t.available, true)
  assert.match(t.explanation, /NOT the surface temperature/)
  assert.match(t.explanation, /255 K/) // Earth's own equilibrium temperature
  assert.match(t.summary, /below the freezing point/) // 265 K is just under 273 K
  assert.match(temperatureRelevance({ equilibrium_temperature_k: 300 }).summary, /between the freezing and boiling/)
  assert.match(temperatureRelevance({ equilibrium_temperature_k: 150 }).summary, /below the freezing point/)
  assert.match(temperatureRelevance({ equilibrium_temperature_k: 1500 }).summary, /above the boiling point/)
  const missing = temperatureRelevance({})
  assert.equal(missing.available, false); assert.equal(missing.summary, 'Data unavailable')
  assert.match(missing.explanation, /NOT the surface temperature/) // the caveat is shown even when the value is missing
})

test('host star: classification, temperature, luminosity provenance, and honest activity note', () => {
  const g = hostStarCharacteristics({ ...KEPLER452, star_luminosity_log_solar: 0.0845 })
  assert.equal(g.classification.label, 'G-type · Yellow dwarf'); assert.equal(g.temperature, 5757); assert.equal(g.spectralType, 'G2')
  assert.equal(g.luminosity.source, 'reported')
  assert.equal(g.activity.available, false); assert.doesNotMatch(g.activity.note, /magnetically active/) // no claim for a G star
  const derived = hostStarCharacteristics(KEPLER452) // no st_lum: derived from radius and temperature
  assert.equal(derived.luminosity.source, 'derived')
  const m = hostStarCharacteristics({ star_temperature_k: 2566, star_radius_solar: 0.119, star_spectral_type: 'M8.0 V' })
  assert.match(m.activity.note, /general astronomy, not a measurement/)
  const nothing = hostStarCharacteristics({})
  assert.equal(nothing.classification.available, false); assert.equal(nothing.temperature, null); assert.equal(nothing.luminosity, null)
})

test('data availability distinguishes measured, derived and unavailable', () => {
  const d = dataAvailability(KEPLER452) // no mass; luminosity must be derived
  const by = Object.fromEntries(d.items.map((i) => [i.key, i.state]))
  assert.deepEqual(by, { radius: 'measured', mass: 'unavailable', temperature: 'measured', orbit: 'measured', star: 'derived' })
  assert.equal(d.measured, 3); assert.equal(d.derived, 1); assert.equal(d.unavailable, 1)
  assert.match(d.items.find((i) => i.key === 'star').note, /calculated/)
  const reported = dataAvailability({ ...KEPLER452, star_luminosity_log_solar: 0.08 })
  assert.equal(reported.items.find((i) => i.key === 'star').state, 'measured')
  assert.equal(dataAvailability({}).unavailable, 5)
})

import { ORBIT_SPEED, orbitSpeedFactor } from '../src/components/3d/scaling.js'
test('orbit speed multipliers: slow is 0.15x, default and unknown fall back to slow', () => {
  assert.deepEqual(ORBIT_SPEED, { slow: 0.15, normal: 0.4, fast: 1 })
  assert.equal(orbitSpeedFactor('fast'), 1)
  assert.equal(orbitSpeedFactor(undefined), 0.15)
  // uniform scale keeps the ratio between two planets' angular speeds
  const w = (days, f) => f / (4 + 5 * Math.log10(1 + days))
  assert.ok(Math.abs(w(10, 0.15) / w(300, 0.15) - w(10, 1) / w(300, 1)) < 1e-12)
})
