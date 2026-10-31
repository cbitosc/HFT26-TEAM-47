import Property from './Property.jsx'
import Section from './Section.jsx'
import { fmt, withUnit } from '../../format.js'
import { stellarLuminosity } from '../../utils/habitabilityCalculations.js'
import StellarClassBadge from './StellarClassBadge.jsx'

export default function HostStarInformation({ planet: p }) {
  const lum = stellarLuminosity(p)
  return (
    <Section id="host-star" accent="amber" title="Host star" subtitle="Properties of the star, not the planet">
      <div className="mb-3"><StellarClassBadge star={p} /></div>
      <dl className="grid gap-3 @md:grid-cols-2">
        <Property label="Star name" value={p.host_star} field="hostname" />
        <Property label="Effective temperature" field="st_teff" value={withUnit(p.star_temperature_k, 'K', 0)} />
        <Property label="Spectral type" field="st_spectype" value={p.star_spectral_type} />
        <Property label="Metallicity" field="st_met" value={withUnit(p.star_metallicity_dex, 'dex [Fe/H]', 2)} />
        <Property label="Radius" field="st_rad" value={withUnit(p.star_radius_solar, 'solar radii (R☉)')} />
        <Property label="Mass" field="st_mass" value={withUnit(p.star_mass_solar, 'solar masses (M☉)')} />
        <Property label="Luminosity" field="st_lum" value={lum ? `${fmt(lum.value, lum.value < 0.01 ? 5 : 3)} solar luminosities (L☉)` : null}
          tag={lum?.source === 'derived' ? 'derived' : lum ? 'reported' : null}
          sub={lum?.source === 'derived' ? 'Calculated from radius and temperature (Stefan-Boltzmann); NASA does not report it here.' : null} />
      </dl>
    </Section>
  )
}
