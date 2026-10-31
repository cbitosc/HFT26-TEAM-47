import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import PlanetArt from '../components/PlanetArt.jsx'
import PlanetPicker from '../components/PlanetPicker.jsx'
import { useApi } from '../api.js'
import { distanceLabel, withUnit } from '../format.js'
import { calculateHabitabilityScore } from '../utils/habitabilityCalculations.js'
import { LAST_PLANET_KEY } from '../hooks/useAstronomerChat.js'

const MAX = 3
const readLast = () => { try { return sessionStorage.getItem(LAST_PLANET_KEY) } catch { return null } }

const ROWS = [
  ['Radius', (p) => withUnit(p.radius_earth, 'R⊕')],
  ['Mass', (p) => withUnit(p.mass_earth, 'M⊕')],
  ['Equilibrium temperature', (p) => withUnit(p.equilibrium_temperature_k, 'K', 0)],
  ['Orbital period', (p) => withUnit(p.orbital_period_days, 'days')],
  ['Semi-major axis', (p) => withUnit(p.semi_major_axis_au, 'AU', 3)],
  ['Distance from Earth', (p) => distanceLabel(p)],
  ['Host star', (p) => p.host_star],
  ['Host star temperature', (p) => withUnit(p.star_temperature_k, 'K', 0)],
  ['Discovered', (p) => (p.discovery_year ? `${p.discovery_year}${p.discovery_method ? ` · ${p.discovery_method}` : ''}` : null)],
]

const Cell = ({ value }) => (value ? <span>{value}</span> : <span className="text-amber-300/80">Data unavailable</span>)


export default function Compare() {
  const all = useApi('/planets')
  const [ids, setIds] = useState(() => [readLast()].filter(Boolean))
  const planets = all.data?.planets
  const byId = useMemo(() => Object.fromEntries((planets ?? []).map((p) => [p.id, p])), [planets])
  const chosen = useMemo(() => ids.map((id) => byId[id]).filter(Boolean), [ids, byId])
  const scores = useMemo(() => chosen.map((p) => calculateHabitabilityScore(p)), [chosen])
  const toggle = (id) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-MAX)))

  return (
    <main className="mx-auto flex max-w-[1600px] flex-col gap-[var(--gap)] px-[var(--edge)] pb-[var(--gap)] lg:h-[calc(100dvh_-_var(--topbar-h,5rem))] lg:flex-row">
      <PlanetPicker title="Compare planets" subtitle={`Choose up to ${MAX}`} planets={planets} loading={all.loading} error={all.error}
        activeIds={ids} onPick={toggle} className="max-h-72 lg:max-h-none lg:w-[264px] lg:flex-none" />

      <section className="glass flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden" aria-label="Comparison">
        <div className="flex-none px-6 pb-3 pt-6">
          <p className="caps text-slate-400">Side by side</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Compare Planets</h1>
        </div>
        {chosen.length === 0 ? (
          <p className="px-6 pb-8 text-sm text-slate-300">Select planets from the list to compare their measured properties. Values NASA does not report are marked “Data unavailable”.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
            <table className="w-full min-w-[480px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="w-40 border-b border-white/10 pb-3" />
                  {chosen.map((p) => (
                    <th key={p.id} className="border-b border-white/10 px-3 pb-3 text-left align-top font-normal">
                      <div className="flex items-center gap-3">
                        <PlanetArt planet={p} size={36} />
                        <strong className="min-w-0 flex-1 truncate text-base font-medium">{p.name}</strong>
                        <button className="glass-btn !h-6 !w-6 !p-0" onClick={() => toggle(p.id)} aria-label={`Remove ${p.name}`}><X className="h-3 w-3" /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, get]) => (
                  <tr key={label}>
                    <td className="border-b border-white/[0.06] py-2.5 pr-3 text-slate-400">{label}</td>
                    {chosen.map((p) => <td key={p.id} className="border-b border-white/[0.06] px-3 py-2.5"><Cell value={get(p)} /></td>)}
                  </tr>
                ))}
                <tr>
                  <td className="py-3 pr-3 text-slate-400">Screening score</td>
                  {scores.map((r, i) => (
                    <td key={chosen[i].id} className="px-3 py-3">
                      {r.total != null ? <><b className="text-lg font-medium">{r.total}</b><span className="text-slate-400"> / 100</span></> : <span className="text-amber-300/80">Insufficient data</span>}
                      <small className="mt-0.5 block text-xs text-slate-400">{r.category}</small>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              The screening score is educational: it does not establish whether a planet supports life. Source: NASA Exoplanet Archive; planet artwork is illustrative.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
