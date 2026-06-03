import { describe, expect, it } from 'vitest';
import { measurementTotalsFromLayout } from './quote-measurements-from-layout.js';
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

const rectChain = (lengthIn: number, widthIn: number): CanvasChainShapeLayout => ({
  type: 'chain',
  segments: [
    { x: 0, y: 0, w: lengthIn, h: widthIn, lengthIn, widthIn, orientation: 'horizontal' }
  ]
});

describe('measurementTotalsFromLayout', () => {
  it('derives countertop square footage from a single rectangular piece', () => {
    const layout = emptyLayout();
    layout.pieces = [
      { pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: rectChain(36, 25) }
    ];

    expect(measurementTotalsFromLayout(layout).countertopSqFt).toBe(6.25);
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
