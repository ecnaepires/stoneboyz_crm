// packages/domain/src/drawing/v2/util.ts
import { EPS, type Pt } from "./types.js";

export function roundIn(v: number): number {
  return Math.round(v * 16) / 16;
}
export function near(a: number, b: number, tol = EPS): boolean {
  return Math.abs(a - b) <= tol;
}
export function ptAdd(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}
export function ptSub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
export function ptScale(a: Pt, s: number): Pt {
  return { x: a.x * s, y: a.y * s };
}
export function ptDist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function vecLen(a: Pt): number {
  return Math.hypot(a.x, a.y);
}
export function vecNorm(a: Pt): Pt {
  const l = vecLen(a);
  if (l <= EPS) throw new Error("zero-length vector");
  return { x: a.x / l, y: a.y / l };
}
export function dot(a: Pt, b: Pt): number {
  return a.x * b.x + a.y * b.y;
}
export function cross(a: Pt, b: Pt): number {
  return a.x * b.y - a.y * b.x;
}
/** Outward normal for clockwise outlines in screen coords (+y down). */
export function outwardNormal(dir: Pt): Pt {
  const u = vecNorm(dir);
  return { x: u.y + 0, y: -u.x + 0 };
}
export function newVertexId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}
