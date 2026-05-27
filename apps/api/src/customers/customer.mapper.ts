import type { Customer } from '@stoneboyz/domain';

export interface CustomerRow {
  id: string;
  customer_kind: Customer['customerKind'];
  name: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  status: Customer['status'];
  type: Customer['type'];
  owner_user_id: string;
  primary_contact_id: string | null;
  billing_contact_id: string | null;
  billing_address_id: string | null;
  tax_id: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  source: Customer['source'];
  price_list_id: string | null;
  tags: string[];
  notes_summary: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  billing_email: string | null;
  archive_reason: string | null;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapCustomerRow = (row: CustomerRow): Customer => ({
  id: row.id,
  customerKind: row.customer_kind,
  name: row.name,
  companyName: row.company_name,
  firstName: row.first_name,
  lastName: row.last_name,
  displayName: row.display_name,
  status: row.status,
  type: row.type,
  ownerUserId: row.owner_user_id,
  primaryContactId: row.primary_contact_id,
  billingContactId: row.billing_contact_id,
  billingAddressId: row.billing_address_id,
  taxId: row.tax_id,
  website: row.website,
  industry: row.industry,
  companySize: row.company_size,
  source: row.source,
  priceListId: row.price_list_id,
  tags: row.tags,
  notesSummary: row.notes_summary,
  phone: row.phone,
  whatsappPhone: row.whatsapp_phone,
  billingEmail: row.billing_email,
  archiveReason: row.archive_reason,
  archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  archivedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
