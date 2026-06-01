import { describe, expect, it } from 'vitest';
import { canvasLayoutSchema } from './quote-drawing.schemas.js';

describe('canvasLayoutSchema', () => {
  it('preserves an L-shaped layout on a single counter piece', () => {
    const parsed = canvasLayoutSchema.parse({
      pieces: [
        {
          pieceId: '11111111-1111-4111-8111-111111111111',
          x: 32,
          y: 48,
          rotation: 0,
          shape: {
            type: 'l',
            legX: 300,
            legY: 76.5,
            legWidthIn: 25.5,
            legLengthIn: 42
          }
        }
      ],
      sinks: [],
      corners: [],
      edges: []
    });

    expect(parsed.pieces).toHaveLength(1);
    expect(parsed.pieces[0]?.shape).toEqual({
      type: 'l',
      legX: 300,
      legY: 76.5,
      legWidthIn: 25.5,
      legLengthIn: 42
    });
  });

  it('preserves a Z-shaped layout on a single counter piece', () => {
    const parsed = canvasLayoutSchema.parse({
      pieces: [
        {
          pieceId: '22222222-2222-4222-8222-222222222222',
          x: 32,
          y: 48,
          rotation: 0,
          shape: {
            type: 'z',
            legX: 300,
            legY: 76.5,
            legWidthIn: 25.5,
            legLengthIn: 42,
            tailX: 150,
            tailY: 126,
            tailLengthIn: 50,
            tailWidthIn: 25.5
          }
        }
      ],
      sinks: [],
      corners: [],
      edges: []
    });

    expect(parsed.pieces).toHaveLength(1);
    expect(parsed.pieces[0]?.shape).toEqual({
      type: 'z',
      legX: 300,
      legY: 76.5,
      legWidthIn: 25.5,
      legLengthIn: 42,
      tailX: 150,
      tailY: 126,
      tailLengthIn: 50,
      tailWidthIn: 25.5
    });
  });

  it('preserves a chained multi-turn layout on a single counter piece', () => {
    const parsed = canvasLayoutSchema.parse({
      pieces: [
        {
          pieceId: '33333333-3333-4333-8333-333333333333',
          x: 32,
          y: 48,
          rotation: 0,
          shape: {
            type: 'chain',
            segments: [
              { x: 0, y: 0, w: 240, h: 76.5, lengthIn: 80, widthIn: 25.5, orientation: 'horizontal' },
              { x: 163.5, y: 76.5, w: 76.5, h: 124.5, lengthIn: 25.5, widthIn: 41.5, orientation: 'vertical' },
              { x: 240, y: 124.5, w: 186, h: 76.5, lengthIn: 62, widthIn: 25.5, orientation: 'horizontal' },
              { x: 349.5, y: 201, w: 76.5, h: 120, lengthIn: 25.5, widthIn: 40, orientation: 'vertical' },
              { x: 426, y: 244.5, w: 135, h: 76.5, lengthIn: 45, widthIn: 25.5, orientation: 'horizontal' }
            ]
          }
        }
      ],
      sinks: [],
      corners: [],
      edges: []
    });

    expect(parsed.pieces).toHaveLength(1);
    expect(parsed.pieces[0]?.shape?.type).toBe('chain');
    expect(parsed.pieces[0]?.shape).toMatchObject({
      type: 'chain',
      segments: expect.arrayContaining([
        expect.objectContaining({ orientation: 'horizontal', lengthIn: 80 }),
        expect.objectContaining({ orientation: 'vertical', widthIn: 41.5 })
      ])
    });
  });

  it('preserves reference and deleted lines for drawing edge workflows', () => {
    const pieceId = '44444444-4444-4444-8444-444444444444';
    const parsed = canvasLayoutSchema.parse({
      pieces: [
        {
          pieceId,
          x: 32,
          y: 48,
          rotation: 0,
          shape: null
        }
      ],
      sinks: [],
      corners: [],
      edges: [
        {
          pieceId,
          edge: 'top',
          treatment: 'finished',
          splashHeightIn: null,
          label: null,
          color: '#ef4444'
        }
      ],
      referenceLines: [
        {
          id: 'cabinet-line-1',
          pieceId,
          from: [0, 0],
          to: [120, 0],
          kind: 'cabinet',
          color: '#6b7280',
          dash: true
        },
        {
          id: 'centerline-1',
          pieceId,
          from: [60, 0],
          to: [60, 25.5],
          kind: 'centerline',
          color: '#000000',
          dash: true
        }
      ],
      deletedLines: [
        {
          id: 'deleted-line-1',
          pieceId,
          from: [120, 0],
          to: [120, 76.5]
        }
      ]
    });

    expect(parsed.edges).toEqual([
      {
        pieceId,
        edge: 'top',
        treatment: 'finished',
        splashHeightIn: null,
        label: null,
        color: '#ef4444'
      }
    ]);
    expect(parsed.referenceLines).toEqual([
      {
        id: 'cabinet-line-1',
        pieceId,
        from: [0, 0],
        to: [120, 0],
        kind: 'cabinet',
        color: '#6b7280',
        dash: true
      },
      {
        id: 'centerline-1',
        pieceId,
        from: [60, 0],
        to: [60, 25.5],
        kind: 'centerline',
        color: '#000000',
        dash: true
      }
    ]);
    expect(parsed.deletedLines).toEqual([
      {
        id: 'deleted-line-1',
        pieceId,
        from: [120, 0],
        to: [120, 76.5]
      }
    ]);
  });
});
