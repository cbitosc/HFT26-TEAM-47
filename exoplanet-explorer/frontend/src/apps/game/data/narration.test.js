import { describe, expect, it } from 'vitest';
import narration from '../../../../public/apps/game/narration.json';

describe('cached live callouts',()=>{
  it('covers all eight demo planets at each requested threshold in 20 words or fewer',()=>{
    expect(Object.keys(narration)).toHaveLength(8);
    for(const [planet,tiers] of Object.entries(narration)){
      expect(Object.keys(tiers).sort(),planet).toEqual(['25','50','75']);
      for(const [tier,line] of Object.entries(tiers)){
        expect(line.trim().split(/\s+/).length,`${planet} at ${tier}% words`).toBeLessThanOrEqual(20);
        expect((line.match(/[.!?](?:\s|$)/g)||[]).length,`${planet} at ${tier}% sentences`).toBe(1);
      }
    }
  });
});
