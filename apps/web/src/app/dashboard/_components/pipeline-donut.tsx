import type { components } from '@stoneboyz/api-client';
import { statusStyle } from './utils';

type QuotePipeline = components['schemas']['QuotePipeline'];

const ORDER = ['sent', 'accepted', 'draft', 'rejected'] as const;
const RADIUS = 15.915; // circumference ≈ 100, so dasharray values read as percentages

export function PipelineDonut({ pipeline }: { pipeline: QuotePipeline }) {
  const total = ORDER.reduce((sum, key) => sum + pipeline[key], 0);

  let offset = 0;
  const segments = ORDER.map((key) => {
    const value = pipeline[key];
    const portion = total === 0 ? 0 : (value / total) * 100;
    const segment = { key, value, portion, dashOffset: -offset };
    offset += portion;
    return segment;
  });

  return (
    <div className='rounded-2xl border border-border bg-card'>
      <div className='p-5 pb-1'>
        <h2 className='text-sm font-bold'>Pipeline</h2>
      </div>
      <div className='flex items-center gap-5 p-5 pt-3'>
        <svg viewBox='0 0 42 42' className='h-28 w-28 shrink-0'>
          <circle cx='21' cy='21' r={RADIUS} fill='none' stroke='hsl(var(--muted))' strokeWidth='6' />
          {total > 0 &&
            segments.map((segment) => (
              <circle
                key={segment.key}
                cx='21'
                cy='21'
                r={RADIUS}
                fill='none'
                stroke={statusStyle(segment.key).color}
                strokeWidth='6'
                strokeDasharray={`${segment.portion} ${100 - segment.portion}`}
                strokeDashoffset={segment.dashOffset}
                transform='rotate(-90 21 21)'
              />
            ))}
          <text x='21' y='20' textAnchor='middle' fontSize='7' fontWeight='700' fill='hsl(var(--foreground))'>
            {total}
          </text>
          <text x='21' y='26' textAnchor='middle' fontSize='3.2' fill='hsl(var(--muted-foreground))'>
            OPEN
          </text>
        </svg>
        <ul className='flex-1 space-y-2.5 text-sm'>
          {ORDER.map((key) => (
            <li key={key} className='flex items-center gap-2.5'>
              <span className='h-2.5 w-2.5 rounded-sm' style={{ backgroundColor: statusStyle(key).color }} />
              {statusStyle(key).label}
              <span className='ml-auto font-mono text-muted-foreground'>{pipeline[key]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
