export const ATTACHABLE_TYPE_VALUES = ['job', 'quote', 'order', 'customer', 'activity', 'issue'] as const;
export const ATTACHMENT_CATEGORY_VALUES = [
  'before_photo',
  'after_photo',
  'damage_photo',
  'signed_contract',
  'template_doc',
  'design_reference',
  'drawing',
  'invoice',
  'other'
] as const;

export type AttachableType = typeof ATTACHABLE_TYPE_VALUES[number];
export type AttachmentCategory = typeof ATTACHMENT_CATEGORY_VALUES[number];

export interface Attachment {
  id: string;
  customerId: string;
  attachableType: AttachableType;
  attachableId: string;
  category: AttachmentCategory;
  label: string | null;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByUserId: string | null;
  uploadedAt: string;
  deletedAt: string | null;
  deletedByUserId: string | null;
  createdAt: string;
}

export interface CreateAttachmentInput {
  attachableType: AttachableType;
  attachableId: string;
  category?: AttachmentCategory | undefined;
  label?: string | undefined;
  filePath: string;
  mimeType?: string | undefined;
  sizeBytes?: number | undefined;
  uploadedByUserId: string;
}

export interface ListAttachmentsInput {
  attachableType: AttachableType;
  attachableId: string;
}
