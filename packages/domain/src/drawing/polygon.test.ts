import { describe, expect, it } from 'vitest';
import {
  polygonAreaSqIn,
  polygonSignedTwiceArea,
  polygonValidate,
  type Polygon
} from './polygon.js';

const poly = (...vertices: Array<[number, number]>): Polygon => ({
  vertices: vertices.map(([x, y]) => ({ x, y }))
});

describe('polygonAreaSqIn', () => {
  it('measures a rectangle', () => {
    expect(polygonAreaSqIn(poly([0, 0], [100, 0], [100, 25], [0, 25]))).toBe(2500);
  });

  it('measures a right triangle', () => {
    expect(polygonAreaSqIn(poly([0, 0], [10, 0], [0, 10]))).toBe(50);
  });

  it('measures a concave L outline as the union of its legs, not the bounding box', () => {
    // 100x25 top run with a 25x50 leg dropping from the left end.
    // legs = 100*25 + 25*50 = 2500 + 1250 = 3750 sqin (bbox would be 100*75 = 7500).
    const l = poly([0, 0], [100, 0], [100, 25], [25, 25], [25, 75], [0, 75]);
    expect(polygonAreaSqIn(l)).toBe(3750);
  });

  it('is independent of winding direction', () => {
    const cw = poly([0, 0], [0, 25], [100, 25], [100, 0]);
    const ccw = poly([0, 0], [100, 0], [100, 25], [0, 25]);
    expect(polygonAreaSqIn(cw)).toBe(polygonAreaSqIn(ccw));
  });

  it('returns 0 for fewer than three vertices', () => {
    expect(polygonAreaSqIn(poly([0, 0], [100, 0]))).toBe(0);
  });
});

describe('polygonValidate', () => {
  it('accepts a rectangle', () => {
    expect(polygonValidate(poly([0, 0], [100, 0], [100, 25], [0, 25]))).toEqual({ ok: true });
  });

  it('accepts a concave L', () => {
    const l = poly([0, 0], [100, 0], [100, 25], [25, 25], [25, 75], [0, 75]);
    expect(polygonValidate(l)).toEqual({ ok: true });
  });

  it('rejects fewer than three vertices', () => {
    expect(polygonValidate(poly([0, 0], [100, 0]))).toEqual({
      ok: false,
      error: 'too_few_vertices'
    });
  });

  it('rejects a zero-length edge (duplicate consecutive vertex)', () => {
    expect(polygonValidate(poly([0, 0], [100, 0], [100, 0], [0, 25]))).toEqual({
      ok: false,
      error: 'zero_length_edge'
    });
  });

  it('rejects an explicitly closed ring (last vertex duplicates first)', () => {
    expect(polygonValidate(poly([0, 0], [100, 0], [100, 25], [0, 0]))).toEqual({
      ok: false,
      error: 'zero_length_edge'
    });
  });

  it('rejects collinear zero-area vertices', () => {
    expect(polygonValidate(poly([0, 0], [50, 0], [100, 0]))).toEqual({
      ok: false,
      error: 'zero_area'
    });
  });

  it('rejects a self-intersecting bowtie', () => {
    expect(polygonValidate(poly([0, 0], [100, 100], [100, 0], [0, 100]))).toEqual({
      ok: false,
      error: 'self_intersecting'
    });
  });
});

describe('polygonSignedTwiceArea', () => {
  it('is negative for clockwise and positive for counterclockwise rings', () => {
    const ccw = poly([0, 0], [10, 0], [10, 10], [0, 10]);
    const cw = poly([0, 0], [0, 10], [10, 10], [10, 0]);
    expect(polygonSignedTwiceArea(ccw)).toBeGreaterThan(0);
    expect(polygonSignedTwiceArea(cw)).toBeLessThan(0);
  });
});
