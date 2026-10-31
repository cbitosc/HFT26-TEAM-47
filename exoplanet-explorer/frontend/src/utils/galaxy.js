// Milky Way model and host-star placement. Pure functions (unit tested).
//
// WHAT IS REAL AND WHAT IS ILLUSTRATIVE
//  * Host-star positions are REAL relative positions: NASA's galactic longitude / latitude and distance for each
//    system, converted to Cartesian coordinates around the Sun. Where a system lacks any of these it is flagged
//    "illustrative" and placed near the Sun, never presented as a measurement.
//  * The Sun's place in the galaxy (about 8.18 kpc from the centre, ~20 pc above the disk plane) is a published value.
//  * The galaxy's STRUCTURE (spiral arms, dust lanes, nebulae, halo, clusters) is a procedural, schematic model made
//    for visual context. It is not a star catalogue and the individual stars are not real stars.
//  * The planetary-system view is drawn at SYSTEM_SCALE, far larger than reality, purely so it is visible.

export const PC_PER_UNIT = 150 // 1 scene unit = 150 parsecs (galactic scale)
export const GALAXY_RADIUS = 100 // units (~15 kpc)
export const GALAXY_FRAME_RADIUS = 78 // the bright body of the galaxy; the faint outer disk may bleed past the frame
export const SUN_RADIUS_PC = 8180 // Sun's distance from the galactic centre
export const SUN_HEIGHT_PC = 20 // Sun's height above the galactic plane
export const SUN_X = SUN_RADIUS_PC / PC_PER_UNIT
export const SUN_Y = SUN_HEIGHT_PC / PC_PER_UNIT
export const SYSTEM_SCALE = 0.012 // illustrative: size of a planetary system in galaxy units

const DEG = Math.PI / 180

/** Position of a host star in scene units, with the origin at the galactic centre and the disk in the x-z plane. */
export function hostPosition(p) {
  const l = p.galactic_longitude_deg, b = p.galactic_latitude_deg, d = p.distance_parsecs
  if (![l, b, d].every((v) => typeof v === 'number' && Number.isFinite(v))) {
    // No reliable coordinates: a clearly flagged illustrative spot near the Sun.
    return { x: SUN_X - 0.4, y: SUN_Y, z: 0.4, source: 'illustrative' }
  }
  // Heliocentric galactic Cartesian: X toward the galactic centre, Y toward galactic rotation, Z toward the north pole.
  const X = d * Math.cos(b * DEG) * Math.cos(l * DEG)
  const Y = d * Math.cos(b * DEG) * Math.sin(l * DEG)
  const Z = d * Math.sin(b * DEG)
  // Scene axes: the centre lies toward -x from the Sun; +y is galactic north. (x, y, z) = (-X, Z, Y) keeps handedness.
  return { x: SUN_X - X / PC_PER_UNIT, y: SUN_Y + Z / PC_PER_UNIT, z: Y / PC_PER_UNIT, source: 'nasa' }
}

/** A system's position: the first of its planets with usable coordinates (they all share the same host). */
export function systemPosition(system) {
  const withCoords = system.planets.find((p) => [p.galactic_longitude_deg, p.galactic_latitude_deg, p.distance_parsecs].every((v) => v != null))
  return hostPosition(withCoords ?? system.planets[0])
}

// ---- procedural galaxy ------------------------------------------------------------------------------------

function rng(seed) { // mulberry32: deterministic, so the galaxy looks the same every time
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function gauss(r) { // Box-Muller
  let u = 0
  while (u === 0) u = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}

export const QUALITY = { low: 0.3, medium: 0.6, high: 1 }
export const ARM_COUNT = 4
export const ARM_PITCH = 12 * DEG
const ARM_R_REF = SUN_X // arms are phased so the Sun sits between two of them (Orion spur), a schematic choice

/** Polar angle (radians) of arm `k` at radius r: a logarithmic spiral. */
export const armAngle = (k, r) => Math.PI / 4 + (k * Math.PI * 2) / ARM_COUNT - Math.log(Math.max(r, 1) / ARM_R_REF) / Math.tan(ARM_PITCH)

const lerp = (a, b, t) => a + (b - a) * t
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const WARM = [1.0, 0.82, 0.58], WHITE = [0.92, 0.94, 1.0], BLUE = [0.66, 0.8, 1.0]

class Cloud {
  constructor(n) { this.p = new Float32Array(n * 3); this.c = new Float32Array(n * 3); this.s = new Float32Array(n); this.a = new Float32Array(n); this.n = 0 }
  push(x, y, z, col, size, alpha) {
    const i = this.n++
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z
    this.c[i * 3] = col[0]; this.c[i * 3 + 1] = col[1]; this.c[i * 3 + 2] = col[2]
    this.s[i] = size; this.a[i] = alpha
  }
  done() { return { positions: this.p.subarray(0, this.n * 3), colors: this.c.subarray(0, this.n * 3), sizes: this.s.subarray(0, this.n), alphas: this.a.subarray(0, this.n), count: this.n } }
}

/**
 * Schematic Milky Way: bulge + bar, a thin spiral disk, a sparse halo with globular clusters, dust lanes along the
 * inner edge of each arm, and soft nebulae. Returns separate clouds because they use different blending.
 */
export function generateGalaxy(quality = 'high', seed = 1337) {
  const q = QUALITY[quality] ?? 1
  const r = rng(seed)

  const stars = new Cloud(Math.round(52000 * q) + Math.round(12000 * q) + Math.round(6000 * q) + 24 * 70)

  // Disk (spiral arms + inter-arm field)
  const nDisk = Math.round(52000 * q)
  for (let i = 0; i < nDisk; i++) {
    const u = r()
    const radius = Math.min(GALAXY_RADIUS, 3 - 36 * Math.log(1 - u * (1 - Math.exp(-(GALAXY_RADIUS - 3) / 36)))) // exponential disk
    const inArm = r() < 0.8
    const phi = inArm
      ? armAngle(Math.floor(r() * ARM_COUNT), radius) + gauss(r) * (0.12 + 0.09 * (radius / GALAXY_RADIUS))
      : r() * Math.PI * 2
    const flare = 0.5 + 1.7 * (radius / GALAXY_RADIUS) ** 1.5
    const y = gauss(r) * flare * (r() < 0.2 ? 3 : 1)
    const young = inArm && r() < 0.35
    const base = radius < 30 ? mix3(WARM, WHITE, radius / 30) : mix3(WHITE, BLUE, Math.min(1, (radius - 30) / 70))
    const col = young ? mix3(base, BLUE, 0.7) : base
    const size = 1.2 + 1.0 * r() + (r() < 0.015 ? 2.4 + 2.0 * r() : 0) + (young ? 0.45 : 0)
    const alpha = Math.max(0.15, (0.5 + 0.5 * r()) * (1 - 0.45 * (radius / GALAXY_RADIUS)))
    stars.push(Math.cos(phi) * radius, y, Math.sin(phi) * radius, col, size, alpha)
  }

  // Bulge and bar: dense, warm, slightly elongated
  const nCore = Math.round(12000 * q)
  const bar = 25 * DEG, cb = Math.cos(bar), sb = Math.sin(bar)
  for (let i = 0; i < nCore; i++) {
    const tight = r() < 0.4
    const sx = (tight ? 1.8 : 6.5) * gauss(r), sz = (tight ? 1.8 : 3.0) * gauss(r), sy = (tight ? 1.6 : 3.2) * gauss(r)
    const col = mix3([1.0, 0.9, 0.68], WARM, r() * 0.6)
    stars.push(sx * cb - sz * sb, sy, sx * sb + sz * cb, col, 1 + 1.3 * r() + (r() < 0.02 ? 1.5 : 0), 0.55 + 0.4 * r())
  }

  // Halo: sparse, dim, spherical
  const nHalo = Math.round(6000 * q)
  for (let i = 0; i < nHalo; i++) {
    const rad = 12 + 78 * r() ** 0.7
    const cosT = 2 * r() - 1, sinT = Math.sqrt(1 - cosT * cosT), ph = r() * Math.PI * 2
    stars.push(rad * sinT * Math.cos(ph), rad * cosT * 0.8, rad * sinT * Math.sin(ph), mix3(WARM, WHITE, r()), 0.9 + 0.7 * r(), 0.18 + 0.22 * r())
  }

  // Globular clusters: tight golden clumps in the halo
  for (let c = 0; c < 24; c++) {
    const rad = 15 + 55 * r(), cosT = 2 * r() - 1, sinT = Math.sqrt(1 - cosT * cosT), ph = r() * Math.PI * 2
    const cx = rad * sinT * Math.cos(ph), cy = rad * cosT * 0.8, cz = rad * sinT * Math.sin(ph)
    for (let i = 0; i < 70; i++) stars.push(cx + 0.7 * gauss(r), cy + 0.7 * gauss(r), cz + 0.7 * gauss(r), [1.0, 0.9, 0.7], 1 + 0.8 * r(), 0.5 + 0.4 * r())
  }

  // Dust lanes: dark smudges on the inner edge of each arm
  const nDust = Math.round(1100 * q)
  const dust = new Cloud(nDust)
  for (let i = 0; i < nDust; i++) {
    const k = Math.floor(r() * ARM_COUNT), radius = 9 + 78 * Math.sqrt(r())
    const phi = armAngle(k, radius) - 0.06 + gauss(r) * 0.035
    dust.push(Math.cos(phi) * radius, gauss(r) * 0.3, Math.sin(phi) * radius, [0.02, 0.03, 0.07], 22 + 40 * r(), 0.1 + 0.12 * r())
  }

  // Nebulae and star-forming regions: soft, desaturated gas clouds near the arms
  const nNeb = Math.round(70 * Math.max(q, 0.5))
  const neb = new Cloud(nNeb)
  const PALETTE = [[0.35, 0.55, 0.95], [0.55, 0.38, 0.9], [0.85, 0.4, 0.55], [0.3, 0.75, 0.9]]
  for (let i = 0; i < nNeb; i++) {
    const k = Math.floor(r() * ARM_COUNT), radius = 20 + 70 * r()
    const phi = armAngle(k, radius) + gauss(r) * 0.07
    neb.push(Math.cos(phi) * radius, gauss(r) * 0.5, Math.sin(phi) * radius, PALETTE[Math.floor(r() * PALETTE.length)], 70 + 110 * r(), 0.03 + 0.05 * r())
  }

  return { stars: stars.done(), dust: dust.done(), nebulae: neb.done() }
}
