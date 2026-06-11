# PRD: Moraware-Successor Platform — Phased Roadmap

Triage: `ready-for-agent`
Date: 2026-06-11
Source: calendar grilling session (CONTEXT.md glossary terms + ADR 0009) and product strategy discussion.
Not yet filed to GitHub Issues — no `gh` CLI in the build environment; file it when tooling is available.

## Problem Statement

Stone Boyz runs its shop on Moraware Systemize + CounterGo today, and this CRM must replace it — then be sold to other fabrication shops as a better, cheaper Moraware. Shops are invested in Moraware, not in love with it: the UI is outdated, there is no mobile/tablet story, nothing customer-facing, no intelligence, and its drawing tool and scheduling live in separate products. A shop owner will only switch if the new product removes daily pain, migration feels safe, and it does things Moraware cannot.

Internally, the project has a working spec-driven pipeline and a large body of built features, but the owner has lost the thread of what exists, what is in flight, and what order to build in.

## Solution

A phased build that earns trust with calendar parity-plus, dissolves switching cost with a Moraware importer, wins demos with a tablet-first field experience and customer portal, and differentiates with an AI layer over the clean operational data the earlier phases produce.

- **Phase 1 — Trust (calendar parity-plus).** A dispatcher runs a real day without missing Moraware: Shop-defined Activity Types (ADR 0009), Day Subtotals with live Activity Square Footage, week-by-weekday grid, Run Order, Work Days + Holidays, Job List View, and small parity items.
- **Phase 2 — Migration weapon.** Import a shop's Moraware jobs, accounts, calendar activities, price lists, and saved views onto seeded look-alike defaults.
- **Phase 3 — The field.** Tablet-first templater and install-crew flows; customer portal approvals and deposit payments on the spot.
- **Phase 4 — Intelligence.** Scheduling copilot, risk radar, remnant matchmaking, ask-your-shop natural-language command bar, sketch-to-quote.

## User Stories

### Phase 1 — Calendar parity-plus

1. As a dispatcher, I want each day's header to show total scheduled hours and Activity Square Footage per Activity Type, so that I can judge whether another job fits that day.
2. As a dispatcher, I want Template-day square footage to fall back to the draft quote's drawing-derived number (marked as an estimate) when no accepted quote exists, so that template days are not silently undercounted the way Moraware shows zeros.
3. As a dispatcher, I want Day Subtotals to count exactly the activities my current Calendar View displays, so that the Install Schedule view subtotals only installs.
4. As a shop admin, I want a per-view toggle for showing Day Subtotals, so that views stay uncluttered when capacity numbers aren't needed.
5. As a dispatcher, I want a week-by-weekday grid showing up to 30 days as week rows, so that I can peek weeks ahead without losing the weekday rhythm.
6. As a dispatcher, I want weekend/non-Work-Day columns grayed but still droppable, so that occasional Saturday work can be placed manually.
7. As a dispatcher, I want to drop an activity into a specific empty cell and have it stay exactly there (Run Order), so that top-to-bottom position communicates the day's run sequence to everyone.
8. As a dispatcher, I want timed and untimed activities to keep fully manual vertical order — the day never re-sorts itself — so that my deliberate sequencing survives.
9. As a dispatcher, I want activities scheduled from outside the calendar to insert by time, and untimed arrivals (including Autoscheduled followers) to land at the bottom of the day, so that new items have predictable landing spots.
10. As a shop admin, I want to define my Shop's Activity Types (name, color, Pipeline Stage mapping, square-footage participation, autoschedule chaining, default duration), so that the calendar speaks my shop's vocabulary, not the vendor's.
11. As a shop admin, I want new Shops seeded with the standard Moraware-like Activity Type set, so that day one feels familiar.
12. As a shop admin, I want to configure Work Days and a Holiday list per Shop, so that Autoscheduling skips the days we don't work.
13. As a dispatcher, I want manual placement allowed on any day regardless of Work Days, so that exceptional weekend jobs are possible.
14. As an office user, I want a Job List View with one date column per Activity Type, so that a row reads the whole job story left to right.
15. As an office user, I want each Job List cell to show the date with Schedule Glyphs (AM sun, PM moon, conf/tent/InProg), so that I read the schedule at a glance.
16. As an office user, I want "No Date (tent)" cells to open the activity editor in place, so that unscheduled steps are a clickable to-do list.
17. As an office user, I want Job List View filters for job status, has-unscheduled-activities, and job age, so that I can reproduce the "Active, Unscheduled, 30+ Days Old" chase list.
18. As a calendar user, I want activities with a date but no time to display "Unscheduled" in the time slot, so that date-only scheduling is visibly first-class.
19. As a dispatcher, I want a copy-activity action in the activity editor, so that similar bookings are fast.
20. As any user, I want a per-activity change log (who changed date/time/assignee/status, when), so that "who moved my install" has an answer.
21. As a dispatcher, I want clicking a calendar box to open the quick activity editor popup, so that rescheduling stays fast (existing behavior, keep it).

### Phase 2 — Moraware importer

22. As a migrating shop owner, I want my Moraware jobs, accounts, activities, price lists, and saved views imported over a weekend, so that Monday morning everything is here and looks familiar.
23. As a migrating shop owner, I want my Moraware activity types mapped onto my Shop's Activity Type catalog during import, so that my vocabulary survives the move.
24. As a salesperson at a migrated shop, I want historical quotes and their statuses available, so that in-flight deals don't restart.

### Phase 3 — Field + portal

25. As a Templater, I want a tablet drawing flow at the customer's home, so that the drawing, measurements, and quote update live during the visit.
26. As a Salesperson, I want the customer to approve the quote and pay the deposit through the portal on the spot, so that jobs close in one visit.
27. As an install crew member, I want my day's activities in Run Order on a tablet with job address, contact, drawings, and checklist, so that I work without paper.
28. As an install crew member, I want to mark an activity In Progress/Complete and attach photos from the tablet, so that the office sees field reality immediately.
29. As an office user, I want a clean print layout for a single activity or a day's packet, so that the occasional paper need is covered (full packet templates deferred).
30. As an Account, I want to see my job's status and upcoming appointments in the portal, so that I stop calling the office for updates.

### Phase 4 — AI layer

31. As a dispatcher, I want to ask for "the best install day for job X" and get a slot with a reason (capacity, geography, crew), so that scheduling decisions take seconds.
32. As an office user, I want a risk radar flagging installs without deposits, fabrication without reserved slabs, and stale post-template quotes, so that silent killers surface early.
33. As a Salesperson, I want remnant matchmaking that suggests an inventory Remnant fitting a new quote's pieces, so that material costs drop and remnants move.
34. As any user, I want an ask-your-shop command bar ("what's unscheduled and older than 30 days?", "move Gustavo's Friday templates to Saturday"), so that filters and bulk edits become plain language.
35. As a Templater, I want sketch-to-quote (photo of a hand sketch → draft drawing → priced quote), so that estimates take minutes.

## Implementation Decisions

- **Shop-defined Activity Types first** (ADR 0009): a per-Shop catalog with behavior flags; the existing `AppointmentType` enum becomes seed data. Every Phase 1 feature builds on the catalog, never on `if type === 'fabrication'`.
- **Activity Square Footage is resolved live at render time** via fallback chain (accepted quote → draft quote estimate → 0); never stored on the appointment.
- **Day Subtotals** compute over exactly the activities the view displays; per-view boolean toggle; no Moraware-style subtotal field picker.
- **Run Order** is persisted shared ordering per day; fully manual for timed and untimed; insertion defaults (by time from outside, bottom for untimed/autoscheduled).
- **Work Days + Holidays** are per-Shop settings; the business-day math used by Autoscheduling reads them instead of hardcoding Mon–Fri; manual placement is unrestricted. Scheduling-Hours vs Work-Hours time windows are deliberately skipped (date-first scheduling dominates).
- **Job List View** renders the existing `job_list` view kind using the same saved-view machinery as the calendar.
- **Multi-tenancy is foundational**: every setting (views, colors, Work Days, Holidays, Activity Types) belongs to one Shop. Intra-company locations/divisions are deferred until a multi-branch customer exists.
- **Tablet-first, print-capable**: field surfaces are built for tablets; printing is a clean print layout, not a packet-template system.
- **Deferred** (revival order): Map with assignee start locations → Multiple/bulk edit → recurring appointments (vacations ride on this) → appointment categories → custom display fields → status color customization → locations/divisions → per-view change log → reminders → packet templates. Note: the ask-your-shop AI command bar may subsume Multiple/bulk edit.
- **Domain purity and existing module boundaries hold**: pure scheduling math stays in the domain package; API modules own persistence; the web app stays a thin consumer of the generated API client.

## Testing Decisions

- Tests assert external behavior at the highest existing seams: **real-Postgres integration tests at the API boundary** (prior art: existing integration suites for assignees, autoschedule, dashboard, price-lists) and **pure unit tests in the domain package** (prior art: business-day chain math, pricing groups).
- Phase 1 examples: subtotal resolution (fallback chain) as domain unit tests; Run Order persistence/insertion and Activity Type catalog behavior as API integration tests; Job List View filtering as API integration tests.
- No tests of rendering internals; web behavior is covered by the contract of the API client plus thin-page conventions.
- New features require new tests before merge (existing pipeline rule).

## Out of Scope

- Recurring appointments, appointment categories, reminders, packet templates, custom display fields, status color customization, intra-company locations/divisions, per-view change log (all deferred, see revival order).
- Moraware Scheduling-Hours vs Work-Hours time windows.
- Phase 2–4 detail design (each phase gets its own PRD when its turn comes; this PRD fully specifies only Phase 1).

## Further Notes

**Model-budget execution constraints.** The frontier model (Fable) is available only until 2026-06-22 and is reserved for: architecture decisions, spec writing (`docs/specs/next.md` feature specs), grilling/design sessions, and unblocking the autonomous pipeline. Implementation runs on cheaper models: the existing tdd-runner pipeline (failing tests → Codex implementation → gates loop) and Opus/Sonnet for feature slices against locked specs. The repo's agent harness (spec-writer, tdd-runner, test-enforcer, migration-guard, domain-purity-guard, api-client-regen) is the delivery mechanism: Fable writes the contract, cheap models grind the loop, gates keep them honest.

**Competitive stance.** Two places this product deliberately beats Moraware rather than copying: live sq-ft subtotals (Moraware silently undercounts template days) and no subtotal field-picker (their workaround for a data-model problem this product doesn't have). The deepest moat is the single geometry pipeline: one drawing prices the job, reserves the slab, plans the cut, and feeds calendar capacity.
