import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEmptyScene, buildSystemScene, groupSystems, slug, systemLayout } from '../src/utils/systems.js'
import { starScaleFromRadius } from '../src/components/3d/scaling.js'
import { INITIAL_FILTERS, filterAndSort } from '../src/utils/explorerFilters.js'

// Test fixtures with TRAPPIST-1-like spacing (all very close in) plus a planet with no orbit data.
const mk = (name, host, a, extra = {}) => ({ id: slug(name), name, host_star: host, semi_major_axis_au: a, radius_earth: 1, orbital_period_days: a ? 365 * a ** 1.5 : 10, ...extra })
const trappist = ['b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l, i) => mk(`TRAPPIST-1 ${l}`, 'TRAPPIST-1', [0.0115, 0.0158, 0.0223, 0.0292, 0.0385, 0.0469, 0.0619][i], { star_temperature_k: 2566, system_planet_count: 7 }))

test('systems are ordered by planet count (descending), ties alphabetical by host', () => {
  const planets = [
    mk('Zeta b', 'Zeta', 1), mk('Alpha b', 'Alpha', 1), mk('Alpha c', 'Alpha', 2),
    mk('Mid b', 'Mid', 1), mk('Mid c', 'Mid', 2), mk('Beta b', 'Beta', 1), ...trappist,
  ]
  const systems = groupSystems(planets)
  assert.deepEqual(systems.map((s) => [s.host, s.count]), [['TRAPPIST-1', 7], ['Alpha', 2], ['Mid', 2], ['Beta', 1], ['Zeta', 1]])
})

test('duplicate planet records are not double counted', () => {
  const dup = [mk('D b', 'D', 1), mk('D b', 'D', 1), mk('D c', 'D', 2)]
  const [s] = groupSystems(dup)
  assert.equal(s.count, 2)
  assert.equal(s.planets.length, 2)
})

test('groupSystems groups by host, sorts planets by orbit, unknown axis last', () => {
  const planets = [mk('X c', 'X', 0.5), mk('X b', 'X', 0.1), mk('X d', 'X', null), mk('Y b', 'Y', 1), { ...mk('Z b', null, 1) }]
  const systems = groupSystems(planets)
  assert.deepEqual(systems.map((s) => s.host), ['X', 'Y'])
  assert.deepEqual(systems[0].planets.map((p) => p.name), ['X b', 'X c', 'X d'])
  assert.equal(systems[0].count, 3)
})

test('compact systems get well separated, ordered, non-overlapping orbits', () => {
  const layout = systemLayout(trappist)
  assert.equal(layout.length, 7)
  for (let i = 1; i < layout.length; i++) assert.ok(layout[i].orbitRadius - layout[i - 1].orbitRadius >= 0.99, `gap at ${i}`)
  assert.ok(layout[0].orbitRadius >= 3.4)
  assert.ok(layout.at(-1).orbitRadius <= 3.4 + 10 + 0.1)
  assert.ok(layout.every((b) => b.size <= 0.9 && b.size > 0))
  assert.equal(new Set(layout.map((b) => b.phase)).size, 7)
})

test('planets without a semi-major axis are flagged and placed beyond the known ones', () => {
  const layout = systemLayout([mk('A b', 'A', 0.1), mk('A c', 'A', 0.4), mk('A d', 'A', null)])
  const d = layout.find((b) => b.name === 'A d')
  assert.equal(d.estimatedOrbit, true)
  assert.ok(d.orbitRadius > layout.find((b) => b.name === 'A c').orbitRadius)
  assert.equal(layout.filter((b) => b.estimatedOrbit).length, 1)
})

test('single-planet systems still get a sensible orbit', () => {
  const [b] = systemLayout([mk('S b', 'S', 0.05)])
  assert.ok(b.orbitRadius > 3.4 && b.orbitRadius < 8)
})

test('shorter real period means faster animation within a system', () => {
  const layout = systemLayout(trappist)
  for (let i = 1; i < layout.length; i++) assert.ok(layout[i].orbitSeconds > layout[i - 1].orbitSeconds)
})

test('star scale grows with stellar radius and stays bounded so orbits clear the star', () => {
  assert.equal(starScaleFromRadius(null), 1)
  assert.ok(starScaleFromRadius(0.12) < starScaleFromRadius(1) && starScaleFromRadius(1) < starScaleFromRadius(3))
  assert.equal(starScaleFromRadius(0.01), 0.65)
  assert.equal(starScaleFromRadius(500), 1.35)
  // largest star glow (1.5x radius) must stay inside the innermost orbit (3.4)
  assert.ok(1.5 * 1.35 * 1.5 < 3.4)
})

test('each system scene carries its own star colour, scale and orbits', () => {
  const a = buildSystemScene({ planets: trappist, star_temperature_k: 2566, star_radius_solar: 0.12 })
  const b = buildSystemScene({ planets: [mk('H b', 'H', 0.5)], star_temperature_k: 9500, star_radius_solar: 2.4 })
  assert.notEqual(a.starColor, b.starColor)
  assert.ok(a.starScale < b.starScale)
  assert.equal(a.bodies.length, 7)
  assert.equal(b.bodies.length, 1)
  assert.equal(buildEmptyScene().bodies.length, 0)
})

test('system scene reports illustrative orbits only when data is missing', () => {
  assert.equal(buildSystemScene({ planets: trappist, star_temperature_k: 2566 }).estimated.orbit, false)
  assert.equal(buildSystemScene({ planets: [mk('Q b', 'Q', null)], star_temperature_k: null }).estimated.orbit, true)
})

test('sorting by star system groups hosts together', () => {
  const planets = [mk('B b', 'B', 1), mk('A c', 'A', 2), mk('A b', 'A', 1)]
  const out = filterAndSort(planets, {}, '', { ...INITIAL_FILTERS, sort: 'system' })
  assert.deepEqual(out.map((p) => p.name), ['A b', 'A c', 'B b'])
})

