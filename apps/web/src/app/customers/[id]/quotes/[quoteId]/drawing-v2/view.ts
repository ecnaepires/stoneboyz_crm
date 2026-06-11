// The ONLY file allowed to know about pixels. Everything else is inches.
import type { drawingV2 } from "@stoneboyz/domain";

type Pt = { x: number; y: number };
type PieceV2 = drawingV2.PieceV2;
type ResolvedEdge = drawingV2.ResolvedEdge;

export const SCALE = 3; // px per inch
export const inToPx = (v: number): number => v * SCALE;
export const pxToIn = (v: number): number => v / SCALE;

export function roundIn16(v: number): number {
  return Math.round(v * 16) / 16;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** 25.5 → `25 1/2"`, 105 → `105"`, 0.75 → `3/4"`. Rounds to 1/16 first. */
export function formatInches(v: number): string {
  const sixteenths = Math.round(v * 16);
  const whole = Math.floor(sixteenths / 16);
  const rem = sixteenths - whole * 16;
  if (rem === 0) return `${whole}"`;
  const d = gcd(rem, 16);
  const frac = `${rem / d}/${16 / d}`;
  return whole === 0 ? `${frac}"` : `${whole} ${frac}"`;
}

/** Accepts `105`, `105.5`, `105 1/2`, `3/4`. Returns inches rounded to 1/16, or null. */
export function parseInches(raw: string): number | null {
  const s = raw.trim().replace(/"$/, "").trim();
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  const frac = /^(\d+)\/(\d+)$/.exec(s);
  const dec = /^(\d+(?:\.\d+)?)$/.exec(s);
  let v: number;
  if (mixed) v = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  else if (frac) v = Number(frac[1]) / Number(frac[2]);
  else if (dec) v = Number(dec[1]);
  else return null;
  if (!Number.isFinite(v) || v <= 0) return null;
  const rounded = roundIn16(v);
  return rounded > 0 ? rounded : null;
}

function outlineBboxCenter(piece: PieceV2): Pt {
  const xs = piece.outline.vertices.map((v) => v.xIn);
  const ys = piece.outline.vertices.map((v) => v.yIn);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function rotateCw(p: Pt, c: Pt, deg: 0 | 90 | 180 | 270): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  switch (deg) {
    case 0: return p;
    case 90: return { x: c.x - dy, y: c.y + dx };
    case 180: return { x: c.x - dx, y: c.y - dy };
    case 270: return { x: c.x + dy, y: c.y - dx };
  }
}

export function pieceToWorld(piece: PieceV2, ptIn: Pt): Pt {
  const c = outlineBboxCenter(piece);
  const r = rotateCw(ptIn, c, piece.rotationDeg);
  return { x: r.x + piece.positionIn.x, y: r.y + piece.positionIn.y };
}

export function worldToPiece(piece: PieceV2, worldIn: Pt): Pt {
  const c = outlineBboxCenter(piece);
  const local = { x: worldIn.x - piece.positionIn.x, y: worldIn.y - piece.positionIn.y };
  const inverse = ((360 - piece.rotationDeg) % 360) as 0 | 90 | 180 | 270;
  return rotateCw(local, c, inverse);
}

/**
 * Canvas-arc params for a kernel arc edge. Canvas 2D with +y down measures
 * angles clockwise-positive, which matches screen orientation directly.
 */
export function arcRenderParams(edge: Extract<ResolvedEdge, { kind: "arc" }>): {
  startAngle: number;
  endAngle: number;
  anticlockwise: boolean;
} {
  const startAngle = Math.atan2(edge.from.y - edge.center.y, edge.from.x - edge.center.x);
  const endAngle = Math.atan2(edge.to.y - edge.center.y, edge.to.x - edge.center.x);
  const TWO_PI = 2 * Math.PI;
  const cwTravel = ((endAngle - startAngle) % TWO_PI + TWO_PI) % TWO_PI;
  const anticlockwise = Math.abs(cwTravel - Math.abs(edge.sweep)) > 1e-6;
  return { startAngle, endAngle, anticlockwise };
}
