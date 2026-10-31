
import { X } from 'lucide-react';

const notes = [
  'The player represents an unprotected human with no spacesuit. Health points and hazard damage are game-only units, not human physiology.',
  'Rocky worlds receive the assumed +33 K Earth-like greenhouse adjustment to equilibrium temperature.',
  'Missing mass is estimated from radius: M=R³·⁷ below 1.5 R⊕, otherwise M=2.7×R¹·³. A missing value is marked ESTIMATED.',
  'M-dwarf systems multiply stellar flux by 3 for flare exposure; a tuned +1.15 HP/s gameplay penalty is also applied.',
  'Hazard weights are tuned gameplay constants: thermal ×12, radiation ×10.5, gravity ×13, no-solid-ground ×60 HP/s.',
  'Temperature thresholds are 273–310 K; the gravity comfort band is 0.4–1.6 g. A 70 kg reference person is used in the weight readout.',
  'Missing equilibrium temperature defaults to 255 K; missing stellar flux defaults to 1× Earth. Missing star radius or orbit uses 0.53°.',
  'A radius above 2.5 Earth radii is treated as a giant with no solid ground. Surface type is inferred from radius and equilibrium temperature.',
  'Day length is orbital period ×24/365 hours unless assumed tidally locked (period under 50 days around a star below 3900 K).',
  'Tidally locked worlds use a fixed substellar direction along the game world axis. The player starts at day coordinate +0.6; 400 m of travel changes that coordinate by 1. Local day temperature is sim.T+60 K, twilight is sim.T−20 K, and night is max(sim.T−140 K, 40 K). These are gameplay assumptions, not measured surface temperatures.',
  'The twilight band also uses a thermal-inertia gameplay factor (minimum 0.01, rising with distance from the terminator) so moving toward it can reduce thermal damage even when the modeled local temperature crosses a threshold.',
  'Terminator mechanic is a scaled game abstraction.',
  'Large procedural rock clusters are fictional gameplay locations. Within 6 m, shelter scales modeled thermal severity by 0.75 and radiation exposure (including the flare component) by 0.4.',
  'Shelter bonus is a game mechanic, not NASA data.',
  'Movement uses modeled surface gravity: walk speed is 4/sqrt(max(g,0.3)) m/s, sprint is ×1.6, and jumps start at 4.5 m/s. These are controller settings, not astronaut suit or traction measurements.',
  'NASA has no atmosphere data for most exoplanets. Atmospheric composition, pressure, magnetic field, and actual surface conditions remain unknown.',
  'Displayed stellar angular size is enlarged by a clamped visual factor for visibility; its estimated/catalog value is shown separately.',
  'Cached demo planet values are approximate hackathon placeholders. Live catalog fields are from NASA Exoplanet Archive pscomppars.',
];

export default function AssumptionsModal({ open, onClose, planets = [], source = 'CACHED', planet }) {
  if (!open) return null;
  const estimated = planets.filter(p => p.pl_bmasse == null).map(p => p.pl_name);
  return <div className="assumptions-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="assumptions-modal" role="dialog" aria-modal="true" aria-labelledby="assumptions-title">
      <button className="assumptions-close" onClick={onClose} aria-label="Close assumptions"><X size={17}/></button>
      <small>DATA PROVENANCE · {source}</small><h2 id="assumptions-title">Assumptions & limits</h2>
      <p className="assumptions-planet">CURRENT PLANET · {planet?.pl_name || 'none selected'}</p>
      <ul>{notes.map((note,i)=><li key={i}>{note}</li>)}</ul>
      <h3>Estimated mass in loaded catalog</h3><p>{estimated.length ? estimated.join(', ') : 'No current null-mass rows'} · Marked ESTIMATED in each planet readout.</p>
      <div className="assumptions-foot">Hazard HP/s weights are selected to make the demo playable. This is not a scientific habitability or survival prediction.</div>
    </section>
  </div>;
}
