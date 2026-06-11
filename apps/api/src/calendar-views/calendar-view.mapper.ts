import type { CalendarView, CalendarViewConfig } from "@stoneboyz/domain";

export interface CalendarViewRow {
  id: string;
  name: string;
  view_kind: CalendarView["viewKind"];
  owner_user_id: string | null;
  is_shared: boolean;
  config: unknown;
  is_default: boolean | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

const toIso = (value: Date): string => value.toISOString();
const toNullableIso = (value: Date | null): string | null =>
  value === null ? null : toIso(value);

export const mapCalendarViewRow = (
  row: CalendarViewRow,
  config: CalendarViewConfig,
): CalendarView => ({
  id: row.id,
  name: row.name,
  viewKind: row.view_kind,
  ownerUserId: row.owner_user_id,
  isShared: row.is_shared,
  config,
  isDefault: row.is_default ?? false,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  archivedAt: toNullableIso(row.archived_at),
});
