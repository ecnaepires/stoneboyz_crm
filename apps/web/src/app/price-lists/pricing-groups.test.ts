import { describe, expect, it } from 'vitest';
import { GROUPS, getGroupBySegment, groupHref, resolvePricingRuleForGroup } from './pricing-groups';

describe('pricing group routes', () => {
  it('uses one page segment per pricing group', () => {
    expect(GROUPS.map((group) => [group.value, group.segment])).toEqual([
      ['material', 'materials'],
      ['fabrication', 'fabrication'],
      ['edge', 'edges'],
      ['sink', 'sinks'],
      ['faucet_hole', 'faucet-holes'],
      ['splash', 'splash'],
      ['admin', 'admin-items'],
    ]);
  });

  it('builds price-list group URLs', () => {
    expect(groupHref('price-list-1', 'edge')).toBe('/price-lists/price-list-1/edges');
  });

  it('finds groups by URL segment', () => {
    expect(getGroupBySegment('materials')?.value).toBe('material');
    expect(getGroupBySegment('bad')).toBeNull();
  });

  it('resolves default pricing rules outside the route config', () => {
    const edgeGroup = getGroupBySegment('edges');

    expect(edgeGroup && resolvePricingRuleForGroup(edgeGroup)).toEqual({
      chargeMethod: 'linear_foot',
      measurementBasis: 'finished_edge_linft',
    });
  });
});
