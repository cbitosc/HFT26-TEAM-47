import { Suspense, lazy } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ErrorBox, Loading } from '../components/States.jsx'
import { useApi } from '../api.js'
import { PROPERTIES, distanceLabel, fmt, withUnit } from '../format.js'
import { TYPE_LABELS, classifyPlanet } from '../components/3d/scaling.js'

// three.js is heavy; load it only when a detail page opens.
const PlanetaryScene = lazy(() => import('../components/3d/PlanetaryScene.jsx'))

const SUMMARY_FIELDS = [
  ['radius_earth', 'Radius'], ['mass_earth', 'Mass'], ['orbital_period_days', 'Orbital period'],
  ['semi_major_axis_au', 'Semi-major axis'], ['equilibrium_temperature_k', 'Equilibrium temperature'],
  ['star_temperature_k', 'Host star temperature'], ['distance_parsecs', 'Distance from Earth'],
]

function Stat({ label, value, note }) {
  return (
    <div className="rounded-xl border border-white/5 bg-space-800/50 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5">
        {value ?? <span className="text-sm text-slate-600">Not available</span>}
      </dd>
      {note && value && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  )
}

// Built only from NASA values; categories come from radius alone and are not confirmed compositions.
function describe(p) {
  const parts = [`${p.name} is a confirmed exoplanet orbiting ${p.host_star ?? 'an unnamed host star'}.`]
  if (p.discovery_year || p.discovery_method) {
    parts.push(`It was discovered ${p.discovery_year ? `in ${p.discovery_year} ` : ''}${p.discovery_method ? `using the ${p.discovery_method} method` : ''}.`.replace(' .', '.'))
  }
  if (p.radius_earth != null) parts.push(`Its radius is ${fmt(p.radius_earth)} times Earth's, which the 3D view renders as: ${TYPE_LABELS[classifyPlanet(p)].toLowerCase()}.`)
  if (p.orbital_period_days != null) parts.push(`One orbit takes ${fmt(p.orbital_period_days)} days.`)
  return parts.join(' ')
}

export default function PlanetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: p, error, loading } = useApi(`/planets/${encodeURIComponent(id)}`, { keepPrevious: true })
  const list = useApi('/planets')

  const missing = p ? SUMMARY_FIELDS.filter(([k]) => p[k] == null).map(([, l]) => l) : []

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/#catalogue" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to catalogue
        </Link>
        {list.data && (
          <select className="field !w-auto max-w-full" aria-label="Switch planet" value={p?.id ?? id}
            onChange={(e) => navigate(`/planet/${e.target.value}`)}>
            {[...list.data.planets].sort((a, b) => a.name.localeCompare(b.name)).map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && <ErrorBox error={error} />}
      {!error && !p && loading && <Loading />}

      {!error && p && (
        <>
          <h1 className="text-3xl font-semibold sm:text-4xl">{p.name}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-400">
            Host star: {p.host_star ?? 'Unknown'} · Discovered {p.discovery_year ?? 'year unknown'}
            {p.discovery_method && <> · {p.discovery_method}</>}
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Suspense fallback={<div className="flex h-[440px] items-center justify-center rounded-2xl border border-white/5 text-sm text-slate-400 sm:h-[560px]">Loading 3D visualization…</div>}>
                <PlanetaryScene planet={p} />
              </Suspense>
              <p className="mt-2 text-xs text-slate-500">Drag to rotate · scroll or pinch to zoom · right-drag or two fingers to pan · click the planet to toggle its highlight.</p>
            </div>

            <aside>
              <h2 className="mb-3 text-lg font-medium">Physical properties</h2>
              <dl className="space-y-2">
                {PROPERTIES.map(({ key, label, unit, digits }) => (
                  <Stat key={key} label={label} value={withUnit(p[key], unit, digits)} />
                ))}
                <Stat label="Distance from Earth" value={distanceLabel(p)}
                  note={p.distance_parsecs != null ? `${fmt(p.distance_parsecs, 1)} parsecs` : null} />
              </dl>
            </aside>
          </div>

          <section className="panel mt-8 grid gap-6 p-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-lg font-medium">Description</h2>
              <p className="text-sm leading-relaxed text-slate-300">{describe(p)}</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-medium">Scientific data summary</h2>
              <p className="text-sm text-slate-300">
                {SUMMARY_FIELDS.length - missing.length} of {SUMMARY_FIELDS.length} key measurements reported by NASA.
              </p>
              {missing.length > 0 && (
                <p className="mt-1 text-sm text-slate-500">Not reported: {missing.join(', ')}.</p>
              )}
              <p className="mt-3 text-xs text-slate-600">Source: NASA Exoplanet Archive. Orbits are drawn circular; eccentricity is not shown.</p>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
