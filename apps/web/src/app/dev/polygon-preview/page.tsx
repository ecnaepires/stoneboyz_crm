import { drawingV2 } from '@stoneboyz/domain';

type Pt = { x: number; y: number };
type ResolvedEdge = ReturnType<typeof drawingV2.resolveOutline>[number];
import { PolygonPreview } from '../../customers/[id]/quotes/[quoteId]/PolygonPreview';
import type { RenderPolygon } from '../../customers/[id]/quotes/[quoteId]/polygon-render';

// Dev-only visual check for the angled-polygon read path (ADR 0006 / 0007).
// Renders shapes the chain model cannot express. Not part of the quote flow; this
// page exists so the polygon render model can be eyeballed before the editor and
// the Phase 1 domain types land. Safe to delete once PolygonPreview is mounted in
// the real drawing canvas.

const SHAPES: Array<{ title: string; note: string; polygon: RenderPolygon }> = [
  {
    title: 'Rectangle',
    note: 'Baseline — 96" × 25.5", four 90° corners.',
    polygon: {
      vertices: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 96, y: 0 },
        { id: 'c', x: 96, y: 25.5 },
        { id: 'd', x: 0, y: 25.5 },
      ],
    },
  },
  {
    title: 'L-shape',
    note: 'Six edges, each measured exactly — no bounding-box over-report.',
    polygon: {
      vertices: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 60, y: 0 },
        { id: 'c', x: 60, y: 20 },
        { id: 'd', x: 25, y: 20 },
        { id: 'e', x: 25, y: 40 },
        { id: 'f', x: 0, y: 40 },
      ],
    },
  },
  {
    title: 'Angled peninsula',
    note: 'A clipped, non-90° run — impossible in the axis-aligned chain model.',
    polygon: {
      vertices: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 72, y: 0 },
        { id: 'c', x: 96, y: 24 },
        { id: 'd', x: 96, y: 50 },
        { id: 'e', x: 0, y: 50 },
      ],
    },
  },
];

function buildShowcaseOutline() {
  const { validateOutline, cornerToAngle, filletCorner, addBumpOut, arcThroughPoints } = drawingV2;
  const base = validateOutline({
    vertices: [
      { vertexId: 'a', xIn: 0, yIn: 0 },
      { vertexId: 'b', xIn: 96, yIn: 0 },
      { vertexId: 'c', xIn: 96, yIn: 50 },
      { vertexId: 'e', xIn: 70, yIn: 50 },
      { vertexId: 'f', xIn: 70, yIn: 25.5 },
      { vertexId: 'g', xIn: 0, yIn: 25.5 },
    ],
  });
  if (!base.ok) throw new Error(base.error);
  const withBump = addBumpOut(base.outline, 'f', 35, 20, 3);
  if (!withBump.ok) throw new Error(withBump.error);
  const with45 = cornerToAngle(withBump.outline, 'f', 45, 8 * Math.SQRT2);
  if (!with45.ok) throw new Error(with45.error);
  const withRadius = filletCorner(with45.outline, 'b', 'radius', 2, 'out');
  if (!withRadius.ok) throw new Error(withRadius.error);
  const withBow = arcThroughPoints(
    withRadius.outline,
    'c',
    { x: 90, y: 50 },
    { x: 84, y: 56 },
    { x: 78, y: 50 },
  );
  if (!withBow.ok) throw new Error(withBow.error);
  return withBow.outline;
}

function KernelV2Showcase() {
  const { resolveOutline, outlineAreaSqIn, edgeLengthsIn } = drawingV2;
  const outline = buildShowcaseOutline();
  const edges = resolveOutline(outline);
  const areaSqIn = outlineAreaSqIn(outline);
  const lengths = edgeLengthsIn(outline);

  const PX = 3;
  const PAD = 20;
  const pts = edges.map((e: ResolvedEdge) => e.from);
  const minX = Math.min(...pts.map((p: Pt) => p.x));
  const minY = Math.min(...pts.map((p: Pt) => p.y));
  const maxX = Math.max(...edges.map((e: ResolvedEdge) => e.to.x), ...pts.map((p: Pt) => p.x));
  const maxY = Math.max(...edges.map((e: ResolvedEdge) => e.to.y), ...pts.map((p: Pt) => p.y));
  const W = (maxX - minX) * PX + PAD * 2;
  const H = (maxY - minY) * PX + PAD * 2;

  const tx = (x: number) => (x - minX) * PX + PAD;
  const ty = (y: number) => (y - minY) * PX + PAD;

  const pathD = edges
    .map((e: ResolvedEdge, i: number) => {
      const prefix = i === 0 ? `M ${tx(e.from.x)} ${ty(e.from.y)}` : '';
      if (e.kind === 'line') {
        return `${prefix} L ${tx(e.to.x)} ${ty(e.to.y)}`;
      }
      const r = e.radiusIn * PX;
      const large = Math.abs(e.sweep) > Math.PI ? 1 : 0;
      const sweep = e.sweep < 0 ? 1 : 0;
      return `${prefix} A ${r} ${r} 0 ${large} ${sweep} ${tx(e.to.x)} ${ty(e.to.y)}`;
    })
    .join(' ') + ' Z';

  const totalPerim = lengths.reduce((s: number, l: { lengthIn: number }) => s + l.lengthIn, 0);

  return (
    <section className='rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950'>
      <h2 className='mb-1 text-base font-semibold'>Kernel v2 — Slice 1 QA showcase</h2>
      <p className='mb-3 text-xs text-slate-500'>
        L-shape with 45° inside run, 2&quot; rounded outside corner, 20&quot;-wide bump-out, bow-front arc. Pure kernel calls.
      </p>
      <div className='flex flex-col gap-4 sm:flex-row'>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className='rounded border border-slate-300 bg-white'
        >
          <path d={pathD} fill='#dbeafe' stroke='#2563eb' strokeWidth={1.5} />
        </svg>
        <pre className='flex-1 overflow-auto rounded bg-slate-900 p-3 text-xs text-green-300'>
          {`Area:      ${(areaSqIn / 144).toFixed(3)} sq ft (${areaSqIn.toFixed(1)} sq in)\n`}
          {`Perimeter: ${totalPerim.toFixed(3)} in\n\nEdges:\n`}
          {lengths.map((l: { kind: string; sourceStartVertexId: string; lengthIn: number }, i: number) => `  [${i}] ${l.kind} id=${l.sourceStartVertexId} ${l.lengthIn.toFixed(4)}"\n`).join('')}
        </pre>
      </div>
    </section>
  );
}

export default function PolygonPreviewDevPage() {
  return (
    <div className='space-y-8 p-6'>
      <header>
        <h1 className='text-lg font-semibold'>Polygon render preview</h1>
        <p className='text-sm text-slate-500'>
          Read-only check of the angled-polygon render path. Dev page — not part of
          the quote editor.
        </p>
      </header>

      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
        {SHAPES.map((shape) => (
          <figure
            key={shape.title}
            className='rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'
          >
            <figcaption className='mb-3'>
              <span className='font-medium'>{shape.title}</span>
              <span className='block text-xs text-slate-500'>{shape.note}</span>
            </figcaption>
            <PolygonPreview polygon={shape.polygon} />
          </figure>
        ))}
      </div>

      <KernelV2Showcase />
    </div>
  );
}
