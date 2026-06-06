import { describe, expect, it } from 'vitest';
import { chainToPolygon } from './converters.js';
import { chainShapeAreaSqIn } from './geometry.js';
import { polygonAreaSqIn } from './polygon.js';
import type { ChainShapeLayout } from './types.js';

const SCALE = 3;

const rectChain: ChainShapeLayout = {
  type: 'chain',
  segments: [
    { x: 0, y: 0, w: 50 * SCALE, h: 25 * SCALE, lengthIn: 50, widthIn: 25, orientation: 'horizontal' },
    { x: 50 * SCALE, y: 0, w: 50 * SCALE, h: 25 * SCALE, lengthIn: 50, widthIn: 25, orientation: 'horizontal' }
  ]
};

const lChain: ChainShapeLayout = {
  type: 'chain',
  segments: [
    { x: 0, y: 0, w: 100 * SCALE, h: 25 * SCALE, lengthIn: 100, widthIn: 25, orientation: 'horizontal' },
    { x: 0, y: 25 * SCALE, w: 25 * SCALE, h: 50 * SCALE, lengthIn: 25, widthIn: 50, orientation: 'vertical' }
  ]
};

const uChain: ChainShapeLayout = {
  type: 'chain',
  segments: [
    { x: 0, y: 30 * SCALE, w: 60 * SCALE, h: 10 * SCALE, lengthIn: 60, widthIn: 10, orientation: 'horizontal' },
    { x: 0, y: 0, w: 10 * SCALE, h: 40 * SCALE, lengthIn: 40, widthIn: 10, orientation: 'vertical' },
    { x: 50 * SCALE, y: 0, w: 10 * SCALE, h: 40 * SCALE, lengthIn: 40, widthIn: 10, orientation: 'vertical' }
  ]
};

describe('chainToPolygon', () => {
  it('preserves area for a rectangle', () => {
    expect(polygonAreaSqIn(chainToPolygon(rectChain))).toBeCloseTo(chainShapeAreaSqIn(rectChain), 3);
    expect(polygonAreaSqIn(chainToPolygon(rectChain))).toBe(2500);
  });

  it('preserves the union area for an L (not the bounding box)', () => {
    expect(polygonAreaSqIn(chainToPolygon(lChain))).toBeCloseTo(chainShapeAreaSqIn(lChain), 3);
    expect(polygonAreaSqIn(chainToPolygon(lChain))).toBe(3750);
  });

  it('preserves the union area for a U', () => {
    expect(polygonAreaSqIn(chainToPolygon(uChain))).toBeCloseTo(chainShapeAreaSqIn(uChain), 3);
    expect(polygonAreaSqIn(chainToPolygon(uChain))).toBe(1200);
  });

  it('returns an empty polygon for a degenerate chain', () => {
    expect(chainToPolygon({ type: 'chain', segments: [] })).toEqual({ vertices: [] });
  });
});
