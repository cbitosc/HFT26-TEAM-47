// Keep archive string normalization and group assignment in this one configuration.
export const METHOD_GROUPS = [
  { name: 'Transit', color: '#56B4E9', match: /transit(?!.*timing)/i },
  { name: 'Radial Velocity', color: '#E69F00', match: /radial velocity|stellar.*(?:wobble|rv)|doppler/i },
  { name: 'Imaging', color: '#009E73', match: /imaging|direct image/i },
  { name: 'Microlensing', color: '#CC79A7', match: /microlens/i },
  { name: 'Timing', color: '#D55E00', match: /pulsar|eclipse|timing variation|transit timing/i },
  { name: 'Other', color: '#A0A6AC', match: /.*/ },
];
export function methodGroup(method) { return METHOD_GROUPS.find(({ match }) => match.test(String(method || '')))?.name ?? 'Other'; }
export const FACILITY_GROUPS = [
  { name: 'Kepler', match: /kepler/i },
  { name: 'TESS', match: /tess/i },
  { name: 'K2', match: /\bk2\b/i },
  { name: 'Other', match: /.*/ },
];
export function facilityGroup(facility) {
  const value = String(facility || '');
  return FACILITY_GROUPS.find(({ name, match }) => name !== 'Other' && match.test(value))?.name ?? 'Other';
}
