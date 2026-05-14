import type { CustomerNote } from '@stoneboyz/domain';

export interface CustomerNoteRow {
  id: string;
  customer_id: string;
  author_user_id: string;
  body: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const mapCustomerNoteRow = (row: CustomerNoteRow): CustomerNote => ({
  id: row.id,
  customerId: row.customer_id,
  authorUserId: row.author_user_id,
  body: row.body,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  archivedAt: row.deleted_at === null ? null : row.deleted_at.toISOString()
});
