ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS job_address_line1 text,
  ADD COLUMN IF NOT EXISTS job_address_line2 text,
  ADD COLUMN IF NOT EXISTS job_city text,
  ADD COLUMN IF NOT EXISTS job_region text,
  ADD COLUMN IF NOT EXISTS job_postal_code text,
  ADD COLUMN IF NOT EXISTS job_country text,
  ADD COLUMN IF NOT EXISTS job_contact_name text,
  ADD COLUMN IF NOT EXISTS job_phone text,
  ADD COLUMN IF NOT EXISTS job_email text,
  ADD COLUMN IF NOT EXISTS job_address_notes text;
