# Dashboard Redesign — Design Doc

**Date:** 2026-06-04
**Status:** Awaiting review
**Owner:** ecnaepires

## Goal

Replace the plain shadcn dashboard (`apps/web/src/app/dashboard/page.tsx`) with a
production-grade, white-label-ready interface — the **"J+K" system**: one component
set, two themes (Onyx dark / Porcelain light) from shared tokens. The product is a
multi-tenant B2B SaaS sold to multiple companies; Stoneboyz (SBZ, "Luxury Kitchen")
is the first tenant, so the design stays neutral and brandable, not Stoneboyz-specific.

This is the dashboard that has to make a prospect on a screen-share say "how much?".

## Chosen direction (locked)

- **Layout:** sidebar + topbar shell. Topbar: global search (⌘K), `+ New Quote`,
  avatar. Content: page title + segmented period control (Today / This month /
  Quarter / Year), stat cards, revenue chart, pipeline donut, recent-quotes table.
- **Theme:** **light default + dark toggle**, driven by CSS variables. Tailwind
  already has `darkMode: ['class']`.
- **Accent:** violet (`#5b50e6` light / `#7c6cff` dark) — treated as the
  **white-label brand token**, swappable per tenant. Status colors (sent/accepted/
  draft/rejected) stay semantic and independent of the accent.
- **Type:** Hanken Grotesk (UI) + IBM Plex Mono (figures/IDs).

Reference mockups (live during brainstorming): `/tmp/v_onyx.html`, `/tmp/v_porcelain.html`.

## Scope (approved)

1. **API contract** — extend the dashboard data (OpenAPI is source of truth).
2. **API implementation** — compute the new fields + tests.
3. **Generated client** — regenerate `packages/api-client` from the spec (never hand-edit).
4. **Web** — redesign `dashboard/page.tsx`, restyle `AppShell` (sidebar/topbar),
   add dark theme tokens to `globals.css`, add a theme toggle.

## Data contract changes

Live `DashboardStats` today: `activeCustomers`, `openQuotes{count,totalCents}`,
`ordersThisMonth{count,totalCents}`, `eventsThisWeek`, `recentQuotes[]`.

The J/K visuals need data that does not exist yet. Proposed additions to
`DashboardStats` (exact shape to be finalised in the OpenAPI step):

- **`revenueSeries`** — ordered monthly points for the chart, e.g.
  `[{ month: "2026-01", quotesCents, ordersCents }]` (last 6 months).
- **`pipeline`** — open-quote counts by status: `{ sent, accepted, draft, rejected }`
  (true totals, not just the recent sample) for the donut.
- **`RecentQuote.valueCents`** — per-quote value for the table's Value column.
- **Trend deltas** — period-over-period deltas for the four stat cards, e.g.
  `openQuotes.deltaPct`, surfaced as ▲/▼ chips and sparklines. (Sparkline series
  may reuse `revenueSeries` or get their own small arrays — decide in OpenAPI step.)

Open question for the OpenAPI step: does any of this need a new SQL migration, or can
it all be aggregate queries over existing `quotes`/`orders`/`events` tables? Expectation:
aggregate queries, **no schema migration** — to be confirmed against the API code.

## Components (web)

Each is a focused unit with one job, themed via tokens:

- `ThemeToggle` — toggles `class="dark"` on `<html>`, persists choice.
- `AppShell` (restyle) — sidebar (logo, nav, active state), topbar (search, New Quote, avatar).
- `StatCard` — label, big number, optional `$` subtotal, delta chip, sparkline.
- `RevenueChart` — dual-line area chart from `revenueSeries`.
- `PipelineDonut` — status breakdown from `pipeline`.
- `RecentQuotesTable` — initials, title, quote#, customer, status pill, value, date.
- `dashboard/page.tsx` — server component: fetch `/dashboard`, compose the above.

## Theming strategy

- Promote `globals.css` to a full token set with `:root` (light) and `.dark` overrides:
  background, card, border, muted, foreground, **accent**, plus chart/status palettes.
- All new components reference tokens only — no hardcoded hex — so a tenant rebrand =
  change accent token(s).

## Error / empty states

- `/dashboard` error → existing inline error treatment, restyled.
- Empty `recentQuotes` → "No recent quotes yet" card.
- Empty/early-tenant data → charts render a flat/empty state, never crash.

## Testing

- API: integration tests for the new `DashboardStats` fields (revenue series shape,
  pipeline counts, quote value, deltas) — new feature = new test (repo rule #6).
- Web: render dashboard with mocked client data incl. empty states.

## Sequencing (respects repo rules: spec-first, generated client)

1. OpenAPI: add the new fields to `DashboardStats` / `RecentQuote`.
2. Regenerate `packages/api-client`.
3. API: implement aggregates + tests (green).
4. Web: theme tokens + `ThemeToggle`, then `AppShell` restyle, then `dashboard/page.tsx`
   + the chart/donut/card/table components.
5. Verify in the running app (light + dark), screenshot both.

## Non-goals

- No per-tenant theming UI yet (just token-ready).
- No changes to other pages beyond the shared `AppShell` restyle.
- No new auth, routing, or data models.
