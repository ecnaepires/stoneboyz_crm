import { describe, expect, it } from 'vitest';
import {
  calculateCountertopSqFt,
  calculateLinearFeet,
  calculateMeasurementAreaTotals,
  calculateMeasurementTotals,
  calculateSplashSqFt,
  roundInches
} from './quote-measurements.js';
import type { QuoteMeasurementAreaInput } from './quote-measurements.types.js';

describe('quote measurement calculators', () => {
  it('rounds inches to the nearest 1/16 inch', () => {
    expect(roundInches(25.53)).toBe(25.5);
    expect(roundInches(25.54)).toBe(25.5625);
    expect(roundInches(25.54, 'none')).toBe(25.54);
  });

  it('calculates countertop square footage from inches', () => {
    expect(calculateCountertopSqFt(100, 25.5)).toBe(17.708);
    expect(calculateCountertopSqFt(100, 25.5, 2)).toBe(35.417);
  });

  it('calculates linear feet and splash square footage', () => {
    expect(calculateLinearFeet(100)).toBe(8.333);
    expect(calculateSplashSqFt({ lengthIn: 100, treatment: 'unfinished', splashHeightIn: 4 })).toBe(2.778);
    expect(calculateSplashSqFt({ lengthIn: 100, treatment: 'unfinished' })).toBe(0);
  });

  it('summarizes a kitchen area with pieces, finished edges, splash, sink, and faucet holes', () => {
    const kitchen: QuoteMeasurementAreaInput = {
      name: 'Kitchen',
      pieces: [
        { name: 'Sink run', lengthIn: 100, widthIn: 25.5 },
        { name: 'Island', lengthIn: 72, widthIn: 36 }
      ],
      edges: [
        { lengthIn: 100, treatment: 'finished', splashHeightIn: 4 },
        { lengthIn: 72, treatment: 'finished' },
        { lengthIn: 100, treatment: 'unfinished' }
      ],
      sinks: [
        {
          model: '3018',
          sinkType: 'undermount',
          shape: 'rectangle',
          cutoutLengthIn: 29,
          cutoutWidthIn: 18,
          faucetHoleCount: 1,
          centerline: 'center'
        }
      ]
    };

    expect(calculateMeasurementAreaTotals(kitchen)).toEqual({
      pieceCount: 2,
      countertopSqFt: 35.708,
      finishedEdgeLinFt: 14.333,
      splashSqFt: 2.778,
      sinkCutoutCount: 1,
      faucetHoleCount: 1
    });
  });

  it('summarizes multiple areas', () => {
    const areas: QuoteMeasurementAreaInput[] = [
      {
        name: 'Kitchen',
        pieces: [{ lengthIn: 100, widthIn: 25.5 }],
        edges: [{ lengthIn: 100, treatment: 'finished', splashHeightIn: 4 }],
        sinks: [
          {
            sinkType: 'undermount',
            shape: 'rectangle',
            cutoutLengthIn: 29,
            cutoutWidthIn: 18,
            faucetHoleCount: 1
          }
        ]
      },
      {
        name: 'Laundry',
        pieces: [{ lengthIn: 48, widthIn: 25.5 }],
        edges: [{ lengthIn: 48, treatment: 'finished' }]
      }
    ];

    expect(calculateMeasurementTotals(areas)).toEqual({
      areaCount: 2,
      pieceCount: 2,
      countertopSqFt: 26.208,
      finishedEdgeLinFt: 12.333,
      splashSqFt: 2.778,
      sinkCutoutCount: 1,
      faucetHoleCount: 1
    });
  });

  it('rejects invalid dimensions', () => {
    expect(() => calculateCountertopSqFt(0, 25.5)).toThrow('lengthIn must be a positive number');
    expect(() => calculateLinearFeet(-1)).toThrow('lengthIn must be a positive number');
    expect(() => roundInches(-1)).toThrow('value must be a non-negative number');
  });
});
