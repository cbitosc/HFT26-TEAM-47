import { withUnit } from '../../format.js'
import { TYPE_LABELS } from '../3d/scaling.js'

const Row = ({ label, value, estimated }) => (
  <div className="flex justify-between gap-4 text-xs">
    <dt className="text-slate-400">{label}</dt>
    <dd className={value ? 'text-white' : 'text-amber-300/80'}>
      {value ?? 'Data unavailable'}
      {!value && estimated && <span className="text-slate-500"> (illustrative default shown)</span>}
    </dd>
  </div>
)

export default function PlanetInfoOverlay({ planet, params }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 w-56 max-w-[60%] rounded-xl border border-white/10 bg-space-950/70 p-3 backdrop-blur sm:w-64">
      <h2 className="truncate text-sm font-semibold">{planet.name}</h2>
      <p className="mb-2 truncate text-xs text-cyan-200/80">Host star: {planet.host_star ?? 'Data unavailable'}</p>
      <dl className="space-y-1">
        <Row label="Radius" value={withUnit(planet.radius_earth, 'R⊕')} estimated={params.estimated.radius} />
        <Row label="Orbital period" value={withUnit(planet.orbital_period_days, 'days')} estimated={params.estimated.period} />
        <Row label="Semi-major axis" value={withUnit(planet.semi_major_axis_au, 'AU', 4)} estimated={params.estimated.orbit} />
      </dl>
      <p className="mt-2 text-[10px] text-slate-500">{TYPE_LABELS[params.type]}</p>
      {params.estimated.star && <p className="text-[10px] text-slate-500">Star colour: default (temperature unavailable)</p>}
    </div>
  )
}
