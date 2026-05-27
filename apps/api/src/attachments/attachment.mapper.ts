import type { Attachment } from '@stoneboyz/domain';

export interface AttachmentRow {
  id: string;
  customer_id: string;
  attachable_type: Attachment['attachableType'];
  attachable_id: string;
  category: Attachment['category'];
  label: string | null;
  file_path: string;
  mime_type: string | null;
  size_bytes: string | number | null;
  uploaded_by_user_id: string | null;
  uploaded_at: Date;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapAttachmentRow = (row: AttachmentRow): Attachment => ({
  id: row.id,
  customerId: row.customer_id,
  attachableType: row.attachable_type,
  attachableId: row.attachable_id,
  category: row.category,
  label: row.label,
  filePath: row.file_path,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
  uploadedByUserId: row.uploaded_by_user_id,
  uploadedAt: toIso(row.uploaded_at),
  deletedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  deletedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at)
});
