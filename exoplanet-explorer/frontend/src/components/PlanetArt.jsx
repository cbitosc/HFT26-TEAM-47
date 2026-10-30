// Illustrative planet thumbnail generated from the planet's measured properties.
// Colour follows equilibrium temperature when known; it is artwork, not a photograph.
function palette(p) {
  const t = p.equilibrium_temperature_k
  if (t == null) return ['#8b9bff', '#3b3f8f']
  if (t > 1000) return ['#ffb86b', '#9c2f1b']
  if (t > 500) return ['#ffd28a', '#a2542a']
  if (t > 250) return ['#7ee0b5', '#2a5fa8']
  return ['#9fd4ff', '#2c3f88']
}

export default function PlanetArt({ planet, size = 'h-32 w-32', label = true }) {
  const [a, b] = palette(planet)
  const gas = planet.radius_earth != null && planet.radius_earth > 6
  const id = `g-${planet.id}`
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className={size} role="img" aria-label={`Illustrative artwork of ${planet.name}`}>
        <defs>
          <radialGradient id={id} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </radialGradient>
          <clipPath id={`c-${planet.id}`}><circle cx="50" cy="50" r="32" /></clipPath>
        </defs>
        <circle cx="50" cy="50" r="40" fill={a} opacity="0.08" />
        <circle cx="50" cy="50" r="32" fill={`url(#${id})`} />
        {gas && (
          <g clipPath={`url(#c-${planet.id})`} opacity="0.25" stroke="#fff" strokeWidth="3">
            <line x1="15" y1="40" x2="85" y2="40" /><line x1="15" y1="52" x2="85" y2="52" /><line x1="15" y1="63" x2="85" y2="63" />
          </g>
        )}
        <circle cx="50" cy="50" r="32" fill="none" stroke="#fff" strokeOpacity="0.12" />
      </svg>
      {label && <span className="absolute bottom-0 right-0 rounded bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">Illustration</span>}
    </div>
  )
}
