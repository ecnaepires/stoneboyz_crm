import { describe, expect, it } from 'vitest';
import { quoteMeasurementAreaInputSchema } from './quote-measurements.schemas.js';

describe('quoteMeasurementAreaInputSchema', () => {
  it('accepts a kitchen measurement area and applies defaults', () => {
    const parsed = quoteMeasurementAreaInputSchema.parse({
      name: 'Kitchen',
      pieces: [{ name: 'Sink run', lengthIn: 100, widthIn: 25.5 }],
      edges: [{ lengthIn: 100, treatment: 'finished', splashHeightIn: 4 }],
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
    });

    expect(parsed.pieces[0]?.quantity).toBe(1);
    expect(parsed.sinks[0]?.quantity).toBe(1);
  });

  it('rejects an area without pieces', () => {
    const result = quoteMeasurementAreaInputSchema.safeParse({
      name: 'Kitchen',
      pieces: []
    });

    expect(result.success).toBe(false);
  });

  it('rejects faucet hole counts outside Moraware-supported range', () => {
    const result = quoteMeasurementAreaInputSchema.safeParse({
      name: 'Kitchen',
      pieces: [{ lengthIn: 100, widthIn: 25.5 }],
      sinks: [
        {
          sinkType: 'undermount',
          shape: 'rectangle',
          cutoutLengthIn: 29,
          cutoutWidthIn: 18,
          faucetHoleCount: 6
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
