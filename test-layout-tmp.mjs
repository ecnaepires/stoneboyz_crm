import { measurementTotalsFromLayout } from './packages/domain/src/quotes/quote-measurements-from-layout.ts';
import { chainShapeAreaSqIn } from './packages/domain/src/drawing/geometry.ts';
import { canvasLayoutSchema, saveDrawingRevisionSchema } from './packages/domain/src/quotes/quote-drawing.schemas.ts';

const PIECE_A = '00000000-0000-4000-8000-0000000000a1';
const PIECE_B = '00000000-0000-4000-8000-0000000000a2';
const SINK_A = '00000000-0000-4000-8000-0000000000b1';

const twoSegRect = (lengthIn, widthIn) => {
  const half = lengthIn / 2;
  const scale = 3;
  return {
    type: 'chain',
    segments: [
      { x: 0, y: 0, w: half * scale, h: widthIn * scale, lengthIn: half, widthIn, orientation: 'horizontal' },
      { x: half * scale, y: 0, w: half * scale, h: widthIn * scale, lengthIn: half, widthIn, orientation: 'horizontal' }
    ]
  };
};

const inputLayout = {
  pieces: [
    { pieceId: PIECE_A, x: 0, y: 0, rotation: 0, kind: 'countertop', shape: twoSegRect(100, 25.5) },
    { pieceId: PIECE_B, x: 0, y: 0, rotation: 0, kind: 'countertop', shape: twoSegRect(72, 36) }
  ],
  edges: [{ pieceId: PIECE_A, edge: 'top', treatment: 'finished' }],
  sinks: [{ sinkId: SINK_A, pieceId: PIECE_A, x: 0, y: 0, rotation: 0, quantity: 1, faucetHoleCount: 1 }]
};

// Simulate what the endpoint does: Zod parse
const bodyParsed = saveDrawingRevisionSchema.parse({ layout: inputLayout });
const zodLayout = bodyParsed.layout;
console.log('Zod-parsed layout pieces[0].shape:', JSON.stringify(zodLayout.pieces[0]?.shape, null, 2));
console.log('Zod-parsed sinks[0].faucetHoleCount:', zodLayout.sinks[0]?.faucetHoleCount);

// Simulate JSONB round-trip: stringify then parse
const jsonStr = JSON.stringify(zodLayout);
const dbLayout = JSON.parse(jsonStr);

const result = measurementTotalsFromLayout(dbLayout);
console.log('Result after DB round-trip:', JSON.stringify(result, null, 2));
