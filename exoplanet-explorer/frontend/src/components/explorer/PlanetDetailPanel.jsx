import { useMemo, useRef } from 'react'
import { Activity, Gauge, Globe2, Sparkles, Star } from 'lucide-react'
import PlanetArt from '../PlanetArt.jsx'
import IslandNav from './IslandNav.jsx'
import PlanetProperties from '../dashboard/PlanetProperties.jsx'
import OrbitalCharacteristics from '../dashboard/OrbitalCharacteristics.jsx'
import HostStarInformation from '../dashboard/HostStarInformation.jsx'
import HabitabilityDashboard from '../dashboard/HabitabilityDashboard.jsx'
import Section from '../dashboard/Section.jsx'
import AstronomerChat from '../astronomer/AstronomerChat.jsx'
import { useActiveSection } from '../../hooks/useActiveSection.js'
import { describePlanet, distanceLabel, fmt, withUnit } from '../../format.js'
import { calculateHabitabilityScore, classifyPlanetSize } from '../../utils/habitabilityCalculations.js'


const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Globe2 },
  { id: 'properties', label: 'Planet Properties', icon: Gauge },
  { id: 'habitability', label: 'Habitability', icon: Activity },
  { id: 'host-star', label: 'Host Star', icon: Star },
  { id: 'ask-ai', label: 'Ask AI', icon: Sparkles },
]
const IDS = SECTIONS.map((s) => s.id)

function Stat({ label, value, sub }) {
  return (
    <div className="glass-tile p-3">
      <span className="mb-1 block text-xs text-slate-300">{label}</span>
      {value ? <strong className="text-base font-medium">{value}</strong> : <span className="text-sm text-amber-300/80">Data unavailable</span>}
      {sub && value && <small className="mt-0.5 block text-xs text-slate-400">{sub}</small>}
    </div>
  )
}

function Overview({ planet: p, result }) {
  const t = p.equilibrium_temperature_k
  const known = result.total != null
  return (
    <Section id="overview" title="Overview" subtitle="At a glance">
      <p className="mb-3 text-sm leading-relaxed text-slate-200">{describePlanet(p)}</p>
      <p className="mb-3 text-xs text-slate-400">
        {p.host_star ? `Orbits ${p.host_star}` : 'Host star unknown'}
        {p.system_planet_count != null && ` · ${p.system_planet_count} known planet${p.system_planet_count === 1 ? '' : 's'} in the system`}
        {p.discovery_year ? ` · discovered ${p.discovery_year}` : ''}{p.discovery_method ? ` by ${p.discovery_method}` : ''}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Size" value={withUnit(p.radius_earth, 'R⊕')} sub="planet radius" />
        <Stat label="Distance" value={distanceLabel(p)} sub="from Earth" />
        <Stat label="Orbital period" value={withUnit(p.orbital_period_days, 'days')} sub="one planetary year" />
        <Stat label="Equilibrium temperature" value={withUnit(t, 'K', 0)} sub={t != null ? `${fmt(t - 273.15, 0)} °C · not a surface temperature` : null} />
      </div>
      <div className="glass-tile mt-3 flex items-center gap-4 p-3.5" aria-label="Screening score summary">
        <div className="gauge" style={{ '--score': `${known ? result.total : 0}%` }}>
          <strong className={known ? 'text-lg' : 'text-xl text-slate-400'}>{known ? result.total : '—'}</strong>
        </div>
        <div className="min-w-0 flex-1 text-xs leading-snug text-slate-300">
          <span className="text-xs font-medium text-emerald-200">{result.category}</span>
          <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
            <i className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-200" style={{ width: `${known ? result.total : 0}%` }} />
          </div>
          Educational screening score. <span className="text-slate-400">Not a scientific probability of life.</span>
        </div>
      </div>
    </Section>
  )
}


export default function PlanetDetailPanel({ planet: p, onOpenSystem }) {
  const result = useMemo(() => calculateHabitabilityScore(p), [p])
  const hz = result.components.habitableZone
  const sizeClass = classifyPlanetSize(p.radius_earth)
  const scroller = useRef(null)
  const { active, scrollTo } = useActiveSection(IDS, scroller)

  return (
    <aside className="glass flex max-h-full min-h-0 flex-1 flex-col" aria-label={`${p.name} details`}>
      <div className="flex flex-none flex-col gap-3 px-5 pb-1 pt-5">
        <div className="flex items-center gap-4">
          <PlanetArt planet={p} size={52} />
          <div className="min-w-0 flex-1">
            <h1 className="mb-1.5 truncate text-xl font-semibold">{p.name}</h1>
            <div className="flex flex-wrap gap-1.5">
              {hz.available && hz.score > 0 && <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-200">Inside habitable zone</span>}
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-slate-100">{sizeClass ? sizeClass.label : 'Size unknown'}</span>
              {p.discovery_method && <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-slate-100">{p.discovery_method}</span>}
            </div>
          </div>
        </div>
        {p.host_star && (
          <button className="glass-btn justify-between px-4 py-2 text-xs" onClick={onOpenSystem}>
            <span className="inline-flex items-center gap-2"><Star className="h-3.5 w-3.5" /> View the {p.host_star} system</span> ›
          </button>
        )}
        <IslandNav items={SECTIONS} active={active} onSelect={scrollTo} label="Planet sections" />
      </div>

      <div ref={scroller} className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <Overview planet={p} result={result} />
        <PlanetProperties planet={p} />
        <OrbitalCharacteristics planet={p} />
        <HabitabilityDashboard planet={p} />
        <HostStarInformation planet={p} />
        <Section id="ask-ai" title="Ask the Virtual Astronomer" subtitle="Answers are grounded in this planet's data">
          <AstronomerChat planet={p} height="h-[360px]" />
        </Section>
        <p className="mt-8 text-xs text-slate-400">Source: NASA Exoplanet Archive. Values marked "Data unavailable" are not reported there and are never estimated, except where labelled "derived".</p>
      </div>
    </aside>
  )
}
