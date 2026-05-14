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
- `sort_order`: `INTEGER NOT NULL DEFAULT 0`
- `stone_type`: `VARCHAR NOT NULL`
- `qty`: `NUMERIC(10,4) NOT NULL`, CHECK `> 0`
- `qty_unit`: `VARCHAR NOT NULL`
- `unit_price_cents`: `INTEGER NOT NULL`, CHECK `>= 0`
- `labor_price_cents`: `INTEGER NOT NULL DEFAULT 0`, CHECK `>= 0`
- `line_total_cents`: NOT stored in DB — computed in application layer as `floor(qty * (unit_price_cents + labor_price_cents))`
- No soft-delete on line items: hard-deleted via cascade when quote is deleted, or via explicit API call (draft quotes only)
