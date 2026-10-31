import { Check, X } from 'lucide-react'

export default function DataCompleteness({ completeness: c }) {
  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={c.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-400" style={{ width: `${c.percent}%` }} />
      </div>
      <ul className="mt-3 space-y-1">
        {c.items.map((i) => (
          <li key={i.key} className="flex items-center gap-2 text-xs">
            {i.present ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <X className="h-3.5 w-3.5 text-amber-300/80" />}
            <span className={i.present ? 'text-slate-300' : 'text-slate-400'}>{i.label}{!i.present && ' — unavailable'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
