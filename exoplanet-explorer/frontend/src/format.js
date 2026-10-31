

export const fmt = (value, digits = 2) =>
  value == null ? null : Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })

export const withUnit = (value, unit, digits) => {
  const v = fmt(value, digits)
  return v == null ? null : `${v} ${unit}`
}

export const distanceLabel = (p) =>
  p.distance_light_years == null ? null : `${fmt(p.distance_light_years, 1)} ly`

export const PROPERTIES = [
  { key: 'radius_earth', label: 'Radius', unit: 'R⊕' },
  { key: 'mass_earth', label: 'Mass', unit: 'M⊕' },
  { key: 'orbital_period_days', label: 'Orbital period', unit: 'days' },
  { key: 'semi_major_axis_au', label: 'Semi-major axis', unit: 'AU', digits: 4 },
  { key: 'equilibrium_temperature_k', label: 'Equilibrium temperature', unit: 'K', digits: 0 },
  { key: 'star_temperature_k', label: 'Host star temperature', unit: 'K', digits: 0 },
]


export function describePlanet(p) {
  const parts = [`${p.name} is a confirmed exoplanet orbiting ${p.host_star ?? 'an unnamed host star'}.`]
  if (p.discovery_year || p.discovery_method) {
    parts.push(`It was discovered${p.discovery_year ? ` in ${p.discovery_year}` : ''}${p.discovery_method ? ` using the ${p.discovery_method} method` : ''}.`)
  }
  if (p.radius_earth != null) parts.push(`Its radius is ${fmt(p.radius_earth)} times Earth's.`)
  if (p.orbital_period_days != null) parts.push(`One orbit takes ${fmt(p.orbital_period_days)} days.`)
  return parts.join(' ')
}
