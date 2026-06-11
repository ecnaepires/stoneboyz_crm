"use client";

// Standalone, render-only preview of an angled polygon piece (ADR 0006 / 0007).
//
// This is a presentational SVG view — no editing, no interaction, no canvas
// state. It exists to prove the polygon read path renders a true non-90° outline
// (which the chain model cannot), and to be mounted into the drawing canvas later,
// AFTER Codex lands the Phase 1 identity-keyed domain types. It is intentionally
// not imported by DrawingCanvasInner yet: that 10.7k-line file is mid-migration
// and must not be churned until the domain contract exists.
//
// All visual geometry comes from the pure helpers in polygon-render.ts, so the
// math is covered by polygon-render.test.ts without a DOM test environment.

import {
  DEFAULT_RENDER_SCALE,
  polygonOutlinePoints,
  polygonRenderEdges,
  polygonRenderVertices,
  type RenderPolygon,
} from "./polygon-render";

interface PolygonPreviewProps {
  polygon: RenderPolygon;
  scale?: number;
  // Pixel padding around the outline so vertex handles and labels are not clipped.
  padding?: number;
  showDimensions?: boolean;
  showAngles?: boolean;
}

// Round for display only — never feeds back into geometry (RC-05).
function fmtIn(value: number): string {
  return `${Math.round(value * 16) / 16}"`;
}

function fmtDeg(value: number): string {
  return `${Math.round(value)}°`;
}

export function PolygonPreview({
  polygon,
  scale = DEFAULT_RENDER_SCALE,
  padding = 24,
  showDimensions = true,
  showAngles = true,
}: PolygonPreviewProps) {
  const outline = polygonOutlinePoints(polygon, scale);
  const edges = polygonRenderEdges(polygon, scale);
  const vertices = polygonRenderVertices(polygon, scale);

  if (!outline) {
    return null;
  }

  const xs = vertices.map((v) => v.px[0]);
  const ys = vertices.map((v) => v.px[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX + padding * 2;
  const height = Math.max(...ys) - minY + padding * 2;
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      role="img"
      aria-label="Countertop piece outline preview"
    >
      <polygon
        points={outline}
        fill="rgba(59, 130, 246, 0.12)"
        stroke="#2563eb"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {showDimensions &&
        edges.map((edge) => (
          <text
            key={`dim-${edge.fromVertexId}-${edge.toVertexId}`}
            x={edge.midpointPx[0]}
            y={edge.midpointPx[1]}
            fontSize={11}
            fill="#1e293b"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {fmtIn(edge.lengthIn)}
          </text>
        ))}

      {vertices.map((vertex) => (
        <g key={`vtx-${vertex.id}`}>
          <circle cx={vertex.px[0]} cy={vertex.px[1]} r={3.5} fill="#2563eb" />
          {showAngles && Math.abs(vertex.interiorAngleDeg - 90) > 0.5 && (
            <text
              x={vertex.px[0]}
              y={vertex.px[1] - 8}
              fontSize={10}
              fill="#b45309"
              textAnchor="middle"
            >
              {fmtDeg(vertex.interiorAngleDeg)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
