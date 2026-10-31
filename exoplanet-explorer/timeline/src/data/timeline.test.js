import { describe, it, expect } from 'vitest';
import { cumulativeByYear, perYearByMethod, medianByYear, planetsBornBy, toCartesian, lightYears } from './timeline';
const fixture = [
  { disc_year: 2000, pl_rade: 2, pl_orbper: 10, methodGroup: 'Transit' },
  { disc_year: 2000, pl_rade: 4, pl_orbper: 20, methodGroup: 'Imaging' },
  { disc_year: 2002, pl_rade: 6, pl_orbper: null, methodGroup: 'Transit' },
  { disc_year: null, pl_rade: 99, pl_orbper: 5, methodGroup: 'Other' },
];
describe('timeline data functions', () => {
  it('builds cumulative counts across the actual year range', () => expect(cumulativeByYear(fixture)).toEqual([{year:2000,count:2},{year:2001,count:2},{year:2002,count:3}]));
  it('counts methods per year', () => expect(perYearByMethod(fixture)[0]).toEqual({year:2000,Transit:1,Imaging:1}));
  it('keeps the annual method histogram in agreement with cumulative increments', () => {
    const cumulative = cumulativeByYear(fixture), annual = perYearByMethod(fixture);
    cumulative.forEach((row, index) => expect(row.count - (cumulative[index - 1]?.count || 0)).toBe(Object.entries(annual[index]).filter(([key]) => key !== 'year').reduce((sum, [, count]) => sum + count, 0)));
  });
  it('computes annual medians', () => expect(medianByYear(fixture, 'pl_rade')).toEqual([{year:2000,value:3,count:2},{year:2002,value:6,count:1}]));
  it('selects planets born in a year', () => expect(planetsBornBy(fixture, 2002)).toHaveLength(1));
  it('converts equatorial coordinates and parsecs', () => { expect(toCartesian(0,0,2)[0]).toBeCloseTo(2); expect(toCartesian(90,0,2)[1]).toBeCloseTo(2); expect(lightYears(1)).toBeCloseTo(3.26156); });
});
