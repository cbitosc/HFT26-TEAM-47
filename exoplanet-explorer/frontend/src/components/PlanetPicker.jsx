import { useMemo, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import PlanetArt from './PlanetArt.jsx'
import { ErrorBox, Loading } from './States.jsx'

/** Searchable planet list in the explorer's index style (glass-lite panel, quiet rows). */
export default function PlanetPicker({ title, subtitle, planets, loading, error, activeIds = [], onPick, top = null, className = '' }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const sorted = [...(planets ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    return s ? sorted.filter((p) => p.name.toLowerCase().includes(s) || (p.host_star ?? '').toLowerCase().includes(s)) : sorted
  }, [planets, q])

  return (
    <aside className={`glass-lite flex min-h-0 flex-col p-4 ${className}`} aria-label={title}>
      <p className="caps text-slate-400">{subtitle}</p>
      <h2 className="mb-3 mt-1 text-lg font-medium">{title}</h2>
      <label className="relative mb-3 block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input className="field !pl-9 !text-sm" placeholder="Search planets or stars…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search planets" />
      </label>
      {top}
      {loading && <Loading />}
      {error && <ErrorBox error={error} />}
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1" role="list">
        {list.map((p) => {
          const active = activeIds.includes(p.id)
          return (
            <div key={p.id} role="listitem">
              <button className={`idx-row ${active ? 'idx-row-active' : ''}`} aria-current={active} onClick={() => onPick(p.id)}>
                <PlanetArt planet={p} size={26} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-normal">{p.name}</strong>
                  <small className="block truncate text-xs text-slate-400">{p.host_star ?? 'Unknown host'}{p.discovery_year ? ` · ${p.discovery_year}` : ''}</small>
                </span>
              </button>
            </div>
          )
        })}
        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-300"><SearchX className="h-6 w-6 text-slate-400" /> No planets match.</div>
        )}
      </div>
    </aside>
  )
}
