import type { Project } from '@stoneboyz/domain';

export interface ProjectRow {
  id: string;
  customer_id: string;
  job_number: string;
  title: string;
  description: string | null;
  job_address_line1: string | null;
  job_address_line2: string | null;
  job_city: string | null;
  job_region: string | null;
  job_postal_code: string | null;
  job_country: string | null;
  job_contact_name: string | null;
  job_phone: string | null;
  job_email: string | null;
  status: Project['status'];
  owner_user_id: string;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

const mapJobAddress = (row: ProjectRow): Project['jobAddress'] => {
  const jobAddress = {
    line1: row.job_address_line1,
    line2: row.job_address_line2,
    city: row.job_city,
    region: row.job_region,
    postalCode: row.job_postal_code,
    country: row.job_country,
    contactName: row.job_contact_name,
    phone: row.job_phone,
    email: row.job_email
  };

  return Object.values(jobAddress).every((value) => value === null) ? null : jobAddress;
};

export const mapProjectRow = (row: ProjectRow): Project => ({
  id: row.id,
  customerId: row.customer_id,
  jobNumber: row.job_number,
  title: row.title,
  description: row.description,
  jobAddress: mapJobAddress(row),
  status: row.status,
  ownerUserId: row.owner_user_id,
  archivedAt: row.archived_at === null ? null : toIso(row.archived_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
