import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import PlanetCard from './PlanetCard.jsx'
import { Empty, ErrorBox, Loading } from './States.jsx'

const SORTS = {
  'dist-asc': { label: 'Distance: nearest first', key: 'distance_parsecs', dir: 1 },
  'dist-desc': { label: 'Distance: farthest first', key: 'distance_parsecs', dir: -1 },
  radius: { label: 'Planet radius', key: 'radius_earth', dir: -1 },
  period: { label: 'Orbital period', key: 'orbital_period_days', dir: -1 },
  year: { label: 'Discovery year (newest)', key: 'discovery_year', dir: -1 },
}
const INITIAL = { q: '', method: 'all', rmin: '', rmax: '', sort: 'dist-asc' }

export default function Catalogue({ data, error, loading }) {
  const [f, setF] = useState(INITIAL)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const planets = data?.planets ?? []
  const methods = useMemo(() => [...new Set(planets.map((p) => p.discovery_method).filter(Boolean))].sort(), [planets])

  const results = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const rmin = f.rmin === '' ? null : Number(f.rmin)
    const rmax = f.rmax === '' ? null : Number(f.rmax)
    const { key, dir } = SORTS[f.sort]
    return planets
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.host_star ?? '').toLowerCase().includes(q))
      .filter((p) => f.method === 'all' || p.discovery_method === f.method)
      // A radius range only applies to planets whose radius is known.
      .filter((p) => (rmin == null && rmax == null) || (p.radius_earth != null &&
        (rmin == null || p.radius_earth >= rmin) && (rmax == null || p.radius_earth <= rmax)))
      .sort((a, b) => {
        const x = a[key], y = b[key]
        if (x == null && y == null) return 0
        if (x == null) return 1 // missing values always last
        if (y == null) return -1
        return (x - y) * dir
      })
  }, [planets, f])

  const dirty = JSON.stringify(f) !== JSON.stringify(INITIAL)

  return (
    <section id="catalogue" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6">
      <h2 className="text-2xl font-semibold">Planet Catalogue</h2>
      <p className="mb-6 mt-1 text-sm text-slate-400">Search, filter and sort confirmed exoplanets.</p>

      <div className="panel mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input className="field pl-9" placeholder="Search planet or host star" value={f.q} onChange={set('q')} aria-label="Search" />
        </div>
        <select className="field" value={f.method} onChange={set('method')} aria-label="Discovery method">
          <option value="all">All methods</option>
          {methods.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="field" type="number" min="0" step="any" placeholder="Min R⊕" value={f.rmin} onChange={set('rmin')} aria-label="Minimum radius" />
          <input className="field" type="number" min="0" step="any" placeholder="Max R⊕" value={f.rmax} onChange={set('rmax')} aria-label="Maximum radius" />
        </div>
        <select className="field" value={f.sort} onChange={set('sort')} aria-label="Sort by">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <button onClick={() => setF(INITIAL)} disabled={!dirty}
          className="flex items-center justify-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40">
          <X className="h-4 w-4" /> Clear
        </button>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox error={error} />}
      {data && (
        <>
          <p className="mb-4 text-sm text-slate-400" aria-live="polite">
            Showing <b className="text-white">{results.length}</b> of {planets.length} planets
          </p>
          {results.length === 0 ? <Empty onClear={() => setF(INITIAL)} /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => <PlanetCard key={p.id} planet={p} />)}
            </div>
          )}
        </>
      )}
    </section>
  )
}
