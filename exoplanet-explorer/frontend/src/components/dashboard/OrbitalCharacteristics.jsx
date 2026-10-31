import Property from './Property.jsx'
import CompareBar from './CompareBar.jsx'
import Section from './Section.jsx'
import { fmt, withUnit } from '../../format.js'

export default function OrbitalCharacteristics({ planet: p }) {
  return (
    <Section id="orbit" accent="violet" title="Orbital characteristics" subtitle="How the planet moves around its star">
      <dl className="grid gap-3 @md:grid-cols-2">
        <Property label="Orbital period" field="pl_orbper" value={withUnit(p.orbital_period_days, 'days')}
          sub={p.orbital_period_days != null ? 'Earth: 365.25 days' : null}>
          <CompareBar value={p.orbital_period_days} reference={365.25} referenceLabel="Earth year" range={[0.001, 1000]} />
        </Property>
        <Property label="Semi-major axis" field="pl_orbsmax" derived={p.derived_fields?.includes('semi_major_axis_au')} value={withUnit(p.semi_major_axis_au, 'AU', 4)}
          sub={p.semi_major_axis_au != null ? 'Earth: 1 AU' : null}>
          <CompareBar value={p.semi_major_axis_au} referenceLabel="Earth's orbit" range={[0.01, 100]} />
        </Property>
        <Property label="Eccentricity" field="pl_orbeccen" value={p.eccentricity != null ? fmt(p.eccentricity, 3) : null}
          sub="0 = circular orbit" />
        <Property label="Stellar flux received" field="pl_insol" derived={p.derived_fields?.includes('insolation_earth')} value={p.insolation_earth != null ? `${fmt(p.insolation_earth, 3)} × Earth` : null}
          sub="Incident flux, Earth = 1" />
      </dl>
      <p className="mt-3 text-xs text-slate-400">
        The 3D view above is an illustrative, not-to-scale animation: orbits are drawn circular and speeds are normalised,
        so it is not a precise astronomical simulation. Use the values here for the real measurements.
      </p>
    </Section>
  )
}
