import Property from './Property.jsx'
import CompareBar from './CompareBar.jsx'
import Section from './Section.jsx'
import { fmt, withUnit } from '../../format.js'
import { parsecsToLightYears } from '../../utils/habitabilityCalculations.js'

export default function PlanetProperties({ planet: p }) {
  const ly = p.distance_light_years ?? parsecsToLightYears(p.distance_parsecs)
  return (
    <Section id="properties" title="Physical properties" subtitle="The planet itself, as reported by the NASA Exoplanet Archive">
      <dl className="grid gap-3 @md:grid-cols-2">
        <Property label="Radius" field="pl_rade" value={withUnit(p.radius_earth, 'Earth radii (R⊕)')}>
          <CompareBar value={p.radius_earth} />
        </Property>
        <Property label="Mass" field="pl_bmasse" value={withUnit(p.mass_earth, 'Earth masses (M⊕)')}>
          <CompareBar value={p.mass_earth} range={[0.1, 1000]} />
        </Property>
        <Property label="Equilibrium temperature" field="pl_eqt" derived={p.derived_fields?.includes('equilibrium_temperature_k')} value={withUnit(p.equilibrium_temperature_k, 'K', 0)}
          sub={p.equilibrium_temperature_k != null ? `${fmt(p.equilibrium_temperature_k - 273.15, 0)} °C · theoretical, not a surface temperature` : null} />
        <Property label="Orbital period" field="pl_orbper" value={withUnit(p.orbital_period_days, 'days')} />
        <Property label="Semi-major axis" field="pl_orbsmax" derived={p.derived_fields?.includes('semi_major_axis_au')} value={withUnit(p.semi_major_axis_au, 'AU', 4)} />
        <Property label="Distance from Earth" field="sy_dist" value={ly != null ? `${fmt(ly, 1)} light-years` : null}
          sub={p.distance_parsecs != null ? `${fmt(p.distance_parsecs, 2)} parsecs (1 pc = 3.26156 ly)` : null} />
      </dl>
    </Section>
  )
}
