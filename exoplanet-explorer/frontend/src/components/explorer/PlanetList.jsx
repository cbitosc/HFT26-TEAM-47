import { useEffect, useRef } from 'react'
import { ChevronRight, SearchX } from 'lucide-react'
import { classifyPlanetSize } from '../../utils/habitabilityCalculations.js'

const shortClass = (p) => (classifyPlanetSize(p.radius_earth)?.label ?? 'Unclassified').replace(/\s*\(.*\)/, '')


export default function PlanetList({ planets, selectedId, onSelect, onClear, loading, grouped = false, onSelectSystem, systemIdOf }) {
  const box = useRef(null)


  useEffect(() => {
    const row = box.current?.querySelector('[aria-current="true"]')
    if (!row) return
    const c = box.current
    if (row.offsetTop < c.scrollTop) c.scrollTop = row.offsetTop - 8
    else if (row.offsetTop + row.offsetHeight > c.scrollTop + c.clientHeight) c.scrollTop = row.offsetTop + row.offsetHeight - c.clientHeight + 8
  }, [selectedId, planets])

  let lastHost
  return (
    <div ref={box} className="relative -mx-1 min-h-0 flex-1 overflow-y-auto px-1" role="list">
      {planets.map((p) => {
        const header = grouped && p.host_star !== lastHost
        lastHost = p.host_star
        const active = p.id === selectedId
        return (
          <div key={p.id} role="listitem">
            {header && (
              <button className="caps mt-2 flex w-full items-center justify-between px-2 pt-1 text-xs text-sky-200/80 hover:text-sky-100"
                onClick={() => p.host_star && onSelectSystem?.(systemIdOf(p.host_star))} title="Open this star system">
                <span className="truncate">{p.host_star ?? 'Unknown host'}</span>
                <span className="flex items-center gap-0.5">System <ChevronRight className="h-3 w-3" /></span>
              </button>
            )}
            <button className={`idx-row ${active ? 'idx-row-active' : ''}`} aria-current={active} onClick={() => onSelect(p.id)}>
              <i className="h-2 w-2 flex-none rounded-full" style={{ background: active ? '#a5d8ff' : 'transparent', boxShadow: active ? '0 0 10px #a5d8ff' : 'inset 0 0 0 1.5px rgba(200,215,255,.55)' }} aria-hidden />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-normal">{p.name}</strong>
                <small className="block truncate text-xs text-slate-400">{p.host_star ?? 'Unknown host'} · {shortClass(p)}</small>
              </span>
            </button>
          </div>
        )
      })}
      {!loading && planets.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-300">
          <SearchX className="h-6 w-6 text-slate-400" />
          No planets match your filters.
          <button className="glass-btn px-4 py-1.5 text-xs" onClick={onClear}>Clear filters</button>
        </div>
      )}
    </div>
  )
}
