import type { CustomerContact } from '@stoneboyz/domain';

export interface CustomerContactRow {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  is_primary: boolean;
  is_billing: boolean;
  preferred_channel: CustomerContact['preferredChannel'];
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const mapCustomerContactRow = (row: CustomerContactRow): CustomerContact => ({
  id: row.id,
  customerId: row.customer_id,
  firstName: row.first_name,
  lastName: row.last_name,
  jobTitle: row.job_title,
  email: row.email,
  phone: row.phone,
  whatsappPhone: row.whatsapp_phone,
  isPrimary: row.is_primary,
  isBilling: row.is_billing,
  preferredChannel: row.preferred_channel,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  archivedAt: row.deleted_at === null ? null : row.deleted_at.toISOString()
});

