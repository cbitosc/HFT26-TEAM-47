import { SearchX } from 'lucide-react'
import { starColorFromTemp } from '../3d/scaling.js'
import { fmt } from '../../format.js'


export default function SystemList({ systems, activeId, onSelect }) {
  return (
    <div className="relative -mx-1 min-h-0 flex-1 overflow-y-auto px-1" role="list">
      {systems.map((s) => {
        const color = starColorFromTemp(s.star_temperature_k)
        const active = s.id === activeId
        return (
          <div key={s.id} role="listitem">
            <button className={`idx-row ${active ? 'idx-row-active' : ''}`} aria-current={active} onClick={() => onSelect(s.id)}>
              <i className="h-2 w-2 flex-none rounded-full" style={{ background: active ? color : 'transparent', boxShadow: active ? `0 0 10px ${color}` : `inset 0 0 0 1.5px ${color}99` }} aria-hidden />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-normal">{s.host}</strong>
                <small className="block truncate text-xs text-slate-400">
                  {s.count} planet{s.count === 1 ? '' : 's'}{s.distance_light_years != null ? ` · ${fmt(s.distance_light_years, 1)} ly` : ''}
                </small>
              </span>
              <span className="flex-none text-xs tabular-nums text-slate-300" aria-label={`${s.count} exoplanets`}>{s.count}</span>
            </button>
          </div>
        )
      })}
      {systems.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-300">
          <SearchX className="h-6 w-6 text-slate-400" /> No star systems match your search.
        </div>
      )}
    </div>
  )
}
