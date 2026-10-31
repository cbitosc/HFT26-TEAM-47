

import { calculateHabitabilityScore } from './habitabilityCalculations.js'

export const SORTS = {
  system: { label: 'Star system (grouped)', key: null, dir: 1 },
  'dist-asc': { label: 'Distance: nearest first', key: 'distance_parsecs', dir: 1 },
  'dist-desc': { label: 'Distance: farthest first', key: 'distance_parsecs', dir: -1 },
  radius: { label: 'Planet radius', key: 'radius_earth', dir: -1 },
  period: { label: 'Orbital period', key: 'orbital_period_days', dir: -1 },
  year: { label: 'Discovery year (newest)', key: 'discovery_year', dir: -1 },
}

export const INITIAL_FILTERS = { habitable: false, rocky: false, nearby: false, method: 'all', rmin: '', rmax: '', sort: 'dist-asc' }

export const ROCKY_MAX_RADIUS = 1.6
export const NEARBY_MAX_LY = 100


export function planetFlags(p) {
  const hz = calculateHabitabilityScore(p).components.habitableZone
  return {
    habitable: hz.available && hz.score > 0,
    rocky: p.radius_earth != null && p.radius_earth < ROCKY_MAX_RADIUS,
    nearby: p.distance_light_years != null && p.distance_light_years < NEARBY_MAX_LY,
  }
}

export function filterAndSort(planets, flagsById, query, f) {
  const q = query.trim().toLowerCase()
  const rmin = f.rmin === '' ? null : Number(f.rmin)
  const rmax = f.rmax === '' ? null : Number(f.rmax)
  const { key, dir } = SORTS[f.sort]
  const bySystem = f.sort === 'system'
  return planets
    .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.host_star ?? '').toLowerCase().includes(q))
    .filter((p) => f.method === 'all' || p.discovery_method === f.method)
    .filter((p) => (!f.habitable || flagsById[p.id]?.habitable) && (!f.rocky || flagsById[p.id]?.rocky) && (!f.nearby || flagsById[p.id]?.nearby))
    .filter((p) => (rmin == null && rmax == null) || (p.radius_earth != null
      && (rmin == null || p.radius_earth >= rmin) && (rmax == null || p.radius_earth <= rmax)))
    .sort((a, b) => {
      if (bySystem) {
        const h = (a.host_star ?? '￿').localeCompare(b.host_star ?? '￿', undefined, { numeric: true })
        return h || (a.semi_major_axis_au ?? Infinity) - (b.semi_major_axis_au ?? Infinity)
      }
      const x = a[key], y = b[key]
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return (x - y) * dir
    })
}
