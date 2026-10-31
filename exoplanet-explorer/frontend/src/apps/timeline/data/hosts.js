import { hasNumber, lightYears, toCartesian } from './timeline.js';
import { facilityGroup, methodGroup } from './methods.js';

export function aggregateHosts(planets, { requireDistance = true } = {}) {
  const hosts = new Map();
  for (const planet of planets) {
    if (!hasNumber(planet.ra) || !hasNumber(planet.dec) || (requireDistance && !hasNumber(planet.sy_dist)) || (requireDistance && !planet.hostname)) continue;
    const hostKey = planet.hostname || planet.pl_name;
    if (!hostKey) continue;
    let host = hosts.get(hostKey);
    if (!host) {
      const distancePc = hasNumber(planet.sy_dist) ? +planet.sy_dist : null;
      const [x, y, z] = toCartesian(planet.ra, planet.dec, distancePc ?? 1);
      host = { hostname: planet.hostname || 'unknown', ra: +planet.ra, dec: +planet.dec, distancePc, distanceLy: distancePc == null ? null : lightYears(distancePc), position: [x, y, z], birthYear: +planet.disc_year, planets: [], methods: new Set(), facilities: new Set(), facilityYears: {}, syPnum: hasNumber(planet.sy_pnum) ? +planet.sy_pnum : 1 };
      hosts.set(hostKey, host);
    }
    host.birthYear = Math.min(host.birthYear, +planet.disc_year);
    host.planets.push(planet);
    host.methods.add(methodGroup(planet.discoverymethod));
    const facility = facilityGroup(planet.disc_facility);
    host.facilities.add(facility);
    host.facilityYears[facility] = Math.min(host.facilityYears[facility] ?? Infinity, +planet.disc_year);
    if (hasNumber(planet.sy_pnum)) host.syPnum = Math.max(host.syPnum, +planet.sy_pnum);
  }
  return [...hosts.values()].map(host => ({ ...host, methods: [...host.methods], facilities: [...host.facilities] }));
}
