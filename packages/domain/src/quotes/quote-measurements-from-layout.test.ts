import { describe, expect, it } from 'vitest';
import { measurementTotalsFromLayout, netFinishedAreaSqInFromLayout } from './quote-measurements-from-layout.js';
import type { CanvasLayout, CanvasChainShapeLayout } from './quote-drawing.types.js';

const emptyLayout = (): CanvasLayout => ({
  pieces: [],
  sinks: [],
  corners: [],
  edges: [],
  paintedEdges: [],
  referenceLines: [],
  deletedLines: []
});

const rectChain = (lengthIn: number, widthIn: number): CanvasChainShapeLayout => {
  const halfLen = lengthIn / 2;
  const scale = 3;
  return {
    type: 'chain',
    segments: [
      { x: 0, y: 0, w: halfLen * scale, h: widthIn * scale, lengthIn: halfLen, widthIn: widthIn, orientation: 'horizontal' },
      { x: halfLen * scale, y: 0, w: halfLen * scale, h: widthIn * scale, lengthIn: halfLen, widthIn: widthIn, orientation: 'horizontal' }
    ]
  };
};

describe('measurementTotalsFromLayout', () => {
  it('derives countertop square footage from a single rectangular piece', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: rectChain(36, 25) }
    ];

    expect(measurementTotalsFromLayout(layout).countertopSqFt).toBe(6.25);
  });

  it('subtracts radius corners from net finished area without changing billable square footage', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'p1', x: 0, y: 0, rotation: 0, kind: 'countertop', shape: rectChain(100, 25) }
    ];
    layout.corners = [
      { pieceId: 'p1', corner: 'topRight', treatment: 'radius', valueIn: 4 }
    ];

    expect(netFinishedAreaSqInFromLayout(layout)).toBe(2496.566);
    expect(measurementTotalsFromLayout(layout).countertopSqFt).toBe(17.361);
  });

  it('splits backsplash pieces out of countertop square footage', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'c1', x: 0, y: 0, rotation: 0, kind: 'countertop', shape: rectChain(121, 35.5) },
      { pieceId: 'b1', x: 0, y: 0, rotation: 0, kind: 'backsplash', shape: rectChain(121, 4) }
    ];

    const totals = measurementTotalsFromLayout(layout);

    expect(totals.countertopSqFt).toBe(29.83);
    expect(totals.backsplashSqFt).toBe(3.361);
    expect(totals.combinedSqFt).toBe(33.191);
  });

  it('counts every drawn piece, countertop and backsplash alike', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'c1', x: 0, y: 0, rotation: 0, kind: 'countertop', shape: rectChain(100, 25) },
      { pieceId: 'c2', x: 0, y: 0, rotation: 0, kind: 'countertop', shape: rectChain(72, 36) },
      { pieceId: 'b1', x: 0, y: 0, rotation: 0, kind: 'backsplash', shape: rectChain(100, 4) }
    ];

    expect(measurementTotalsFromLayout(layout).pieceCount).toBe(3);
  });

  it('measures finished edge length from the referenced piece side', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: rectChain(100, 25) }
    ];
    layout.edges = [
      { pieceId: 'p1', edge: 'top', treatment: 'finished', splashHeightIn: null, label: null },
      { pieceId: 'p1', edge: 'left', treatment: 'unfinished', splashHeightIn: null, label: null }
    ];

    expect(measurementTotalsFromLayout(layout).finishedEdgeLinFt).toBe(8.333);
  });

  it('counts every non-wall edge treatment as finished edge', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: rectChain(120, 120) }
    ];
    layout.edges = [
      { pieceId: 'p1', edge: 'top', treatment: 'appliance', splashHeightIn: null, label: null },
      { pieceId: 'p1', edge: 'bottom', treatment: 'mitered', splashHeightIn: null, label: null },
      { pieceId: 'p1', edge: 'left', treatment: 'waterfall', splashHeightIn: null, label: null },
      { pieceId: 'p1', edge: 'right', treatment: 'additionalFinished', splashHeightIn: null, label: null }
    ];

    // four 120in sides, all finished -> 480in / 12 = 40 lin ft
    expect(measurementTotalsFromLayout(layout).finishedEdgeLinFt).toBe(40);
  });

  it('excludes wall (unfinished) edges from finished edge', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: rectChain(100, 25) }
    ];
    layout.edges = [
      { pieceId: 'p1', edge: 'top', treatment: 'unfinished', splashHeightIn: null, label: null }
    ];

    expect(measurementTotalsFromLayout(layout).finishedEdgeLinFt).toBe(0);
  });

  it('measures splash square footage and adds its non-wall outline to finished edge', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: rectChain(100, 25) }
    ];
    layout.edges = [
      { pieceId: 'p1', edge: 'top', treatment: 'splash', splashHeightIn: 4, label: null }
    ];

    const totals = measurementTotalsFromLayout(layout);

    // splash sf = 100 * 4 / 144
    expect(totals.splashSqFt).toBe(2.778);
    // finished outline = top run (100) + two sides (2 * 4) = 108in / 12 = 9 lin ft
    expect(totals.finishedEdgeLinFt).toBe(9);
  });

  it('derives countertop square footage from a multi-segment L piece', () => {
    const layout = emptyLayout();
    layout.pieces = [
      {
        pieceId: 'p1', x: 0, y: 0, rotation: 0, kind: 'countertop',
        shape: { type: 'chain', segments: [
          { x: 0, y: 0, w: 300, h: 75, lengthIn: 100, widthIn: 25, orientation: 'horizontal' },
          { x: 0, y: 75, w: 75, h: 150, lengthIn: 25, widthIn: 50, orientation: 'vertical' }
        ] }
      }
    ];
    // union = 100*25 + 25*50 = 3750 sq in / 144 = 26.042 sq ft
    expect(measurementTotalsFromLayout(layout).countertopSqFt).toBe(26.042);
  });

  it('derives countertop square footage from a polygon piece', () => {
    const layout = emptyLayout();
    layout.pieces = [
      {
        pieceId: 'p1', x: 0, y: 0, rotation: 0, kind: 'countertop',
        // L outline: legs only = 100*25 + 25*50 = 3750 sqin / 144 = 26.042 sqft
        shape: {
          type: 'polygon',
          vertices: [
            { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 25 },
            { x: 25, y: 25 }, { x: 25, y: 75 }, { x: 0, y: 75 }
          ]
        }
      }
    ];

    expect(measurementTotalsFromLayout(layout).countertopSqFt).toBe(26.042);
  });

  it('counts sinks and faucet holes weighted by quantity', () => {
    const layout = emptyLayout();
    layout.sinks = [
      { sinkId: 's1', pieceId: null, x: 0, y: 0, rotation: 0, quantity: 1, faucetHoleCount: 3 },
      { sinkId: 's2', pieceId: null, x: 0, y: 0, rotation: 0, quantity: 2, faucetHoleCount: 1 }
    ];

    const totals = measurementTotalsFromLayout(layout);

    expect(totals.sinkCutoutCount).toBe(3);
    expect(totals.faucetHoleCount).toBe(5);
  });

  it('summarizes a full kitchen sheet end to end', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'counter', x: 0, y: 0, rotation: 0, kind: 'countertop', shape: rectChain(100, 25.5) },
      { pieceId: 'island', x: 0, y: 0, rotation: 0, kind: 'countertop', shape: rectChain(72, 36) },
      { pieceId: 'bs', x: 0, y: 0, rotation: 0, kind: 'backsplash', shape: rectChain(100, 4) }
    ];
    layout.edges = [
      { pieceId: 'counter', edge: 'top', treatment: 'splash', splashHeightIn: 4, label: null },
      { pieceId: 'island', edge: 'top', treatment: 'finished', splashHeightIn: null, label: null }
    ];
    layout.sinks = [
      { sinkId: 's1', pieceId: 'counter', x: 0, y: 0, rotation: 0, quantity: 1, faucetHoleCount: 1 }
    ];

    expect(measurementTotalsFromLayout(layout)).toEqual({
      pieceCount: 3,
      countertopSqFt: 35.708,
      backsplashSqFt: 2.778,
      combinedSqFt: 38.486,
      // counter splash outline 100 + 2*4 = 108in, island finished 72in -> 180in / 12 = 15
      finishedEdgeLinFt: 15,
      splashSqFt: 2.778,
      sinkCutoutCount: 1,
      faucetHoleCount: 1
    });
  });
});
