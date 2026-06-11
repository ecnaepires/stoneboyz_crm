import { describe, expect, it } from 'vitest';
import { measurementTotalsFromLayout } from './quote-measurements-from-layout.js';
import type { CanvasChainShapeLayout, CanvasLayout } from './quote-drawing.types.js';

// Characterization (golden) tests. These pin the CURRENT measurement outputs
// for rectangle / L / U pieces so the polygon migration (issue #5) cannot drift
// square footage or counts unnoticed. The one intentional change the migration
// makes — finished-edge linear footage on multi-segment L/U pieces becoming
// exact instead of bounding-box — will surface here as a reviewed snapshot diff.

const SCALE = 3; // px per inch, matching the canvas default

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
  return {
    type: 'chain',
    segments: [
      { x: 0, y: 0, w: halfLen * SCALE, h: widthIn * SCALE, lengthIn: halfLen, widthIn, orientation: 'horizontal' },
      { x: halfLen * SCALE, y: 0, w: halfLen * SCALE, h: widthIn * SCALE, lengthIn: halfLen, widthIn, orientation: 'horizontal' }
    ]
  };
};

// L opening to the bottom-right: a 100x25 top run with a 25x50 leg dropping from
// the left end.
const lChain = (): CanvasChainShapeLayout => ({
  type: 'chain',
  segments: [
    { x: 0, y: 0, w: 100 * SCALE, h: 25 * SCALE, lengthIn: 100, widthIn: 25, orientation: 'horizontal' },
    { x: 0, y: 25 * SCALE, w: 25 * SCALE, h: 50 * SCALE, lengthIn: 25, widthIn: 50, orientation: 'vertical' }
  ]
});

// U opening upward: a 60x10 base joined by two 10x40 legs. Union area = 1200 sqin
// = 8.333 sqft. The base is listed first so the scale derives from a horizontal
// segment (chainShapeAreaSqIn reads scale = first.w / first.lengthIn).
const uChain = (): CanvasChainShapeLayout => ({
  type: 'chain',
  segments: [
    { x: 0, y: 30 * SCALE, w: 60 * SCALE, h: 10 * SCALE, lengthIn: 60, widthIn: 10, orientation: 'horizontal' },
    { x: 0, y: 0, w: 10 * SCALE, h: 40 * SCALE, lengthIn: 40, widthIn: 10, orientation: 'vertical' },
    { x: 50 * SCALE, y: 0, w: 10 * SCALE, h: 40 * SCALE, lengthIn: 40, widthIn: 10, orientation: 'vertical' }
  ]
});

const allSidesFinished = (pieceId: string): CanvasLayout['edges'] =>
  (['top', 'right', 'bottom', 'left'] as const).map((edge) => ({
    pieceId,
    edge,
    treatment: 'finished' as const,
    splashHeightIn: null,
    label: null
  }));

describe('measurement golden (current behavior, pinned for migration)', () => {
  it('rectangle 100x25, all edges finished', () => {
    const layout = emptyLayout();
    layout.pieces = [{ pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: rectChain(100, 25) }];
    layout.edges = allSidesFinished('p1');
    expect(measurementTotalsFromLayout(layout)).toMatchInlineSnapshot(`
      {
        "backsplashSqFt": 0,
        "combinedSqFt": 17.361,
        "countertopSqFt": 17.361,
        "faucetHoleCount": 0,
        "finishedEdgeLinFt": 20.832,
        "pieceCount": 1,
        "sinkCutoutCount": 0,
        "splashSqFt": 0,
      }
    `);
  });

  it('L shape, all edges finished', () => {
    const layout = emptyLayout();
    layout.pieces = [{ pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: lChain() }];
    layout.edges = allSidesFinished('p1');
    expect(measurementTotalsFromLayout(layout)).toMatchInlineSnapshot(`
      {
        "backsplashSqFt": 0,
        "combinedSqFt": 26.042,
        "countertopSqFt": 26.042,
        "faucetHoleCount": 0,
        "finishedEdgeLinFt": 29.166,
        "pieceCount": 1,
        "sinkCutoutCount": 0,
        "splashSqFt": 0,
      }
    `);
  });

  it('U shape, all edges finished', () => {
    const layout = emptyLayout();
    layout.pieces = [{ pieceId: 'p1', x: 0, y: 0, rotation: 0, shape: uChain() }];
    layout.edges = allSidesFinished('p1');
    expect(measurementTotalsFromLayout(layout)).toMatchInlineSnapshot(`
      {
        "backsplashSqFt": 0,
        "combinedSqFt": 8.333,
        "countertopSqFt": 8.333,
        "faucetHoleCount": 0,
        "finishedEdgeLinFt": 16.666,
        "pieceCount": 1,
        "sinkCutoutCount": 0,
        "splashSqFt": 0,
      }
    `);
  });
});
