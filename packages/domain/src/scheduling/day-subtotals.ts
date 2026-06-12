export interface DaySubtotalInput {
  activityTypeId: string | null;
  activityTypeName: string | null;
  durationMinutes: number;
  sqft: number | null;
  sqftIsEstimate: boolean;
  sortOrder?: number;
}

export interface DaySubtotal {
  totalHours: number;
  byType: Array<{
    activityTypeId: string;
    name: string;
    sqft: number;
    isEstimate: boolean;
  }>;
}

export function daySubtotal(events: DaySubtotalInput[]): DaySubtotal {
  const totalHours = events.reduce((sum, e) => sum + e.durationMinutes / 60, 0);

  const typeMap = new Map<string, { name: string; sqft: number; isEstimate: boolean; sortOrder: number }>();

  for (const event of events) {
    if (event.activityTypeId === null || event.sqft === null) {
      continue;
    }

    const existing = typeMap.get(event.activityTypeId);
    if (existing) {
      existing.sqft += event.sqft;
      if (event.sqftIsEstimate) {
        existing.isEstimate = true;
      }
    } else {
      typeMap.set(event.activityTypeId, {
        name: event.activityTypeName ?? event.activityTypeId,
        sqft: event.sqft,
        isEstimate: event.sqftIsEstimate,
        sortOrder: event.sortOrder ?? 0,
      });
    }
  }

  const byType = Array.from(typeMap.entries())
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([activityTypeId, { name, sqft, isEstimate }]) => ({
      activityTypeId,
      name,
      sqft,
      isEstimate,
    }));

  return { totalHours, byType };
}
