import Unavailable from './Unavailable.jsx'
import { fmt } from '../../format.js'


export default function HabitabilityMetricCard({ metric: m, kind, valueText, children }) {
  return (
    <div className={`rounded-xl border p-4 ${m.available ? 'glass-tile' : 'border-dashed border-white/10'}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium">{m.label}</h3>
        <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-xs text-slate-400">{kind}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div className="text-lg">
          {m.available || m.value != null ? valueText ?? `${fmt(m.value)} ${m.unit}` : <Unavailable />}
        </div>
        <div className="text-sm text-slate-400">
          {m.available ? <><b className="text-white">{fmt(m.score, 1)}</b> / {m.max} pts</> : <span className="text-amber-300/80">Unknown · 0 / {m.max} pts</span>}
        </div>
      </div>
      <p className="mt-1 text-xs capitalize text-cyan-200/80">{m.status}</p>
      {children}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{m.explanation}</p>
    </div>
  )
}
