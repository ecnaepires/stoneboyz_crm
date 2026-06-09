# Reports Module

## Purpose

Reports owns the shop's fixed operational reports. It is **read-only**: it has no
entities, no migrations, and emits no events. Every report is a deterministic
aggregation over existing data, and **MUST use the same data definitions as the
dashboard and the API totals** so a number never disagrees between two screens.

Per the Moraware parity roadmap, the four fixed reports ship first; a custom
report builder comes later, after the production data model is stable.

This module answers:
- How much money did we sell, by month?
- How many jobs did each salesperson run?
- How much square footage did we install, by month and by week?

## Measurement law

Linear values are inches and internal area math is square inches, but **reports
present area in square feet** (`square_feet = square_inches / 144`). Square footage
in reports is the same `material`-category quantity used for pricing — never a
re-derived or bounding-box number.

## Reports

### 1. Sales by Month

- **Definition:** total order value per calendar month.
- **Source:** `SUM(orders.total_cents)` grouped by `date_trunc('month', orders.sale_date)`,
  excluding archived orders. Identical definition to the dashboard "orders this
  month total".
- **Row:** `{ month: ISO date (first of month), totalCents: integer, orderCount: integer }`.

### 2. Jobs by Salesperson

- **Definition:** count of jobs each salesperson owns. A Job is a `project`
  (CONTEXT.md: "Project" is the data-model name for a Job); the salesperson is
  `projects.owner_user_id`.
- **Source:** `COUNT(projects)` grouped by `owner_user_id`, excluding archived
  projects, joined to `users` for the display name.
- **Row:** `{ userId: UUID, name: string, jobCount: integer }`.

### 3. Installed Square Footage by Month

- **Definition:** square footage installed per calendar month. "Installed" means a
  project has an `install` appointment whose start falls in the month; the square
  footage is that project's generated material quantity.
- **Source:** projects with a `scheduled_events` row where
  `appointment_type = 'install'`, joined to that project's quotes →
  `generated_price_lines` where `category = 'material'`, summing `quantity`
  (already in square feet). Grouped by `date_trunc('month', scheduled_events.start_at)`.
- **Row:** `{ month: ISO date, installedSqFt: number }`.

### 4. Installed Square Footage by Week

- Same definition and source as report 3, grouped by
  `date_trunc('week', scheduled_events.start_at)`.
- **Row:** `{ week: ISO date (week start), installedSqFt: number }`.

## Open modeling note

A project may have more than one quote. Report 3/4 sum material quantity across the
project's **non-archived** quotes; if a shop later needs "only the accepted quote
counts as installed," that becomes a shop setting. Recorded here so the choice is
explicit, not silent.

## API endpoints

All under `/reports`, bearer/cookie auth, JSON. Each takes an optional
`from`/`to` ISO date range (default: trailing 12 months).

- `GET /reports/sales-by-month`
- `GET /reports/jobs-by-salesperson`
- `GET /reports/installed-sqft-by-month`
- `GET /reports/installed-sqft-by-week`

Each returns `{ data: Row[] }` using the row shapes above. Responses are ordered by
the time bucket ascending (jobs-by-salesperson is ordered by `jobCount` descending).

## Out of scope (deferred)

- Custom report builder (time selection, measure, filters, display fields).
- Any report whose number depends on the interactive drawing canvas at request
  time — all four reports above read persisted data only.
