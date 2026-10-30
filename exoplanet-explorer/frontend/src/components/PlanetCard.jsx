import { Link } from 'react-router-dom'
import PlanetArt from './PlanetArt.jsx'
import { distanceLabel, withUnit } from '../format.js'

const NA = <span className="text-slate-600">Not available</span>

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-200">{value ?? NA}</dd>
    </div>
  )
}

export default function PlanetCard({ planet }) {
  return (
    <Link
      to={`/planet/${planet.id}`}
      className="panel group block p-5 transition hover:border-indigo-400/40 hover:shadow-[0_0_30px_-8px_rgb(99_102_241/0.5)]"
    >
      <div className="mb-4 flex justify-center"><PlanetArt planet={planet} size="h-24 w-24" /></div>
      <h3 className="truncate font-semibold group-hover:text-indigo-300">{planet.name}</h3>
      <p className="mb-3 truncate text-xs text-slate-400">Host star: {planet.host_star ?? 'Unknown'}</p>
      <dl className="space-y-1.5">
        <Row label="Radius" value={withUnit(planet.radius_earth, 'R⊕')} />
        <Row label="Orbital period" value={withUnit(planet.orbital_period_days, 'days')} />
        <Row label="Distance" value={distanceLabel(planet)} />
        <Row label="Discovery" value={planet.discovery_method} />
      </dl>
    </Link>
  )
}
