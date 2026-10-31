export const hasNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
export const validYear = p => hasNumber(p.disc_year);
export const yearBounds = planets => {
  const years = planets.filter(validYear).map(p => Number(p.disc_year));
  return years.length ? [Math.min(...years), Math.max(...years)] : [null, null];
};
export function cumulativeByYear(planets) {
  const [min, max] = yearBounds(planets); if (min == null) return [];
  const counts = new Map(); planets.filter(validYear).forEach(p => counts.set(+p.disc_year, (counts.get(+p.disc_year) || 0) + 1));
  let total = 0; return Array.from({ length: max - min + 1 }, (_, i) => { const year = min + i; total += counts.get(year) || 0; return { year, count: total }; });
}
export function perYearByMethod(planets) {
  const [min, max] = yearBounds(planets); if (min == null) return [];
  const rows = new Map(); planets.filter(validYear).forEach(p => { const year = +p.disc_year; const row = rows.get(year) || { year }; row[p.methodGroup || 'Other'] = (row[p.methodGroup || 'Other'] || 0) + 1; rows.set(year, row); });
  return Array.from({ length: max - min + 1 }, (_, i) => rows.get(min + i) || { year: min + i });
}
export function medianByYear(planets, field) {
  const groups = new Map(); planets.filter(validYear).forEach(p => { if (!hasNumber(p[field])) return; const n = Number(p[field]); const y = +p.disc_year; groups.set(y, [...(groups.get(y) || []), n]); });
  return [...groups].sort(([a], [b]) => a - b).map(([year, values]) => { values.sort((a,b)=>a-b); const m = values.length >> 1; return { year, value: values.length % 2 ? values[m] : (values[m-1] + values[m]) / 2, count: values.length }; });
}
export function planetsBornBy(planets, year) { return planets.filter(p => validYear(p) && Number(p.disc_year) === Number(year)); }
export function toCartesian(ra, dec, dist_pc) { const r = Number(ra) * Math.PI / 180, d = Number(dec) * Math.PI / 180, s = Number(dist_pc); return [s * Math.cos(d) * Math.cos(r), s * Math.cos(d) * Math.sin(r), s * Math.sin(d)]; }
export function lightYears(dist_pc) { return Number(dist_pc) * 3.26156; }
