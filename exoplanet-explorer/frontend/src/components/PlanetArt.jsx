

function palette(p) {
  const t = p.equilibrium_temperature_k
  if (t == null) return ['#cfd8ff', '#7a86d9', '#262c63']
  if (t > 1000) return ['#ffe0b8', '#e08a4a', '#5c1d12']
  if (t > 500) return ['#ffe6bd', '#d08a55', '#4a2218']
  if (t > 250) return ['#d6fbe9', '#4aa6c9', '#17335e']
  return ['#e0f2ff', '#6a9be0', '#1c2a63']
}

export default function PlanetArt({ planet, size = 40, className = '' }) {
  const [hi, mid, lo] = palette(planet)
  const giant = planet.radius_earth != null && planet.radius_earth > 6
  const body = `radial-gradient(circle at 30% 24%, ${hi}, ${mid} 40%, ${lo} 74%, #0a0f22)`
  const bands = 'repeating-linear-gradient(8deg, rgba(255,255,255,.14) 0 7%, transparent 7% 16%)'
  return (
    <span className={`orb ${className}`} role="img" aria-label={`Illustrative artwork of ${planet.name}`}
      style={{ width: size, height: size, background: giant ? `${bands}, ${body}` : body }} />
  )
}
