import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Box } from 'lucide-react'
import PlanetArt from '../components/PlanetArt.jsx'
import { ErrorBox, Loading } from '../components/States.jsx'
import { useApi } from '../api.js'
import { PROPERTIES, distanceLabel, fmt, withUnit } from '../format.js'

function Stat({ label, value, note }) {
  return (
    <div className="rounded-xl border border-white/5 bg-space-800/50 p-4">
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg">
        {value ?? <span className="text-sm text-slate-600">Not available</span>}
      </dd>
      {note && value && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export default function PlanetDetail() {
  const { id } = useParams()
  const { data: p, error, loading } = useApi(`/planets/${encodeURIComponent(id)}`)

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/#catalogue" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to catalogue
      </Link>
      {loading && <Loading />}
      {error && <ErrorBox error={error} />}
      {p && (
        <>
          <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row">
            <PlanetArt planet={p} size="h-40 w-40" />
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-semibold sm:text-4xl">{p.name}</h1>
              <p className="mt-1 text-slate-400">Host star: {p.host_star ?? 'Unknown'}</p>
              <p className="mt-1 text-sm text-slate-500">
                Discovered {p.discovery_year ?? 'year unknown'}
                {p.discovery_method && <> · {p.discovery_method}</>}
              </p>
            </div>
          </div>

          <h2 className="mb-3 text-lg font-medium">Physical properties</h2>
          <dl className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROPERTIES.map(({ key, label, unit, digits }) => (
              <Stat key={key} label={label} value={withUnit(p[key], unit, digits)} />
            ))}
            <Stat
              label="Distance from Earth"
              value={distanceLabel(p)}
              note={p.distance_parsecs != null ? `${fmt(p.distance_parsecs, 1)} parsecs` : null}
            />
          </dl>

          <section className="panel flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Box className="h-8 w-8 text-violet-400" />
            <h2 className="text-lg font-medium">3D Planetary Visualization</h2>
            <p className="max-w-md text-sm text-slate-400">
              Interactive 3D visualization of {p.name} and its host star system will be introduced in the next development phase.
            </p>
          </section>
          <p className="mt-6 text-xs text-slate-600">Source: NASA Exoplanet Archive. Planet artwork is illustrative, not a photograph.</p>
        </>
      )}
    </main>
  )
}
