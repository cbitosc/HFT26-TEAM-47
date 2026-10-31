import { ChevronRight, Orbit, Star } from 'lucide-react'
import PlanetArt from '../PlanetArt.jsx'
import { starColorFromTemp } from '../3d/scaling.js'
import { fmt, withUnit } from '../../format.js'
import { stellarLuminosity } from '../../utils/habitabilityCalculations.js'
import StellarClassBadge from '../dashboard/StellarClassBadge.jsx'

function Stat({ label, value, sub, wide }) {
  return (
    <div className={`glass-tile p-3 ${wide ? 'col-span-2' : ''}`}>
      <span className="mb-1 block text-xs text-slate-300">{label}</span>
      {value ? <strong className="text-sm font-medium">{value}</strong> : <span className="text-sm text-amber-300/80">Data unavailable</span>}
      {sub && value && <small className="mt-0.5 block text-xs text-slate-400">{sub}</small>}
    </div>
  )
}


export default function SystemDetail({ system: s, onSelectPlanet }) {
  const color = starColorFromTemp(s.star_temperature_k)
  const lum = stellarLuminosity({ star_luminosity_log_solar: s.star_luminosity_log_solar, star_radius_solar: s.star_radius_solar, star_temperature_k: s.star_temperature_k })
  const missing = s.declaredCount != null && s.declaredCount > s.count
  return (
    <aside className="glass flex max-h-full min-h-0 flex-col" aria-label={`${s.host} system`}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 flex-none place-items-center rounded-full bg-black/30 ring-1 ring-white/20" style={{ boxShadow: `0 0 28px ${color}55` }}>
            <Star className="h-7 w-7" style={{ color, fill: color }} />
          </span>
          <div className="min-w-0">
            <div className="text-xs tracking-[0.18em] text-slate-300">STAR SYSTEM</div>
            <h1 className="truncate text-xl font-semibold">{s.host}</h1>
            <span className="mt-1 inline-block rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs">{s.count} exoplanet{s.count === 1 ? '' : 's'}</span>
            <div className="mt-2"><StellarClassBadge star={s} /></div>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium">Host star</h2>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Temperature" value={withUnit(s.star_temperature_k, 'K', 0)} sub="effective" />
            <Stat label="Radius" value={withUnit(s.star_radius_solar, 'R☉')} sub="solar radii" />
            <Stat label="Mass" value={withUnit(s.star_mass_solar, 'M☉')} sub="solar masses" />
            <Stat label="Luminosity" value={lum ? `${fmt(lum.value, lum.value < 0.01 ? 5 : 3)} L☉` : null} sub={lum?.source === 'derived' ? 'derived from radius & temperature' : 'solar luminosities'} />
            <Stat label="Spectral type" value={s.star_spectral_type} />
            <Stat label="Metallicity" value={s.star_metallicity_dex != null ? `${fmt(s.star_metallicity_dex, 2)} dex` : null} sub="[Fe/H]" />
            <Stat wide label="Distance" value={s.distance_light_years != null ? `${fmt(s.distance_light_years, 1)} ly` : null} sub="from Earth" />
          </div>
        </div>

        {missing && <p className="text-xs text-amber-300/80">NASA lists {s.declaredCount} planets for this star; {s.count} have confirmed records in the archive's default set.</p>}

        <div>
          <h2 className="mb-2 text-sm font-medium">Exoplanets, innermost first</h2>
          <div className="space-y-1.5">
            {s.planets.map((p) => (
              <button key={p.id} className="list-row glass-tile !rounded-2xl" onClick={() => onSelectPlanet(p.id)}>
                <PlanetArt planet={p} size={34} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-medium">{p.name}</strong>
                  <small className="block text-xs text-slate-300">
                    {withUnit(p.radius_earth, 'R⊕') ?? 'radius unavailable'} · {withUnit(p.orbital_period_days, 'd') ?? 'period unavailable'}
                    {p.semi_major_axis_au != null ? ` · ${fmt(p.semi_major_axis_au, 4)} AU` : ''}
                  </small>
                </span>
                <ChevronRight className="h-4 w-4 flex-none text-slate-300" />
              </button>
            ))}
          </div>
        </div>

        <p className="flex gap-2 text-xs leading-snug text-slate-400">
          <Orbit className="mt-0.5 h-3.5 w-3.5 flex-none" />
          The star is drawn from NASA values at a visual scale: colour from effective temperature, size from radius, brightness from luminosity.
          Its surface texture, spots and loops are procedural illustrations, not observed features. Each planet's orbit follows its semi-major
          axis on a stretched log scale; orbits are circular, sizes and speeds illustrative. Planets with no known orbit sit in dashed outer slots.
        </p>
      </div>
    </aside>
  )
}
