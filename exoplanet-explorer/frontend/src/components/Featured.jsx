import PlanetCard from './PlanetCard.jsx'
import { ErrorBox, Loading } from './States.jsx'
import { useApi } from '../api.js'

export default function Featured() {
  const { data, error, loading } = useApi('/planets/featured')
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="text-2xl font-semibold">Featured Exoplanets</h2>
      <p className="mb-6 mt-1 text-sm text-slate-400">Notable worlds from the NASA Exoplanet Archive.</p>
      {loading && <Loading />}
      {error && <ErrorBox error={error} />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.planets.map((p) => <PlanetCard key={p.id} planet={p} />)}
        </div>
      )}
    </section>
  )
}
