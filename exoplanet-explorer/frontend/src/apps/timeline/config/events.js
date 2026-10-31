
export const EVENTS = [
  { id: 'pulsar-planets', year: 'minYear', label: 'First planets found around a pulsar', short: 'Pulsar planets', source: 'https://science.nasa.gov/universe/exoplanets/nobel-winners-changed-our-understanding-with-exoplanet-discovery/' },
  { id: '51-pegasi-b', year: 1995, label: '51 Pegasi b: first planet confirmed around a Sun-like star', short: '51 Pegasi b', source: 'https://science.nasa.gov/universe/exoplanets/nobel-winners-changed-our-understanding-with-exoplanet-discovery/' },
  { id: 'hd-209458-b', year: 1999, label: 'HD 209458 b is observed transiting its star for the first time', short: 'First observed transit', source: 'https://science.nasa.gov/asset/hubble/extrasolar-planet-transit-from-1999/' },
  { id: 'kepler-launch', year: 2009, label: 'NASA’s Kepler space telescope launches', short: 'Kepler launch', source: 'https://www.jpl.nasa.gov/news/nasas-kepler-mission-rockets-to-space-in-search-of-other-earths/' },
  { id: 'kepler-715', year: 2014, label: 'Kepler team announces 715 newly verified planets', short: '715 verified', source: 'https://www.nasa.gov/news-release/nasas-kepler-mission-announces-a-planet-bonanza-715-new-worlds/' },
  { id: 'kepler-1284', year: 2016, label: 'Kepler team announces 1,284 newly verified planets', short: '1,284 verified', source: 'https://www.nasa.gov/news-release/nasas-kepler-mission-announces-largest-collection-of-planets-ever-discovered/' },
  { id: 'tess-launch', year: 2018, label: 'TESS launches to survey nearly the whole sky', short: 'TESS launch', source: 'https://heasarc.gsfc.nasa.gov/docs/tess/what-is-tess.html' },
];

export function eventsInRange(minYear, maxYear) {
  return EVENTS.map(event => ({ ...event, year: event.year === 'minYear' ? minYear : event.year }))
    .filter(event => Number.isFinite(event.year) && event.year >= minYear && event.year <= maxYear);
}
