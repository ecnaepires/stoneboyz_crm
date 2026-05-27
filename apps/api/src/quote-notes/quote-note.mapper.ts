import type { QuoteNote } from '@stoneboyz/domain';

export interface QuoteNoteRow {
  id: string;
  customer_id: string;
  quote_id: string;
  author_user_id: string;
  body: string;
  is_public: boolean;
  deleted_at: Date | null;
  edited_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const mapQuoteNoteRow = (row: QuoteNoteRow): QuoteNote => ({
  id: row.id,
  customerId: row.customer_id,
  quoteId: row.quote_id,
  authorUserId: row.author_user_id,
  body: row.body,
  isPublic: row.is_public,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
  editedAt: row.edited_at?.toISOString() ?? null
});
