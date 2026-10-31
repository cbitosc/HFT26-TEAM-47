import { describe, expect, it } from 'vitest';
import { checkNumberClaims } from './PostMortem';

describe('post-mortem numeric claim checker',()=>{
  it('maps supplied values to source fields',()=>{
    const planet={pl_name:'HD 209458 b',pl_eqt:1450,pl_rade:15.5};
    const sim={totalDps:82.182,hazards:[{id:'thermal',dps:12,value:'1450 K'}],run:{elapsed:1.2,health:0}};
    const claims=checkNumberClaims('HD 209458 b has 1450 K temperature and 15.5 Earth radii.',planet,sim);
    expect(claims.every(c=>c.verified)).toBe(true);
    expect(claims.some(c=>c.source.startsWith('pl_eqt: 1450'))).toBe(true);
  });
  it('flags a number absent from both catalog and simulation JSON',()=>{
    const claims=checkNumberClaims('This world reaches 999 K.',{pl_eqt:1450},{totalDps:82});
    expect(claims.find(c=>c.raw==='999')).toMatchObject({verified:false,source:'Unverified claim: 999'});
  });
  it('verifies movement metrics included in the simulation context',()=>{
    const sim={runMetrics:{distanceWalked:180,timeSheltered:12.5,closestApproachToTerminator:20}};
    const claims=checkNumberClaims('You walked 180 m and sheltered 12.5 seconds, reaching 20 m from the terminator.',{},sim);
    expect(claims).toHaveLength(3);
    expect(claims.every(c=>c.verified)).toBe(true);
    expect(claims[0].source).toContain('distanceWalked');
  });
});
