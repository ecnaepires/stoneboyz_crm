INSERT INTO customers (
  id,
  customer_kind,
  name,
  company_name,
  status,
  type,
  owner_user_id
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'company',
  'Acme Stone Works',
  'Acme Stone Works',
  'lead',
  'customer',
  '22222222-2222-4222-8222-222222222222'
);

INSERT INTO tags (name)
VALUES
  ('test'),
  ('seed')
ON CONFLICT (name) DO NOTHING;

INSERT INTO customer_tags (customer_id, tag_id)
SELECT
  '11111111-1111-4111-8111-111111111111',
  t.id
FROM tags t
WHERE t.name IN ('test', 'seed')
ON CONFLICT DO NOTHING;

INSERT INTO customer_contacts (
  id,
  customer_id,
  first_name,
  last_name,
  job_title,
  email,
  is_primary,
  preferred_channel
) VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Alex',
  'Stone',
  'Operations Manager',
  'alex@example.com',
  true,
  'email'
);
