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
    </div>
  );
}
