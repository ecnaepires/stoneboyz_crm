import type { components } from '@stoneboyz/api-client';
import { formatCurrencyFromCents } from './utils';

type RevenuePoint = components['schemas']['RevenuePoint'];

const WIDTH = 640;
const HEIGHT = 180;
const TOP_PAD = 16;

const monthLabel = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short' });

interface BuiltPath {
  line: string;
  area: string;
}

const buildPaths = (values: number[], max: number): BuiltPath => {
  const span = Math.max(values.length - 1, 1);
  const usableHeight = HEIGHT - TOP_PAD;
  const points = values.map((value, index) => {
    const x = (index / span) * WIDTH;
    const y = HEIGHT - (value / max) * usableHeight;
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;
  return { line, area };
};

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const quotes = data.map((point) => point.quotesCents);
  const orders = data.map((point) => point.ordersCents);
  const max = Math.max(1, ...quotes, ...orders);
  const totalOrders = orders.reduce((sum, value) => sum + value, 0);

  const quotePath = buildPaths(quotes, max);
  const orderPath = buildPaths(orders, max);

  return (
    <div className='rounded-2xl border border-border bg-card'>
      <div className='flex items-start justify-between p-5 pb-1'>
        <div>
          <h2 className='text-sm font-bold'>Revenue</h2>
          <div className='mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums'>
            {formatCurrencyFromCents(totalOrders)}
          </div>
          <div className='text-xs text-muted-foreground'>orders, last 6 months</div>
        </div>
        <div className='flex gap-4 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-sm bg-chart-1' /> Quotes
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-sm bg-chart-2' /> Orders
          </span>
        </div>
      </div>
      <div className='px-3 pb-4'>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio='none'
          className='h-44 w-full'
          role='img'
          aria-label='Revenue over the last six months'
        >
          <defs>
            <linearGradient id='revQuotes' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0' stopColor='hsl(var(--chart-1))' stopOpacity='0.28' />
              <stop offset='1' stopColor='hsl(var(--chart-1))' stopOpacity='0' />
            </linearGradient>
            <linearGradient id='revOrders' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0' stopColor='hsl(var(--chart-2))' stopOpacity='0.2' />
              <stop offset='1' stopColor='hsl(var(--chart-2))' stopOpacity='0' />
            </linearGradient>
          </defs>
          <line x1='0' y1='45' x2={WIDTH} y2='45' stroke='hsl(var(--border))' />
          <line x1='0' y1='90' x2={WIDTH} y2='90' stroke='hsl(var(--border))' />
          <line x1='0' y1='135' x2={WIDTH} y2='135' stroke='hsl(var(--border))' />
          <path d={quotePath.area} fill='url(#revQuotes)' />
          <path d={quotePath.line} fill='none' stroke='hsl(var(--chart-1))' strokeWidth='2.5' />
          <path d={orderPath.area} fill='url(#revOrders)' />
          <path d={orderPath.line} fill='none' stroke='hsl(var(--chart-2))' strokeWidth='2.5' />
        </svg>
        <div className='mt-1 flex justify-between px-1 text-[10px] text-muted-foreground'>
          {data.map((point) => (
            <span key={point.month}>{monthLabel(point.month)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
