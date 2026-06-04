import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <div className='rounded-xl border border-border bg-card p-5'>
      <div className='mb-3 flex items-center gap-2.5'>
        <span className='grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent'>
          <Icon className='h-3.5 w-3.5' />
        </span>
        <span className='text-xs font-semibold text-muted-foreground'>{label}</span>
      </div>
      <div className='text-3xl font-extrabold tracking-tight tabular-nums'>{value}</div>
      {sub ? <div className='mt-1 font-mono text-sm text-accent'>{sub}</div> : null}
    </div>
  );
}
