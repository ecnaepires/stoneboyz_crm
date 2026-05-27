CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS project_tags (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, tag_id)
);

INSERT INTO tags (name)
SELECT DISTINCT tag_name
FROM customers c
CROSS JOIN LATERAL unnest(c.tags) AS tag_name
WHERE COALESCE(c.tags, '{}'::text[]) <> '{}'::text[]
ON CONFLICT (name) DO NOTHING;

INSERT INTO customer_tags (customer_id, tag_id)
SELECT c.id, t.id
FROM customers c
CROSS JOIN LATERAL unnest(c.tags) AS tag_name
JOIN tags t ON t.name = tag_name
WHERE COALESCE(c.tags, '{}'::text[]) <> '{}'::text[]
ON CONFLICT DO NOTHING;

ALTER TABLE customers DROP COLUMN IF EXISTS tags;
