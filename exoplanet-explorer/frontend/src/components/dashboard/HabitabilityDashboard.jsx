import { useMemo } from 'react'
import Section from './Section.jsx'
import HabitabilityScore from './HabitabilityScore.jsx'
import HabitabilityMetricCard from './HabitabilityMetricCard.jsx'
import DataCompleteness from './DataCompleteness.jsx'
import RangeBar from './RangeBar.jsx'
import CompareBar from './CompareBar.jsx'
import ScientificDisclaimer from './ScientificDisclaimer.jsx'
import { fmt } from '../../format.js'
import { dataAvailability, hostStarCharacteristics, massIndicator, temperatureRelevance } from '../../utils/planetaryIndicators.js'
import {
  CATEGORY_THRESHOLDS, SIZE_BANDS, TEMPERATURE_BANDS, WEIGHTS, calculateHabitabilityScore,
} from '../../utils/habitabilityCalculations.js'

function TemperatureVisual({ metric: m }) {
  if (!m.available) return null
  const { idealMin, idealMax } = TEMPERATURE_BANDS
  return (
    <RangeBar min={0} max={800} marker={m.value} markerLabel={`${fmt(m.value, 0)} K`}
      bands={[{ from: idealMin, to: idealMax, className: 'bg-cyan-400/50', label: `Scored 100%: ${idealMin}-${idealMax} K` }]}
      ticks={[{ value: 0, label: '0' }, { value: 273, label: '273 K' }, { value: 373, label: '373 K' }, { value: 600, label: '600' }]} />
  )
}

function ZoneVisual({ metric: m }) {
  if (!m.available) return null
  const { conservative: c, optimistic: o } = m.zone
  const min = Math.min(m.value, o.inner) / 1.6
  const max = Math.max(m.value, o.outer) * 1.6
  return (
    <>
      <RangeBar log min={min} max={max} marker={m.value} markerLabel={`Planet ${fmt(m.value, 3)} AU`}
        bands={[
          { from: o.inner, to: o.outer, className: 'bg-violet-400/35', label: `Optimistic ${fmt(o.inner, 3)}-${fmt(o.outer, 3)} AU` },
          { from: c.inner, to: c.outer, className: 'bg-emerald-400/60', label: `Conservative ${fmt(c.inner, 3)}-${fmt(c.outer, 3)} AU` },
        ]} />
      <p className="mt-1 text-xs text-slate-400">Log-scale distance from the star (AU).</p>
    </>
  )
}

export default function HabitabilityDashboard({ planet }) {
  const result = useMemo(() => calculateHabitabilityScore(planet), [planet])
  const { temperature: t, habitableZone: hz, planetSize: sz, dataCompleteness: dc } = result.components
  const mass = useMemo(() => massIndicator(planet), [planet])
  const tempInfo = useMemo(() => temperatureRelevance(planet), [planet])
  const star = useMemo(() => hostStarCharacteristics(planet), [planet])
  const avail = useMemo(() => dataAvailability(planet), [planet])
  const zone = hz.available ? hz.zone : null
  const rel = zone && hz.value != null ? (hz.value < zone.optimistic.inner ? 'Closer to the star than the habitable zone (too hot side)'
    : hz.value > zone.optimistic.outer ? 'Farther from the star than the habitable zone (too cold side)'
    : hz.value >= zone.conservative.inner && hz.value <= zone.conservative.outer ? 'Inside the conservative habitable zone' : 'Inside the optimistic habitable zone only') : null

  return (
    <Section id="habitability" title="Habitability screening" subtitle="Educational indicators only. Not a claim that any planet is habitable.">
      <div className="panel p-5 sm:p-6"><HabitabilityScore result={result} /></div>

      <div className="mt-4 grid gap-4 @2xl:grid-cols-2">
        <HabitabilityMetricCard metric={t} kind={planet.derived_fields?.includes('equilibrium_temperature_k') ? 'Derived from star and orbit' : 'Reported measurement'} valueText={t.value != null ? `${fmt(t.value, 0)} K` : undefined}>
          <TemperatureVisual metric={t} />
        </HabitabilityMetricCard>
        <HabitabilityMetricCard metric={hz} kind="Calculated from measurements"
          valueText={hz.value != null ? `${fmt(hz.value, 3)} AU` : undefined}>
          <ZoneVisual metric={hz} />
        </HabitabilityMetricCard>
        <HabitabilityMetricCard metric={sz} kind="Approximate class from radius"
          valueText={sz.value != null ? `${fmt(sz.value)} R⊕ · ${sz.band.label}` : undefined}>
          <CompareBar value={sz.value} />
        </HabitabilityMetricCard>
        <HabitabilityMetricCard metric={dc} kind="Calculated" valueText={`${dc.value}% available`}>
          <DataCompleteness completeness={dc.completeness} />
        </HabitabilityMetricCard>
      </div>

      <div className="mt-4 grid gap-4 @2xl:grid-cols-2">
        <div className="glass-tile rounded-xl border p-4 text-xs leading-relaxed text-slate-400">
          <h3 className="text-sm font-medium text-white">Habitable-zone position</h3>
          {zone ? (
            <ul className="mt-2 space-y-1">
              <li>Planet orbit: <b className="text-white">{fmt(hz.value, 3)} AU</b></li>
              <li>Inner bound (conservative / optimistic): {fmt(zone.conservative.inner, 3)} / {fmt(zone.optimistic.inner, 3)} AU</li>
              <li>Outer bound (conservative / optimistic): {fmt(zone.conservative.outer, 3)} / {fmt(zone.optimistic.outer, 3)} AU</li>
              <li className="text-cyan-200/80">{rel}</li>
            </ul>
          ) : <p className="mt-2 text-amber-300/80">Data unavailable: the zone cannot be calculated without orbit distance, stellar temperature and luminosity.</p>}
        </div>
        <div className="glass-tile rounded-xl border p-4 text-xs leading-relaxed text-slate-400">
          <h3 className="text-sm font-medium text-white">Equilibrium temperature: what it means</h3>
          <p className="mt-2 text-cyan-200/80">{tempInfo.summary}</p>
          <p className="mt-1">{tempInfo.explanation}</p>
        </div>
        <div className="glass-tile rounded-xl border p-4 text-xs leading-relaxed text-slate-400">
          <h3 className="text-sm font-medium text-white">Planet mass</h3>
          <p className="mt-2 text-lg text-white">{mass.available ? `${fmt(mass.value)} M⊕` : 'Data unavailable'}</p>
          {mass.density && <p>Estimated density: {fmt(mass.density.value)} g/cm³ ({fmt(mass.density.relativeToEarth)}× Earth, derived)</p>}
          <p className="mt-1">{mass.explanation}</p>
        </div>
        <div className="glass-tile rounded-xl border p-4 text-xs leading-relaxed text-slate-400">
          <h3 className="text-sm font-medium text-white">Host star</h3>
          <ul className="mt-2 space-y-1">
            <li>Type: <b className="text-white">{star.classification.available === false ? 'Data unavailable' : star.classification.label}</b></li>
            <li>Temperature: {star.temperature != null ? `${fmt(star.temperature, 0)} K` : 'Data unavailable'}</li>
            <li>Luminosity: {star.luminosity ? `${fmt(star.luminosity.value, 4)} L☉${star.luminosity.source === 'derived' ? ' (calculated)' : ''}` : 'Data unavailable'}</li>
            <li>Activity: Data unavailable</li>
          </ul>
          <p className="mt-1">{star.activity.note}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">Data availability: {avail.measured} measured, {avail.derived} derived, {avail.unavailable} unavailable of {avail.items.length} key inputs.</p>

      <details className="mt-4 rounded-xl border border-white/5 p-4 text-xs text-slate-400">
        <summary className="cursor-pointer text-sm text-slate-300">How the score is calculated</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Maximum {WEIGHTS.temperature + WEIGHTS.habitableZone + WEIGHTS.planetSize + WEIGHTS.dataCompleteness} points: temperature {WEIGHTS.temperature}, habitable zone {WEIGHTS.habitableZone}, planet size {WEIGHTS.planetSize}, data completeness {WEIGHTS.dataCompleteness}.</li>
          <li>Temperature: full points for equilibrium temperature of {TEMPERATURE_BANDS.idealMin}-{TEMPERATURE_BANDS.idealMax} K, falling linearly to 0 at {TEMPERATURE_BANDS.zeroLow} K and {TEMPERATURE_BANDS.zeroHigh} K.</li>
          <li>Habitable zone: Kopparapu et al. (2013) boundaries from the star's temperature and luminosity. Full points in the conservative zone (moist greenhouse to maximum greenhouse), 65% in the optimistic zone (recent Venus to early Mars), 0 outside. Valid for 2600-7200 K stars.</li>
          <li>Size: {SIZE_BANDS.map((b) => `${b.label} ${b.score}`).join(', ')} (of 20). Radius alone does not determine composition.</li>
          <li>Completeness: 3 points per reported item (radius, mass, equilibrium temperature, orbital distance, stellar temperature and luminosity).</li>
          <li>Unknown indicators score 0 and are listed. With fewer than 2 of the 3 scientific indicators known, no overall score is given. Any unknown indicator caps the category at "Moderate".</li>
          <li>Categories: {CATEGORY_THRESHOLDS.higher}+ higher, {CATEGORY_THRESHOLDS.moderate}-{CATEGORY_THRESHOLDS.higher - 1} moderate, below {CATEGORY_THRESHOLDS.moderate} lower.</li>
        </ul>
      </details>

      <div className="mt-4"><ScientificDisclaimer /></div>
    </Section>
  )
}
