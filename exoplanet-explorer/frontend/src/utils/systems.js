// Star-system grouping and the mock-orbit scene layouts. Pure functions (unit tested).
import { DEFAULTS, classifyPlanet, getSceneParams, orbitSecondsFromDays, planetSizeFromRadius, starColorFromTemp, starScaleFromRadius } from '../components/3d/scaling.js'
import { starVisuals } from './stellarScaling.js'

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const byAxis = (a, b) => {
  const x = a.semi_major_axis_au, y = b.semi_major_axis_au
  if (x == null && y == null) return a.name.localeCompare(b.name)
  if (x == null) return 1
  if (y == null) return -1
  return x - y
}
const firstNum = (planets, key) => planets.map((p) => p[key]).find((v) => v != null) ?? null

/**
 * Group planets by host star and order the systems by planet count, highest first; equal counts fall back to
 * the host star's name. Planet records are de-duplicated by id, and the NASA `ps` table only holds confirmed
 * planets, so nothing unconfirmed is counted. Planets without a host star name are left out.
 */
export function groupSystems(planets) {
  const map = new Map()
  const seen = new Set()
  for (const p of planets) {
    if (!p.host_star || seen.has(p.id)) continue
    seen.add(p.id)
    if (!map.has(p.host_star)) map.set(p.host_star, [])
    map.get(p.host_star).push(p)
  }
  return [...map.entries()]
    .map(([host, list]) => {
      const ps = [...list].sort(byAxis)
      return {
        id: slug(host), host, planets: ps, count: ps.length,
        declaredCount: Math.max(0, ...ps.map((p) => p.system_planet_count ?? 0)) || null, // NASA's sy_pnum
        star_temperature_k: firstNum(ps, 'star_temperature_k'),
        star_radius_solar: firstNum(ps, 'star_radius_solar'),
        star_mass_solar: firstNum(ps, 'star_mass_solar'),
        star_luminosity_log_solar: firstNum(ps, 'star_luminosity_log_solar'),
        star_spectral_type: ps.map((p) => p.star_spectral_type).find(Boolean) ?? null,
        star_metallicity_dex: firstNum(ps, 'star_metallicity_dex'),
        star_data_source: ps[0].star_data_source ?? null,
        distance_light_years: firstNum(ps, 'distance_light_years'),
      }
    })
    .sort((a, b) => b.count - a.count || a.host.localeCompare(b.host, undefined, { numeric: true }))
}

// ---- scene layouts ----------------------------------------------------------------------------------

const SYSTEM_INNER = 3.4 // first orbit just outside the star
const SYSTEM_GAP = 1.0 // minimum spacing between neighbouring orbits
const PHASE_STEP = 2.1 // radians; spreads planets around their orbits at start

/**
 * Mock orbit layout for a whole system. Orbit radii follow the planets' real semi-major axes on a
 * log scale stretched across the system, then are pushed apart so orbits never overlap. Planets without
 * a semi-major axis get evenly spaced outer slots and are flagged as illustrative.
 */
export function systemLayout(planets) {
  const sorted = [...planets].sort(byAxis)
  const known = sorted.filter((p) => p.semi_major_axis_au != null)
  const logs = known.map((p) => Math.log10(p.semi_major_axis_au))
  const lo = Math.min(...logs), span = Math.max(...logs) - lo
  const extent = Math.min(10, 1.4 * Math.max(sorted.length - 1, 1) + 1.5)

  let prev = SYSTEM_INNER - SYSTEM_GAP
  return sorted.map((p, i) => {
    const hasAxis = p.semi_major_axis_au != null
    let r
    if (hasAxis) {
      const t = known.length === 1 ? 0.35 : span > 0.01 ? (Math.log10(p.semi_major_axis_au) - lo) / span : known.indexOf(p) / (known.length - 1)
      r = SYSTEM_INNER + t * extent
    } else {
      r = prev + SYSTEM_GAP * 1.2
    }
    r = Math.max(r, prev + SYSTEM_GAP)
    prev = r
    return {
      id: p.id, name: p.name, label: p.name.replace(`${p.host_star} `, ''), type: classifyPlanet(p),
      size: p.radius_earth != null ? Math.min(0.9, planetSizeFromRadius(p.radius_earth)) : DEFAULTS.planetSize,
      orbitRadius: r,
      orbitSeconds: p.orbital_period_days != null ? orbitSecondsFromDays(p.orbital_period_days) : DEFAULTS.orbitSeconds,
      phase: i * PHASE_STEP, estimatedOrbit: !hasAxis,
    }
  })
}

// ---- complete scenes for the universe canvas ---------------------------------------------------------

/** Placeholder while data loads: just a star. */
export function buildEmptyScene() {
  const star = starVisuals(null)
  return { star, starColor: star.hex, starScale: 1, outer: 10, bodies: [], estimated: {} }
}

export function buildPlanetScene(p) {
  const sp = getSceneParams(p)
  return {
    star: sp.star, starColor: sp.starColor, starScale: sp.starScale, outer: sp.orbitRadius, estimated: sp.estimated,
    bodies: [{ id: p.id, name: p.name, label: null, type: sp.type, size: sp.planetSize, orbitRadius: sp.orbitRadius,
      orbitSeconds: sp.orbitSeconds, phase: 0, estimatedOrbit: sp.estimated.orbit }],
  }
}

export function buildSystemScene(system) {
  const bodies = systemLayout(system.planets)
  return {
    star: starVisuals(system), starColor: starColorFromTemp(system.star_temperature_k), starScale: starScaleFromRadius(system.star_radius_solar), outer: Math.max(...bodies.map((b) => b.orbitRadius)), bodies,
    estimated: { orbit: bodies.some((b) => b.estimatedOrbit) },
  }
}
