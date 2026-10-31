import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateDataCompletenessScore, calculateHabitabilityScore, calculateHabitableZoneScore,
  calculatePlanetSizeScore, calculateTemperatureScore, dataCompleteness, habitableZoneBounds,
  parsecsToLightYears, stellarLuminosity,
} from '../src/utils/habitabilityCalculations.js'

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`)

// Earth-like fixture around a Sun-like star (illustrative test data, not NASA data).
const earthLike = {
  radius_earth: 1, mass_earth: 1, equilibrium_temperature_k: 255, semi_major_axis_au: 1,
  star_temperature_k: 5772, star_luminosity_log_solar: 0,
}

test('parsec -> light-year conversion', () => {
  near(parsecsToLightYears(1), 3.26156, 1e-9)
  assert.equal(parsecsToLightYears(null), null)
})

test('Kopparapu bounds for the Sun match published values', () => {
  const z = habitableZoneBounds(5772, 1)
  near(z.conservative.inner, 0.99, 0.02)
  near(z.conservative.outer, 1.70, 0.04)
  near(z.optimistic.inner, 0.75, 0.03)
  near(z.optimistic.outer, 1.77, 0.05)
})

test('HZ shifts inward for dim stars and is unavailable outside the model range', () => {
  const m = habitableZoneBounds(3000, 0.01)
  assert.ok(m.conservative.outer < 0.3)
  assert.equal(habitableZoneBounds(2000, 0.001), null)
  assert.equal(habitableZoneBounds(5772, null), null)
})

test('luminosity: reported, derived, or unknown', () => {
  near(stellarLuminosity({ star_luminosity_log_solar: -2 }).value, 0.01, 1e-12)
  const d = stellarLuminosity({ star_radius_solar: 1, star_temperature_k: 5772 })
  assert.equal(d.source, 'derived'); near(d.value, 1, 1e-9)
  assert.equal(stellarLuminosity({ star_radius_solar: 1 }), null)
})

test('temperature score bands and unknown handling', () => {
  assert.equal(calculateTemperatureScore({ equilibrium_temperature_k: 255 }).score, 30)
  assert.equal(calculateTemperatureScore({ equilibrium_temperature_k: 100 }).score, 0)
  assert.equal(calculateTemperatureScore({ equilibrium_temperature_k: 350 }).score, 15)
  const u = calculateTemperatureScore({})
  assert.equal(u.available, false); assert.equal(u.score, null)
})

test('size score classes', () => {
  assert.equal(calculatePlanetSizeScore({ radius_earth: 1 }).score, 20)
  assert.equal(calculatePlanetSizeScore({ radius_earth: 1.8 }).score, 10)
  assert.equal(calculatePlanetSizeScore({ radius_earth: 12 }).score, 0)
  assert.equal(calculatePlanetSizeScore({ radius_earth: null }).available, false)
})

test('HZ score: inside, outside, and unknown never favourable', () => {
  assert.equal(calculateHabitableZoneScore(earthLike).score, 35)
  assert.equal(calculateHabitableZoneScore({ ...earthLike, semi_major_axis_au: 0.05 }).score, 0)
  assert.equal(calculateHabitableZoneScore({ ...earthLike, semi_major_axis_au: 1.75 }).score, 23) // optimistic only
  for (const missing of ['semi_major_axis_au', 'star_temperature_k', 'star_luminosity_log_solar']) {
    const r = calculateHabitableZoneScore({ ...earthLike, [missing]: null })
    assert.equal(r.available, false, missing); assert.equal(r.score, null, missing)
  }
  // Sun-like orbit distance alone does not imply "in the HZ" around a dim star.
  assert.equal(calculateHabitableZoneScore({ ...earthLike, star_temperature_k: 3000, star_luminosity_log_solar: -2 }).score, 0)
})

test('data completeness counts the five key measurements', () => {
  assert.equal(dataCompleteness(earthLike).percent, 100)
  assert.equal(dataCompleteness({}).percent, 0)
  // star info via radius+temperature (derived luminosity) counts
  const c = dataCompleteness({ star_radius_solar: 1, star_temperature_k: 5772 })
  assert.equal(c.items.find((i) => i.key === 'star').present, true)
  assert.equal(calculateDataCompletenessScore({ radius_earth: 1, mass_earth: 1 }).score, 6)
})

test('overall score: full data, partial data, insufficient data', () => {
  const full = calculateHabitabilityScore(earthLike)
  assert.equal(full.total, 100); assert.equal(full.category, 'Higher screening suitability')

  // Two of three indicators known: counted, but capped at Moderate and unknown listed.
  const partial = calculateHabitabilityScore({ ...earthLike, radius_earth: null, mass_earth: null })
  assert.deepEqual(partial.unknown, ['Planet size suitability'])
  assert.equal(partial.category, 'Moderate screening suitability')
  assert.equal(partial.total, 35 + 30 + 9) // HZ 35 + temperature 30 + completeness 3/5 of 15; size unknown scores 0

  const none = calculateHabitabilityScore({ radius_earth: 1, mass_earth: 2 })
  assert.equal(none.total, null); assert.equal(none.category, 'Insufficient data')
})

test('hot Jupiter scores low', () => {
  const r = calculateHabitabilityScore({
    radius_earth: 12, equilibrium_temperature_k: 1500, semi_major_axis_au: 0.03,
    star_temperature_k: 5700, star_radius_solar: 1, mass_earth: 300,
  })
  assert.equal(r.category, 'Lower screening suitability')
})
