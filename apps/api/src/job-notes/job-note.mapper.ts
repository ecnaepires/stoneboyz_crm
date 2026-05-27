import type { JobNote } from '@stoneboyz/domain';

export interface JobNoteRow {
  id: string;
  customer_id: string;
  project_id: string;
  author_user_id: string;
  body: string;
  deleted_at: Date | null;
  edited_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const mapJobNoteRow = (row: JobNoteRow): JobNote => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  authorUserId: row.author_user_id,
  body: row.body,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
  editedAt: row.edited_at?.toISOString() ?? null
});
