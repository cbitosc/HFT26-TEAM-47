import { fmt } from '../../format.js'


export default function CompareBar({ value, reference = 1, referenceLabel = 'Earth', range = [0.1, 100] }) {
  if (value == null) return null
  const [lo, hi] = range.map(Math.log10)
  const pos = (v) => Math.min(100, Math.max(0, ((Math.log10(v) - lo) / (hi - lo)) * 100))
  const ratio = value / reference
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-white/5" role="img"
        aria-label={`${fmt(ratio, 2)} times ${referenceLabel}`}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500/60 to-violet-400/80" style={{ width: `${pos(ratio)}%` }} />
        <div className="absolute -top-1 h-4 w-px bg-white/60" style={{ left: `${pos(1)}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {ratio >= 0.01 ? fmt(ratio, 2) : ratio.toExponential(1)}× {referenceLabel}
        <span className="text-slate-400"> · log scale, tick = {referenceLabel}</span>
      </p>
    </div>
  )
}
