import { fmt } from '../../format.js'

const COLORS = {
  'Higher screening suitability': '#67e8f9',
  'Moderate screening suitability': '#a78bfa',
  'Lower screening suitability': '#94a3b8',
  'Insufficient data': '#64748b',
}

export default function HabitabilityScore({ result: r }) {
  const R = 52, C = 2 * Math.PI * R
  const insufficient = r.total == null
  const color = COLORS[r.category]
  return (
    <div className="flex flex-col gap-5 @md:flex-row @md:items-center">
      <div className="relative mx-auto h-36 w-36 shrink-0" role="img" aria-label={insufficient ? 'Insufficient data' : `Screening score ${r.total} out of 100`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth="9" />
          {!insufficient && (
            <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - r.total / 100)} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {insufficient ? <span className="px-3 text-center text-xs text-slate-400">Insufficient data</span> : (
            <><span className="text-3xl font-semibold">{r.total}</span><span className="text-xs text-slate-400">out of 100</span></>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-slate-400">Educational screening score · not a probability of life</p>
        <h3 className="mt-1 text-xl font-medium" style={{ color }}>{r.category}</h3>
        <p className="mt-1 text-sm text-slate-400">{r.interpretation}</p>

        <table className="mt-3 w-full text-xs">
          <tbody>
            {Object.values(r.components).map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="py-1 pr-2 text-slate-400">{c.label}</td>
                <td className="py-1 text-right">
                  {c.available ? <><b>{fmt(c.score, 1)}</b> <span className="text-slate-400">/ {c.max}</span></>
                    : <span className="text-amber-300/80">Unknown <span className="text-slate-400">(0 / {c.max})</span></span>}
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/10 font-medium">
              <td className="py-1 pr-2">Total</td>
              <td className="py-1 text-right">{insufficient ? '—' : `${r.total} / 100`}</td>
            </tr>
          </tbody>
        </table>
        {r.unknown.length > 0 && <p className="mt-2 text-xs text-amber-300/80">Unknown indicators (scored as 0): {r.unknown.join(', ')}.</p>}
      </div>
    </div>
  )
}
