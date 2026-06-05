import { describe, expect, it } from 'vitest';
import { dragToNormalizedCircle, pointToNormalizedCircle } from './damage-mark-geometry';

describe('damage mark geometry', () => {
  it('normalizes a clicked photo point into a circle shape', () => {
    expect(
      pointToNormalizedCircle(
        { x: 150, y: 90 },
        { left: 50, top: 40, width: 200, height: 100 }
      )
    ).toEqual({
      kind: 'circle',
      x: 0.5,
      y: 0.5,
      radius: 0.08,
    });
  });

  it('uses drag distance as normalized radius', () => {
    expect(
      dragToNormalizedCircle(
        { x: 150, y: 90 },
        { x: 190, y: 90 },
        { left: 50, top: 40, width: 200, height: 100 }
      )
    ).toEqual({
      kind: 'circle',
      x: 0.5,
      y: 0.5,
      radius: 0.2,
    });
  });

  it('keeps shapes inside the normalized photo area', () => {
    expect(
      pointToNormalizedCircle(
        { x: -10, y: 500 },
        { left: 50, top: 40, width: 200, height: 100 },
        2
      )
    ).toEqual({
      kind: 'circle',
      x: 0,
      y: 1,
      radius: 0.5,
    });
  });
});
