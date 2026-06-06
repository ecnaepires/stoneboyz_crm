const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const formatCurrencyFromCents = (cents: number): string =>
  currencyFormatter.format(Math.round(cents / 100));

export interface StatusStyle {
  label: string;
  color: string;
}

// Status colors are semantic and intentionally independent of the brand accent.
export const STATUS_META: Record<string, StatusStyle> = {
  draft: { label: 'Draft', color: '#94a3b8' },
  sent: { label: 'Sent', color: '#3b82f6' },
  accepted: { label: 'Accepted', color: '#16a34a' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  archived: { label: 'Archived', color: '#9ca3af' },
};

export const statusStyle = (status: string): StatusStyle =>
  STATUS_META[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), color: '#9ca3af' };

export const initialsFromTitle = (title: string): string =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || '·';
