import type { CustomerAddress } from '@stoneboyz/domain';

export interface CustomerAddressRow {
  id: string;
  customer_id: string;
  type: CustomerAddress['type'];
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  is_primary: boolean;
  is_billing: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const mapCustomerAddressRow = (row: CustomerAddressRow): CustomerAddress => ({
  id: row.id,
  customerId: row.customer_id,
  type: row.type,
  line1: row.line1,
  line2: row.line2,
  city: row.city,
  region: row.region,
  postalCode: row.postal_code,
  country: row.country,
  isPrimary: row.is_primary,
  isBilling: row.is_billing,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  archivedAt: row.deleted_at === null ? null : row.deleted_at.toISOString()
});

