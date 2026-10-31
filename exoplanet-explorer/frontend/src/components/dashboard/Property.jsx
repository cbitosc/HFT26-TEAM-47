import Unavailable from './Unavailable.jsx'

// One labelled measurement tile. `value` null/undefined renders the missing-data indicator.
export default function Property({ label, value, sub, field, tag, derived = false, children }) {
  const missing = value == null
  return (
    <div className={`rounded-2xl border p-4 ${missing ? 'border-dashed border-white/10 bg-transparent' : 'glass-tile'}`}>
      <dt className="flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        {(derived || tag) && <span className="rounded bg-white/5 px-1.5 py-0.5 text-xs normal-case tracking-normal text-slate-400">{derived ? 'Derived' : tag}</span>}
      </dt>
      <dd className="mt-1">
        <div className="text-lg">{missing ? <Unavailable /> : value}</div>
        {!missing && sub && <p className="text-xs text-slate-400">{sub}</p>}
        {!missing && children}
        {derived && !missing
          ? <p className="mt-2 text-xs text-slate-400">Not reported by NASA; calculated by exoverse from NASA measurements.</p>
          : field && <p className="mt-2 text-xs text-slate-400">NASA field: {field}</p>}
      </dd>
    </div>
  )
}
