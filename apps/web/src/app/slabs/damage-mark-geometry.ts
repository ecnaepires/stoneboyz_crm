export interface Point {
  x: number;
  y: number;
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CircleDamageShape {
  kind: 'circle';
  x: number;
  y: number;
  radius: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const pointToNormalizedCircle = (
  point: Point,
  rect: RectLike,
  radius = 0.08
): CircleDamageShape => ({
  kind: 'circle',
  x: clamp((point.x - rect.left) / rect.width, 0, 1),
  y: clamp((point.y - rect.top) / rect.height, 0, 1),
  radius: clamp(radius, 0.01, 0.5),
});

export const dragToNormalizedCircle = (
  start: Point,
  end: Point,
  rect: RectLike
): CircleDamageShape => {
  const center = pointToNormalizedCircle(start, rect);
  const dx = (end.x - start.x) / rect.width;
  const dy = (end.y - start.y) / rect.height;
  const radius = Math.sqrt(dx * dx + dy * dy);

  return {
    ...center,
    radius: clamp(radius || center.radius, 0.01, 0.5),
  };
};
