# Database Invariants

Rules that must hold at all times. Enforced via DB constraints and application logic.

---

## Universal Table Rules

Every table MUST have:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Tables storing customer-owned data MUST have:
- `deleted_at TIMESTAMPTZ NULL` (soft delete)
- optional `deleted_by_user_id UUID NULL` and `delete_reason TEXT NULL` when user-facing archive audit is required

All queries on customer data tables MUST filter `WHERE deleted_at IS NULL` by default.

Product and API specs may call this "archive" and expose `archivedAt`.
Database schema still uses `deleted_at` consistently.

---

## Data Integrity Rules

1. No orphaned records: all foreign keys enforced at DB level
2. No NULL where business logic requires a value: use NOT NULL + DEFAULT or application validation
3. Monetary values stored as `INTEGER` (cents) never `FLOAT`
4. Dates stored as `TIMESTAMPTZ`: always UTC, never naive timestamps
5. External IDs from integrations stored alongside internal UUID; never replace internal ID

---

## Module Invariants

Add per-module invariants here as modules are built.

### Example format

```md
## customers
- A customer must have at least one contact person before becoming active
- Customer `status` transitions: lead -> qualified -> active -> inactive/churned
- Archiving a customer sets `deleted_at`; hard delete is not allowed for customer-owned data
```

### quotes

- `quote_number`: `VARCHAR NOT NULL`, UNIQUE index — application generates sequential value per calendar year in format `Q-{YYYY}-{NNN}`
- `status`: `VARCHAR NOT NULL DEFAULT 'draft'`, CHECK constraint `IN ('draft', 'sent', 'accepted', 'rejected')`
- `customer_id`: `UUID NOT NULL` FK → `customers(id)` — customer is required
- `project_id`: `UUID NULL` FK → `projects(id)` — project is optional
- `discount_cents`: `INTEGER NOT NULL DEFAULT 0`, CHECK `>= 0`
- `tax_rate_bps`: `INTEGER NOT NULL DEFAULT 0`, CHECK `>= 0`
- `subtotal_cents` and `total_cents`: NOT stored in DB — computed in application layer from line items at read time
- `sent_at`, `accepted_at`, `rejected_at`: `TIMESTAMPTZ NULL` — set by application on status transition
- `deleted_at` / `deleted_by_user_id`: follow universal soft-delete pattern; API exposes as `archivedAt` / `archivedByUserId`

### quote_line_items

- `quote_id`: `UUID NOT NULL` FK → `quotes(id)` ON DELETE CASCADE — line items are hard-deleted when quote is deleted
- `slab_id`: `UUID NULL` FK → `slabs(id)` ON DELETE SET NULL — optional global inventory reservation link
- `sort_order`: `INTEGER NOT NULL DEFAULT 0`
- `stone_type`: `VARCHAR NOT NULL`
- `qty`: `NUMERIC(10,4) NOT NULL`, CHECK `> 0`
- `qty_unit`: `VARCHAR NOT NULL`
- `unit_price_cents`: `INTEGER NOT NULL`, CHECK `>= 0`
- `labor_price_cents`: `INTEGER NOT NULL DEFAULT 0`, CHECK `>= 0`
- `line_total_cents`: NOT stored in DB — computed in application layer as `floor(qty * (unit_price_cents + labor_price_cents))`
- No soft-delete on line items: hard-deleted via cascade when quote is deleted, or via explicit API call (draft quotes only)

### slabs

- No `customer_id`: slabs are global shop inventory, not customer-owned records
- `parent_slab_id`: `UUID NULL` self-reference to `slabs(id)` ON DELETE SET NULL; used only for remnants
- `status`: `TEXT NOT NULL DEFAULT 'available'`, CHECK `IN ('available', 'reserved', 'cut', 'remnant')`
- `finish`: `TEXT NOT NULL`, CHECK `IN ('polished', 'honed', 'brushed', 'leathered', 'sandblasted')`
- `quality_grade`: `TEXT NOT NULL`, CHECK `IN ('A', 'B', 'C')`
- `length_in`, `width_in`: `NUMERIC(8,3) NOT NULL`, CHECK `> 0`; `thickness_cm`: `NUMERIC(4,1) NOT NULL`, CHECK `> 0`
- `cost_cents`: `INTEGER NOT NULL DEFAULT 0`, CHECK `>= 0`
- `image_urls`: `TEXT[] NOT NULL DEFAULT '{}'`; application validates max 20 and URL format
- `deleted_at` / `deleted_by_user_id`: follow universal soft-delete pattern; API exposes as `archivedAt` / `archivedByUserId`
- Slabs can be updated or archived only when `status IN ('available', 'remnant')`

### project_slabs

- `project_id`: `UUID NOT NULL` FK → `projects(id)` ON DELETE CASCADE
- `slab_id`: `UUID NOT NULL` FK → `slabs(id)` ON DELETE RESTRICT
- `(project_id, slab_id)`: UNIQUE; a slab can be attached to a project only once
- `consumed_by_user_id` / `consumed_at`: set when a project slab is cut

### scheduled_events

- `customer_id`: `UUID NOT NULL` FK → `customers(id)` — customer is always required
- `project_id`: `UUID NULL` FK → `projects(id)` — project is optional
- `event_type`: `TEXT NOT NULL` CHECK `IN ('appointment', 'shop_job')`
- `appointment_type`: `TEXT NULL` CHECK `IN ('measure', 'template', 'install', 'follow_up', 'other')` — must be NOT NULL when `event_type = 'appointment'` (application-enforced); must be NULL when `event_type = 'shop_job'` (application-enforced)
- `title`: `TEXT NOT NULL`
- `scheduled_at`: `TIMESTAMPTZ NOT NULL`
- `duration_minutes`: `INTEGER NOT NULL DEFAULT 60` CHECK `> 0`
- `assignee_user_ids`: `UUID[] NOT NULL` — stored as PostgreSQL array; application validates non-empty and no duplicates
- `address`: `TEXT NULL`
- `notes`: `TEXT NULL`
- `status`: `TEXT NOT NULL DEFAULT 'scheduled'` CHECK `IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')`
- `deleted_at` / `deleted_by_user_id`: follow universal soft-delete pattern; API exposes as `archivedAt` / `archivedByUserId`
- No cascade archive when parent customer is archived — events remain untouched

### Quote Measurements MVP

#### counter_pieces

- `quote_area_id`: `UUID NOT NULL` FK -> `quote_areas(id)` ON DELETE CASCADE
- `sort_order`: `INTEGER NOT NULL DEFAULT 0`
- `length_in`: `NUMERIC NOT NULL`, CHECK `> 0`
- `width_in`: `NUMERIC NOT NULL`, CHECK `> 0`
- `quantity`: `INTEGER NOT NULL DEFAULT 1`, CHECK `> 0`

#### edge_segments

- `quote_area_id`: `UUID NOT NULL` FK -> `quote_areas(id)` ON DELETE CASCADE
- `sort_order`: `INTEGER NOT NULL DEFAULT 0`
- `length_in`: `NUMERIC NOT NULL`, CHECK `> 0`
- `treatment`: `TEXT NOT NULL`, CHECK `IN ('unfinished', 'finished', 'appliance', 'mitered', 'waterfall')`
- `splash_height_in`: `NUMERIC NULL`, CHECK `IS NULL OR > 0`

#### sink_cutouts

- `quote_area_id`: `UUID NOT NULL` FK -> `quote_areas(id)` ON DELETE CASCADE
- `sort_order`: `INTEGER NOT NULL DEFAULT 0`
- `quantity`: `INTEGER NOT NULL DEFAULT 1`, CHECK `> 0`
- `sink_type`: `TEXT NOT NULL`, CHECK `IN ('undermount', 'drop_in', 'farm')`
- `shape`: `TEXT NOT NULL`, CHECK `IN ('rectangle', 'oval', 'double', '60_40', '40_60', '70_30', '30_70')`
- `cutout_length_in`: `NUMERIC NOT NULL`, CHECK `> 0`
- `cutout_width_in`: `NUMERIC NOT NULL`, CHECK `> 0`
- `faucet_hole_count`: `INTEGER NOT NULL DEFAULT 0`, CHECK `BETWEEN 0 AND 5`
- `centerline`: `TEXT NOT NULL DEFAULT 'none'`, CHECK `IN ('none', 'left', 'right', 'center')`

### generated_price_lines

-  must be one of the canonical  (DB CHECK constraint).
-  (DB CHECK constraint).
-  (DB CHECK constraint).
-  is a generated column: .
- At most one row per  pair (UNIQUE index). On regeneration, upsert by (quote_area_id, category).
- Override consistency:  iff  (DB CHECK constraint).
- Rows cascade-delete when  is deleted.
-  nullable FK — can be NULL if price list item was deleted.
