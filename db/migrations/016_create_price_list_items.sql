CREATE TABLE IF NOT EXISTS price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_type text NOT NULL,
  name text NOT NULL,
  description text,
  unit text NOT NULL,
  price_cents integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT true,
  allow_discount boolean NOT NULL DEFAULT true,
  editable_on_quote boolean NOT NULL DEFAULT true,
  hide_on_quote boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_list_items_category_not_blank CHECK (length(trim(category)) > 0),
  CONSTRAINT price_list_items_item_type_not_blank CHECK (length(trim(item_type)) > 0),
  CONSTRAINT price_list_items_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT price_list_items_unit_not_blank CHECK (length(trim(unit)) > 0),
  CONSTRAINT price_list_items_price_cents_nonnegative CHECK (price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS price_list_items_price_list_sort_idx
  ON price_list_items (price_list_id, sort_order ASC, created_at ASC, id ASC);
