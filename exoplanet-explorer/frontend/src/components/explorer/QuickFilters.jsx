import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import Toggle from '../ui/Toggle.jsx'
import { INITIAL_FILTERS, NEARBY_MAX_LY, ROCKY_MAX_RADIUS, SORTS } from '../../utils/explorerFilters.js'

const TOGGLES = [
  ['habitable', 'Habitable zone'],
  ['rocky', `Rocky-sized (<${ROCKY_MAX_RADIUS} R⊕)`],
  ['nearby', `Nearby (<${NEARBY_MAX_LY} ly)`],
]

export default function QuickFilters({ filters, setFilters, methods, count }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))
  const dirty = JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS)

  return (
    <section className="glass-tile p-3.5" aria-label="Quick filters">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Quick Filters</h2>
        <SlidersHorizontal className="h-4 w-4 text-slate-300" />
      </div>

      {TOGGLES.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between border-b border-white/10 py-2.5 text-sm text-slate-100">
          <span>{label}</span>
          <Toggle checked={filters[key]} onChange={set(key)} label={`Filter: ${label}`} />
        </div>
      ))}

      <div className="mt-3 grid gap-2">
        <select className="field" value={filters.method} onChange={set('method')} aria-label="Discovery method">
          <option value="all">All discovery methods</option>
          {methods.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="field" type="number" min="0" step="any" placeholder="Min R⊕" value={filters.rmin} onChange={set('rmin')} aria-label="Minimum radius" />
          <input className="field" type="number" min="0" step="any" placeholder="Max R⊕" value={filters.rmax} onChange={set('rmax')} aria-label="Maximum radius" />
        </div>
        <select className="field" value={filters.sort} onChange={set('sort')} aria-label="Sort by">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>

      <button className="glass-btn mt-3 w-full py-2 text-sm" disabled={!dirty} onClick={() => setFilters(INITIAL_FILTERS)}>
        <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">{count} matching</p>
    </section>
  )
}
