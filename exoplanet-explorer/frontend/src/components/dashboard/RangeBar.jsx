
export default function RangeBar({ min, max, log = false, bands = [], marker, markerLabel, ticks = [] }) {
  const conv = (v) => (log ? Math.log10(v) : v)
  const pos = (v) => Math.min(100, Math.max(0, ((conv(v) - conv(min)) / (conv(max) - conv(min))) * 100))
  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full bg-white/5">
        {bands.map((b) => (
          <div key={b.label} className={`absolute inset-y-0 rounded-sm ${b.className}`} title={b.label}
            style={{ left: `${pos(b.from)}%`, width: `${Math.max(0, pos(b.to) - pos(b.from))}%` }} />
        ))}
        {marker != null && (
          <div className="absolute -top-1.5 h-6 w-0.5 bg-white shadow-[0_0_6px_white]" style={{ left: `${pos(marker)}%` }}
            aria-label={markerLabel} />
        )}
      </div>
      <div className="relative mt-1 h-4 text-xs text-slate-400">
        {ticks.map((t) => (
          <span key={t.label} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(t.value)}%` }}>{t.label}</span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        {bands.map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1">
            <i className={`inline-block h-2 w-2 rounded-sm ${b.className}`} /> {b.label}
          </span>
        ))}
        {marker != null && <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-0.5 bg-white" /> {markerLabel}</span>}
      </div>
    </div>
  )
}
