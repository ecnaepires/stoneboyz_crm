# Project Guidance for Countertop Measuring

Use the `countertop-measuring` skill when implementing or modifying countertop, stone fabrication, quoting, measurement, layout, or geometry logic.

## Codebase Navigation and Handoff Rules

- Use the existing Graphify graph first for codebase questions, architecture, file relationships, and "where are we?" context: `graphify query`, `graphify path`, or `graphify explain`.
- If the graph is missing, stale, or cannot answer a required codebase question, try `graphify . --update` when feasible.
- Before finishing StoneBoyz coding work, use `stoneboyz-countertop-dashboard:agent-handoff-protocol` and include what changed, files touched, validation, risks, what is left, and where work should continue.

## Required Skill Routing

Open and apply the matching skill before planning or editing. Use every skill whose trigger matches the task.

- `graphify` - use first for repo discovery, architecture, file relationships, impact tracing, and "where are we?" questions. Refresh with `graphify . --update` after meaningful changes when feasible.
- `countertop-measuring` - required for countertop measurements, drawing geometry, layout, quoting quantities, square footage, edge footage, cutouts, radius/chamfer, notches, bump-outs, gross/net/billable area, or slab cut-fit logic.
- `stoneboyz-countertop-dashboard:countertop-domain-glossary` - use when naming or changing entities, fields, statuses, routes, API contracts, DB tables, handoffs, or UI labels.
- `stoneboyz-countertop-dashboard:architecture-enforcer` - use when changing backend services, frontend workflows, shared types, APIs, DB schema, permissions, file handling, or financial logic.
- `stoneboyz-countertop-dashboard:data-model-guardian` - use when changing entities, schema, migrations, DTOs, relationships, identifiers, audit behavior, or deletion behavior.
- `stoneboyz-countertop-dashboard:job-lifecycle-guardian` - use when changing job status, workflow actions, scheduling gates, quote approval, deposits, fabrication, installation, or closeout behavior.
- `stoneboyz-countertop-dashboard:measurement-to-quote-translator` - use when converting measurements, drawings, takeoffs, or material selections into quote-ready line items.
- `stoneboyz-countertop-dashboard:quote-pricing-rules` - use when changing quote totals, line items, discounts, tax, approval flow, revisions, or change orders.
- `stoneboyz-countertop-dashboard:accounting-boundary-skill` - use when changing invoices, payments, deposits, refunds, credits, quote-to-invoice behavior, balances, or financial records.
- `stoneboyz-countertop-dashboard:ui-workflow-skill` - use when changing dashboards, job screens, drawing screens, navigation, workflow buttons, status displays, blockers, alerts, or summaries.
- `stoneboyz-countertop-dashboard:customer-communication-skill` - use when changing customer-facing templates, quote emails, schedule reminders, deposit requests, install notices, invoice messages, or payment reminders.
- `stoneboyz-countertop-dashboard:deployment-ops-skill` - use when changing deployment, hosting, VPS, backups, restore, env vars, SSL, migrations, logs, monitoring, file storage, cron, or rollback behavior.
- `stoneboyz-countertop-dashboard:testing-and-regression-skill` - use before finishing work and whenever changing shared types, money logic, job status, DB schema, APIs, auth, permissions, storage, or deployment behavior.
- `stoneboyz-countertop-dashboard:agent-handoff-protocol` - use before finishing StoneBoyz coding work; final handoff must include goal, changes, files, business logic, assumptions, validation, risks, and next step.

Core project rules:

- Use inches for all linear countertop measurements.
- Use square inches for internal area calculations.
- Convert to square feet for reporting and pricing.
- Keep `gross_area`, `net_finished_area`, and `billable_area` separate as concepts.
- In drawing v2, corner treatments (radius/chamfer, in/out), notches, and bump-outs are real outline geometry and are measured exactly (ADR 0010). Sink/faucet/pole cutouts are counted as units and never subtracted from area.
- Billable-area adjustments (round-up, minimums, gross-vs-net election) come only from shop settings; until the shop-settings spec exists, billed = measured.
- Treat example dimensions as examples only, not hardcoded rules.
- Use exact geometry for drawing, layout, cutting, and validation.
- Use configurable shop rules for billing and pricing behavior.
