# Moraware Parity Roadmap

This file translates `docs/moraware-countergo-audit.md` into spec-driven and harness-driven build work.

Goal: keep every operational capability Stoneboyz currently depends on, remove Moraware's clutter, and make each workflow faster, safer, and easier to understand.

## Current Baseline

Already started:

- Customers, contacts, addresses, notes.
- Projects as lightweight customer work scopes.
- Quotes with header, status transitions, line items, totals, and archive flow.
- Scheduled events for appointments and shop jobs.
- Slab inventory with reservation, release, cut, remnants, and project slab links.
- OpenAPI-first API client.
- Real PostgreSQL integration harness.

Main gap: current CRM has the skeleton. Moraware has deep countertop-specific workflow data. We need to add that depth without copying the bad UX.

## Product Areas To Add

### Quote Workspace

Moraware capability to preserve:

- Quote list/detail with status, total, account, project, salesperson, created date, sent/viewed state, payment state, files, email history, forms, and printable PDFs.
- Quote areas/rooms with material, edge, splash, sinks, faucet holes, square footage, and subtotal.
- Manual text/misc items and controlled price overrides.

Better version:

- One quote workspace with tabs: Summary, Areas, Drawing, Pricing, Files, Email, Activity.
- Sticky totals and status actions.
- Area cards for room-level scope; expandable line-level accounting detail.
- Audit trail for generated lines, manual lines, overrides, sends, accepts, rejects, and conversions.

### Quote Drawing Model

Moraware capability to preserve:

- Step 1 Counter Dimensions: edge lengths, rotate, duplicate, delete, save-next-edge entry.
- Step 2 Curves & Bumpouts: radius, clip, bump out, notch, none.
- Step 3 Splash & Edge: 3/4/5 inch splash, other splash, mitered edge, waterfall, finished edge, appliance edge, unfinished edge.
- Step 4 Sink & Cooktop: sink model, sink type, sink shape, cutout dimensions, faucet hole count, centerline, rotate, duplicate.
- Step 5 Color & Edge: area color/product/edge, slabs and layout.
- Step 6 Price Details: price settings, price list revision, tax, discount, expiration, generated lines, overrides, manual items.

Better version:

- Store structured measurements first; drawing is a projection, not the only source of truth.
- Use inches as canonical length unit and display fractions rounded to 1/16 inch.
- Keep fast keyboard/table entry for measurements before full visual editing.
- Generate a clean preview from structured data; add direct drawing manipulation later.
- Preserve drawing revisions and compare them after the base editor works.

### Pricing Engine

Moraware capability to preserve:

- Price lists and revisions.
- Product/material, fabrication, edge, splash, cutout, sink, faucet-hole, and manual price lines.
- Per-area subtotals and quote total.
- Override price per generated line while keeping source price visible.

Better version:

- Deterministic pricing calculator with golden tests.
- Generated lines carry source metadata: area, drawing object, price rule, quantity, unit, and revision.
- Overrides require actor, reason, previous price, new price, and timestamp.
- Manual misc/text lines stay visibly separate from generated lines.

### Production Jobs

Moraware capability to preserve:

- Jobs with job number, job name, account, salesperson, creation date, notes, job address, account contacts, files, quotes, orders, issues, forms, and external access.
- Job activities: Template, Deposit, Material, Fabrication, Install, Invoice, Repair, Phone call, Email, Customer Pick-up.
- Activity statuses: Auto-Schedule, Tentative, Confirmed, In Progress, Complete, Canceled.
- Activity scheduling: start date, scheduled time, duration, assigned to, notes, Today, Current Time, End Now, Myself.
- Job forms: Printable Job Header, Job Checklist, Order Area Details, Area Details, Service.
- Configurable forms with checkbox, dropdown, text, number, linked order/area fields, and custom dropdown values.

Better version:

- Treat job as first-class production record, not just project plus calendar event.
- Quote acceptance can create or attach to a job.
- Job page should show pipeline, activities, forms, quote/order links, files, issues, and schedule in one place.
- Fabrication activity needs special focus: status, date/time, duration, assignee, notes, checklist, linked areas/slabs.

### Calendar And Dispatch

Moraware capability to preserve:

- Calendar views for Standard, Fabrication, Install, Template, Customer Pick-up.
- Filters by activity type and assignee.
- Batch update selected activities.
- Map route planning.
- Print packets/forms for date ranges, activity types, assignees, and page breaks.
- Daily total hours and square footage subtotals.

Better version:

- Role-based views for office, template, fabrication, install, and pickup.
- Calendar cards should expose job number, customer, address, city, sq ft, activity, status, and assignee without visual overload.
- Batch update and print packets should be explicit workflows with preview before commit/print.

### Admin Configuration

Moraware capability to preserve:

- Price lists, price list revisions, products/materials, edge profiles, sinks, faucet holes, payment terms, payment methods, tax codes/rates.
- Email templates and quote/PDF forms.
- Measurement defaults: inches, round to nearest 1/16 inch, default counter depth 25.5 inches.
- Activity types, statuses, assignees, templates, processes, job forms, activity forms, order area forms, issue categories.

Better version:

- Group settings by business domain, not vendor naming.
- Every configuration change needs a preview of what it affects.
- Active/inactive states instead of destructive deletes for operational configuration.

### Reports

Moraware capability to preserve:

- Installed sq ft by month.
- Jobs by salesperson.
- Month install sq ft by week.
- Total sales by month.
- Custom report builder for time selection, reporting date, measure, filters, display fields, display type.

Better version:

- Ship fixed operational reports first.
- Custom builder comes later after core entities are stable.
- Reports must use the same data definitions as dashboard cards and API totals.

## Spec-Driven Build Order

1. Upgrade quotes spec for quote areas, drawing model, price lists, generated price lines, manual lines, and overrides.
2. Upgrade scheduling/projects into a production jobs spec, or create a dedicated jobs module if project and job concerns diverge.
3. Upgrade calendar spec for activity views, batch updates, map filters, and print packets.
4. Add admin/config specs for price lists, measurement defaults, edge/sink catalogs, activity types/statuses, assignees, forms, and templates.
5. Add reports spec after the production data model exists.
6. Only then implement the smallest vertical slice.

## Harness-Driven Acceptance

Every Moraware-parity feature needs these gates:

- Spec gate: module spec, OpenAPI paths/schemas if public API changes, event catalog, DB invariants, and `scripts/check-spec-sync.mjs` checks.
- Domain gate: shared constants/types/schemas and pure calculator/unit tests for statuses, measurement rounding, square footage, linear footage, splash quantity, and pricing.
- DB gate: append-only migration plus reset-test-db coverage.
- API gate: integration tests against real PostgreSQL, including invalid transitions and not-found/conflict cases.
- Web gate: browser workflow tests for the user-facing path, not just component render tests.
- Visual gate: screenshot or DOM assertions for dense tables/forms where overlap or missing controls would hide workflow risk.
- Regression seed: a Stoneboyz sample quote/job that exercises areas, edges, sinks, faucet holes, fabrication, forms, and schedule.

## Golden Scenarios

Use these as acceptance scripts before declaring Moraware replacement parity:

1. Create quote with two areas: Island and Laundry/Desk.
2. Enter counter dimensions, then edit edge lengths using fast next-edge workflow.
3. Apply radius, clip, bump out, and notch treatments to separate corners.
4. Apply finished edge, 4 inch splash, mitered edge, waterfall, appliance edge, and unfinished edge on different segments.
5. Add undermount sink with model, shape, cutout dimensions, centerline, and faucet hole count.
6. Select material/color/edge per area.
7. Generate pricing lines for material, countertop, fabrication, edge, splash, sink cutout, sink item, and faucet holes.
8. Override one fabrication price and add one misc/text item while preserving audit metadata.
9. Send quote, accept it, and create/attach production job.
10. Schedule Fabrication with Tentative status, 2 hour duration, assignee, notes, Today/Current Time helpers, and later mark In Progress/Complete.
11. Fill Job Checklist and Order Area Details forms.
12. Show Fabrication calendar view with daily hours and sq ft totals.
13. Print or preview an activity packet without mutating production data.

## Better-Than-Moraware Criteria

- Fewer clicks for common office tasks.
- No hidden modal is the only place where important data lives.
- Generated data is explainable: users can see which drawing object or price rule produced each line.
- Destructive actions are guarded and never the default.
- Draft work is safe; accepted/sent work is revisioned.
- Dense operations stay dense, but the page hierarchy is calm and readable.
- Every workflow is repeatable in tests.
