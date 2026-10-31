import { useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import PlanetList from './PlanetList.jsx'
import SystemList from './SystemList.jsx'
import FeaturedStrip from './FeaturedStrip.jsx'
import QuickFilters from './QuickFilters.jsx'
import { Loading } from '../States.jsx'

const TABS = [
  { id: 'systems', label: 'Star systems' },
  { id: 'exoplanets', label: 'Exoplanets' },
]


export default function IndexPanel({
  tab, onTab, loading, total, planets, systems, query, onQuery, filters, setFilters, methods, featured, featuredError,
  selectedPlanetId, activeSystemId, onSelectPlanet, onSelectSystem, onClear, systemIdOf, onExplore,
}) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <section className="glass-lite flex max-h-full min-h-0 flex-col" aria-label="Deep space index">
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-2 pt-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="caps whitespace-nowrap text-slate-400">Deep space index</div>
            <span className="whitespace-nowrap text-xs tabular-nums text-slate-300" aria-live="polite">{loading ? '…' : `${total} targets`}</span>
          </div>
          <h2 className="mt-1 whitespace-nowrap text-xl font-light tracking-wide">Discover worlds</h2>
        </div>

        <label className="flex items-center gap-2 border-b border-white/15 pb-2 text-xs text-slate-300 focus-within:border-sky-200/60">
          <Search className="h-3.5 w-3.5 flex-none text-slate-400" />
          <input className="w-full bg-transparent outline-none placeholder:text-slate-500" placeholder="Search planets and star systems…"
            aria-label="Search planets" value={query} onChange={(e) => onQuery(e.target.value)} />
        </label>

        <div className="flex gap-1.5" role="tablist" aria-label="Index sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-full border py-2 text-sm transition ${tab === t.id ? 'border-white/25 bg-white/[0.12] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <Loading text="Loading NASA data…" />}

        {tab === 'exoplanets' && !loading && (
          <>
            <FeaturedStrip planets={featured} error={featuredError} selectedId={selectedPlanetId} onSelect={onSelectPlanet} />
            <PlanetList planets={planets} selectedId={selectedPlanetId} onSelect={onSelectPlanet} onClear={onClear}
              grouped={filters.sort === 'system'} onSelectSystem={onSelectSystem} systemIdOf={systemIdOf} />
            <button className="flex items-center justify-between text-xs text-slate-400 hover:text-slate-200" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /> Filters &amp; sort</span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {showFilters && <div className="max-h-[34vh] overflow-y-auto"><QuickFilters filters={filters} setFilters={setFilters} methods={methods} count={planets.length} /></div>}
          </>
        )}

        {tab === 'systems' && !loading && <SystemList systems={systems} activeId={activeSystemId} onSelect={onSelectSystem} />}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
        <span className="min-w-0 truncate">NASA archive + local data</span>
        <button className="flex-none whitespace-nowrap text-slate-200 hover:text-white" onClick={onExplore}>Explore ↗</button>
      </footer>
    </section>
  )
}
