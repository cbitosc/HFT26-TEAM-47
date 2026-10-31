import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ARM_COUNT, GALAXY_RADIUS, PC_PER_UNIT, QUALITY, SUN_X, SUN_Y, armAngle, generateGalaxy, hostPosition, systemPosition,
} from '../src/utils/galaxy.js'

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const SUN = { x: SUN_X, y: SUN_Y, z: 0 }

test('a host star sits at its real distance from the Sun (parsecs -> scene units)', () => {
  const p = hostPosition({ galactic_longitude_deg: 313.9, galactic_latitude_deg: -1.9, distance_parsecs: 1.3 }) // Proxima Cen
  assert.equal(p.source, 'nasa')
  assert.ok(Math.abs(dist(p, SUN) - 1.3 / PC_PER_UNIT) < 1e-9)
  const far = hostPosition({ galactic_longitude_deg: 77.9, galactic_latitude_deg: 10, distance_parsecs: 551.7 }) // Kepler-452
  assert.ok(Math.abs(dist(far, SUN) - 551.7 / PC_PER_UNIT) < 1e-9)
})

test('galactic longitude 0 points toward the galactic centre, latitude 90 toward the north pole', () => {
  const toCentre = hostPosition({ galactic_longitude_deg: 0, galactic_latitude_deg: 0, distance_parsecs: 1500 })
  assert.ok(Math.hypot(toCentre.x, toCentre.z) < Math.hypot(SUN.x, SUN.z)) // closer to the centre than the Sun is
  assert.ok(Math.abs(toCentre.x - (SUN_X - 1500 / PC_PER_UNIT)) < 1e-9)
  const north = hostPosition({ galactic_longitude_deg: 123, galactic_latitude_deg: 90, distance_parsecs: 300 })
  assert.ok(Math.abs(north.y - (SUN_Y + 300 / PC_PER_UNIT)) < 1e-9)
  assert.ok(Math.abs(north.x - SUN_X) < 1e-9 && Math.abs(north.z) < 1e-9)
  const rotation = hostPosition({ galactic_longitude_deg: 90, galactic_latitude_deg: 0, distance_parsecs: 600 }) // direction of galactic rotation
  assert.ok(Math.abs(rotation.z - 600 / PC_PER_UNIT) < 1e-9)
})

test('systems without reliable coordinates are flagged illustrative, never presented as measured', () => {
  assert.equal(hostPosition({ galactic_longitude_deg: null, galactic_latitude_deg: 5, distance_parsecs: 10 }).source, 'illustrative')
  assert.equal(hostPosition({ galactic_longitude_deg: 5, galactic_latitude_deg: 5, distance_parsecs: null }).source, 'illustrative')
  const sys = { planets: [{ galactic_longitude_deg: null }, { galactic_longitude_deg: 10, galactic_latitude_deg: 2, distance_parsecs: 50 }] }
  assert.equal(systemPosition(sys).source, 'nasa') // uses whichever planet of the system has coordinates
})

test('the Sun sits between two spiral arms, in the disk plane near radius 8.18 kpc', () => {
  assert.ok(Math.abs(SUN_X * PC_PER_UNIT - 8180) < 1e-9)
  const sunPhi = 0 // the Sun is on the +x axis of the disk
  const wrap = (a) => Math.abs(((a - sunPhi + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)
  for (let k = 0; k < ARM_COUNT; k++) assert.ok(wrap(armAngle(k, SUN_X)) > 0.6, `arm ${k} passes too close to the Sun`)
})

test('the galaxy is deterministic and its parts have the expected character', () => {
  const a = generateGalaxy('medium'), b = generateGalaxy('medium')
  assert.deepEqual(Array.from(a.stars.positions.slice(0, 30)), Array.from(b.stars.positions.slice(0, 30)))
  assert.equal(a.stars.count, b.stars.count)
  assert.ok(a.stars.count > 20000 && a.dust.count > 300 && a.nebulae.count >= 35)
  assert.ok(generateGalaxy('low').stars.count < a.stars.count && a.stars.count < generateGalaxy('high').stars.count)
  assert.ok(QUALITY.low < QUALITY.medium && QUALITY.medium < QUALITY.high)

  const { positions, colors, sizes, alphas, count } = a.stars
  let maxR = 0, flat = 0, innerWarm = 0, innerN = 0, outerBlue = 0, outerN = 0
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
    assert.ok(Number.isFinite(x + y + z))
    const R = Math.hypot(x, z); maxR = Math.max(maxR, Math.hypot(x, y, z))
    if (Math.abs(y) < 4) flat++
    const warmth = colors[i * 3] - colors[i * 3 + 2] // red minus blue
    if (R < 8) { innerN++; innerWarm += warmth } else if (R > 60 && R < GALAXY_RADIUS) { outerN++; outerBlue += warmth }
    assert.ok(colors[i * 3] <= 1.0001 && colors[i * 3 + 2] >= 0 && sizes[i] > 0 && alphas[i] > 0 && alphas[i] <= 1)
  }
  assert.ok(maxR < GALAXY_RADIUS * 1.6, `max radius ${maxR}`) // nothing far outside the galaxy
  assert.ok(flat / count > 0.8, 'the stars form a flattened disk') // flattened disk
  assert.ok(innerWarm / innerN > outerBlue / outerN + 0.15, 'the core is warmer than the outer disk')
})

test('spiral structure: the disk is denser along the arms than between them', () => {
  const { positions, count } = generateGalaxy('high').stars
  let nearArm = 0, total = 0
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], z = positions[i * 3 + 2], R = Math.hypot(x, z)
    if (R < 25 || R > 85) continue
    total++
    const phi = Math.atan2(z, x)
    let best = Infinity
    for (let k = 0; k < ARM_COUNT; k++) {
      const d = Math.abs(((phi - armAngle(k, R) + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)
      best = Math.min(best, d)
    }
    if (best < 0.25) nearArm++
  }
  // arms cover ~4*(0.5)/(2*pi)=32% of the angle; a clear spiral concentrates well above that
  assert.ok(nearArm / total > 0.5, `${(100 * nearArm / total).toFixed(0)}% of stars within the arms`)
})
