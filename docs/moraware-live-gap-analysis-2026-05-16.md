# Moraware Live Gap Analysis - 2026-05-16

Live source: authenticated read-only pass through `https://stoneboyz.moraware.net/sys` and `https://stoneboyz.moraware.net/go`.

Test quote created with user approval:

- `TEST DO NOT USE - Codex Drawing Audit 2026-05-16`
- Moraware URL: `https://stoneboyz.moraware.net/go/editquote/1569`
- Used only for inspection. No email, order conversion, job conversion, or deletion.

Purpose: identify what Moraware supports today that Stoneboyz CRM does not yet support, then translate that into a build plan.

## Live Notes - 2026-05-17 (User-Guided, Strict Parity)

Context:

- Live paired session in Moraware CounterGo editor.
- URL: `https://stoneboyz.moraware.net/go/editquote/1570`.
- User requirement: interaction parity must feel identical for existing Stoneboyz users.

### User-Stated Must-Have Behaviors (captured verbatim as product requirements)

1. Freeform chained drawing in Step 1 must support non-rectangular paths:
   - User can drag repeatedly to create L and Z style counter paths.
   - Current CRM can create rectangle but does not support L/Z "lock in place" flow.
2. During drawing, user expects immediate geometric feedback:
   - Measurements shown on each side/segment.
   - Degree/angle feedback at turns while dragging.
3. On-piece contextual operations are required:
   - Click piece directly and get `Rotate Counter Left`, `Rotate Counter Right`, `Duplicate Counter`, `Delete Counter`.
   - User should not need to scroll to forms for destructive or transform actions.
4. Inline edge-dimension editing is required:
   - Click dimension text (example given: `48.5`).
   - Open small input dialog.
   - Enter replacement value (example: `25`).
   - Actions include `Save` and `Save and Next Edge`.
5. Guided edge-walk workflow is required:
   - `Save and Next Edge` advances editing focus around the piece edge-by-edge.
6. UX parity requirement is strict:
   - "Works similarly" is not acceptable.
   - Existing Moraware muscle memory must transfer with minimal or no retraining.

### Live Verification Done In This Session

- Confirmed active six-step CounterGo wizard and successful step navigation:
  1. `Counter Dimensions`
  2. `Curves & Bumpouts`
  3. `Splash & Edge`
  4. `Sink & Cooktop`
  5. `Color & Edge`
  6. `Price Details`
- Confirmed top toolbar present in live editor:
  - `Help`, `Undo`, `Redo`, `Revisions`, `Save`, `Exit`.
- Confirmed right tool rail present:
  - `Text`, `Page Break`, `Other Counter`, `Round To Nearest 1/16"`, `Zoom In`, `Zoom Out`, `Reset Zoom`, `Pan`.
- Confirmed contextual piece menu entries are present in editor UI:
  - `Rotate Counter Left`, `Rotate Counter Right`, `Duplicate Counter`, `Delete Counter`.

### Confirmed CRM Gap (as of this session)

- CRM quote measurement UI currently supports structured piece editing but not full CounterGo parity for:
  - chained L/Z draw flow,
  - in-canvas turn-angle guidance,
  - direct on-piece rotate/duplicate/delete context actions,
  - inline edge-click edit dialog with `Save and Next Edge` walk mode.

### Finding: Quote Editor Shell And Workspace Layout

- Moraware behavior: Quote drawing lives inside a dedicated CounterGo editor surface with one top toolbar (`Help`, `Undo`, `Redo`, `Revisions`, `Save`, `Exit`), a six-step wizard, and a persistent right-side tool rail.
- CRM behavior: Quote editing is split across separate cards (`Drawing`, `Measurements`, `Pricing`) inside the quote detail page. Drawing is one card, measurement forms are another, and pricing lives separately.
- Gap: Our UI is modular and functional, but the workspace rhythm is not the same. Users must shift between cards and scroll, while Moraware keeps the drawing workflow in one concentrated tool surface.
- Fix requirement: Reframe quote drawing into a dedicated editor workspace that preserves Moraware's top-toolbar + stepper + right-rail interaction model. Related measurement and pricing operations should be reachable inside that same editing flow, not as separate stacked cards.
- Verification: A user can complete drawing and measurement work without dropping into a separate form-heavy section below the canvas.

### Finding: Counter Dimensions Draw Model

- Moraware behavior: Step 1 supports chained countertop drawing with multi-turn paths. Users can drag through sequential turns to create rectangle, L, and Z-style shapes while seeing live dimensions and turn feedback.
- CRM behavior: [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>) creates a fixed-depth first piece by drag and optionally creates a second leg piece when vertical overflow is large enough. Depth locks to `25 1/2"` and the model is still piece-based rather than a true chained shape workflow.
- Gap: CRM simulates an L with separate pieces, but does not provide Moraware's continuous chained draw behavior or shape-building feel.
- Fix requirement: Replace the current preview/create flow with a chained segment drawing system that supports continuous turns and preserves a single active draw session across edges.
- Verification: Users can draw rectangle, L, and Z counters in one continuous interaction, without dropping into separate piece creation logic between turns.

### Finding: Live Geometry Feedback

- Moraware behavior: During draw and edge work, users see live measurement values on the shape and angle/degree feedback at turns.
- CRM behavior: Current canvas shows length and width labels for completed or previewed rectangular pieces, but no live angle display and no turn-specific geometry feedback.
- Gap: Users receive only partial dimensional feedback. The missing turn guidance is one of the reasons the CRM does not yet feel like CounterGo.
- Fix requirement: Add live per-segment dimension labels and turn-angle feedback during chained drawing and corner editing.
- Verification: While dragging through turns, each segment length updates live and the active turn shows angle/degree feedback before commit.

### Finding: On-Piece Context Menu

- Moraware behavior: Clicking a counter body opens immediate local actions directly on the piece: `Rotate Counter Left`, `Rotate Counter Right`, `Duplicate Counter`, `Delete Counter`.
- CRM behavior: Clicking a piece selects it and opens a lower edit panel in [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>) with `Save Piece`, `Delete Piece`, and a depth shortcut. Rotation and duplication are not present.
- Gap: Core transform/delete actions are displaced away from the point of interaction and the action set is incomplete.
- Fix requirement: Add a direct on-canvas piece context menu with rotate-left, rotate-right, duplicate, and delete, matching Moraware action placement and ordering as closely as practical.
- Verification: Clicking a piece surfaces those actions without requiring the user to scroll or open a lower form section.

### Finding: Edge Length Editing Workflow

- Moraware behavior: Clicking a dimension label opens a small edge-length editor with `Save` and `Save & Next Edge`, then walks the user edge-by-edge around the selected piece.
- CRM behavior: Piece edits happen through a bottom panel with length/depth text boxes, and edge segments are maintained separately in [MeasurementsCard.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx>) as standalone forms with `Save Edge` / `Add Edge`.
- Gap: Edge editing is disconnected from the drawing surface and lacks the guided sequential edge workflow that makes CounterGo fast.
- Fix requirement: Move edge editing to direct dimension-label interaction on the canvas and implement `Save & Next Edge` traversal around the shape.
- Verification: A user can click one dimension, enter a new number, save, and continue directly to the next edge without leaving the canvas.

### Finding: Step Coverage Beyond Step 1

- Moraware behavior: Each wizard step changes the editing mode meaningfully: Step 2 for curves/bumpouts, Step 3 for splash/edge, Step 4 for sinks/cooktops, Step 5 for color/edge, Step 6 for pricing details.
- CRM behavior: [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>) renders a six-step header, but Steps 2-4 still operate on largely the same generic canvas, while Steps 5-6 are placeholders with explanatory text rather than true editing tools.
- Gap: The CRM visually signals a Moraware-like wizard, but the step-specific capabilities are not yet implemented to the same depth.
- Fix requirement: Treat the existing six-step shell as a scaffold only; each step needs its own real tools, menus, and persisted interactions to reach parity.
- Verification: Switching steps changes available interactions in the same way users expect in CounterGo, not just the heading text.

### Finding: Curves And Bumpouts Editing

- Moraware behavior: Step 2 exposes corner/edge treatment directly on the drawing. Clicking a corner marker opens options such as `Radius`, `Clip`, `Bump Out`, `Notch`, and `None`, with small focused modals for the chosen treatment.
- CRM behavior: In [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>), Step 2 only changes the text label drawn on the piece to `-Std-`. There are no corner handles, no context menu, no treatment dialogs, and no persistence model exposed through the canvas.
- Gap: Step 2 is currently a visual placeholder rather than a real curve/bumpout editing mode.
- Fix requirement: Add explicit editable corner/edge markers and a treatment workflow that supports radius, clip, bump-out, notch, and clear/reset, with state saved per corner/edge.
- Verification: A user can enter Step 2, click a corner on the canvas, choose a treatment, set dimensions, save it, and see both the drawing and downstream measurements update.

### Finding: Splash And Edge Workflow

- Moraware behavior: Step 3 edits splash and edge at the segment level from the canvas itself. Users choose among presets like `3 inch`, `4 inch`, `5 inch`, `other splash`, `mitered edge`, `waterfall`, `finished edge`, `appliance edge`, and `unfinished edge`.
- CRM behavior: Edge data exists in [MeasurementsCard.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx>) as form rows with `lengthIn`, `treatment`, and `splashHeightIn`, but editing happens in a separate card below the drawing. On the canvas, Step 3 only swaps the piece label to `F`.
- Gap: CRM has part of the data model, but the interaction model is disconnected from the drawing and does not give users segment-level direct manipulation.
- Fix requirement: Move edge/splash editing onto the canvas in Step 3, with clickable segment states and Moraware-style preset actions. Keep the underlying edge record model, but change how it is edited.
- Verification: A user can click a visible edge segment in Step 3, assign splash/edge treatment without leaving the canvas, and immediately see the updated state and pricing impact.

### Finding: Sink And Cooktop Entry Model

- Moraware behavior: Step 4 is an object-placement workflow. Users add sink/cooktop/cutout items from in-context menus, configure type/shape/cutout details, then place and adjust them on the counter.
- CRM behavior: Sink data exists in [MeasurementsCard.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx>) with `sinkType`, `shape`, `cutoutLengthIn`, `cutoutWidthIn`, `faucetHoleCount`, and `centerline`, and the canvas in [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>) can render sink rectangles if layout data exists. But Step 4 itself does not provide in-canvas creation, placement, or editing controls.
- Gap: The CRM stores sink metadata but does not yet offer CounterGo's placement-first editing flow.
- Fix requirement: Build Step 4 as an on-canvas placement mode with add-sink/add-cutout actions, local object editing, and visual placement tied to the piece geometry.
- Verification: A user can enter Step 4, add a sink/cooktop from the drawing surface, place it on a counter, set its options, and see it remain attached to the piece visually and in persisted data.

### Finding: Sinks Are Not Yet True Drawing Objects

- Moraware behavior: Sinks and cutouts are first-class drawing objects with move/rotate/duplicate/delete behavior and placement context relative to the countertop.
- CRM behavior: The canvas currently renders sinks from `layout.sinks`, but the visible code does not expose user-facing move/rotate/delete controls for those objects in Step 4. Sink creation and editing remain form-driven in `MeasurementsCard`.
- Gap: Our sink model is partially visualized but not yet interactive like Moraware's.
- Fix requirement: Promote sinks/cutouts from passive rendered overlays to interactive canvas objects with selection state, local actions, and geometry-aware placement tools.
- Verification: Users can select a sink on the canvas and manage it directly there, without dropping back into the measurement form section.

### Finding: Measurement Forms Preserve Data But Break CounterGo Flow

- Moraware behavior: The drawing editor is the primary place where geometric work is performed. Data entry follows the drawing rather than replacing it.
- CRM behavior: [MeasurementsCard.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx>) is comprehensive and useful as a data fallback, but it is currently the main way to work with pieces, edge segments, and sinks in detail.
- Gap: We have a solid structured fallback UI, but it currently carries too much of the primary workflow, which makes the experience feel unlike CounterGo.
- Fix requirement: Keep `MeasurementsCard` as an admin/fallback surface, but move the primary day-to-day countertop workflow into the drawing editor itself.
- Verification: A normal user can perform the core quote drawing workflow from the canvas-first interface, with the form-based measurement card becoming secondary rather than required.

### Finding: Color And Edge Is Still Placeholder-Only

- Moraware behavior: Step 5 manages area-level product/color/edge choices, alternate color options, area ordering, and slab/layout details as part of the drawing workflow.
- CRM behavior: [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>) shows a placeholder panel for `Area #1 Color & Edge` and `Price Details`, while actual area metadata editing happens earlier in the quote page's `Areas` card in [page.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/page.tsx>).
- Gap: The CRM stores area material/color/edge values, but Step 5 is not yet a real operating surface and the workflow is not tied to the editor.
- Fix requirement: Turn Step 5 into the primary place to manage area-specific product/color/edge options, including reordering and alternate options, while keeping data synchronized with quote areas.
- Verification: A user can stay inside the drawing editor to manage area color/edge decisions without backing out to a separate card above the canvas.

### Finding: Slab And Layout Workflow Is Missing

- Moraware behavior: Step 5 includes `Slabs & Layout` per area, slab counts, slab dimensions, and a layout concept tied to the chosen material.
- CRM behavior: The quote drawing canvas persists `CanvasLayout` for pieces and sinks, but there is no slab layout editing workflow in the quote UI. Slab inventory exists elsewhere in the product, not as part of CounterGo-like quote editing.
- Gap: CRM has layout persistence for piece positions but not Moraware's slab-selection and slab-layout workflow inside quote authoring.
- Fix requirement: Introduce a quote-area slab/layout mode in Step 5 that bridges quote drawing to slab planning, even if it initially reuses existing slab inventory primitives under the hood.
- Verification: A user can view and manage slab count/layout for a quote area from the drawing workflow itself.

### Finding: Price Details Is Separate Table UI, Not Integrated Quote-Step Flow

- Moraware behavior: Step 6 is a workflow mode inside the editor that keeps generated price lines, tax, discount, expiration, and manual edits in the same working context as the drawing.
- CRM behavior: Generated pricing exists in [PricingCard.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/PricingCard.tsx>) as a separate card below `Drawing` and `Measurements`, with table rows, `Generate`, and override forms. Tax/discount/price-list details are split between the quote info/pricing cards and the quote edit page.
- Gap: The CRM has important pricing primitives, but the user experience is page-fragmented rather than editor-integrated.
- Fix requirement: Pull generated pricing, override flows, price-list revision context, tax, discount, and expiration into Step 6 so pricing becomes the final stage of one continuous quote-building workflow.
- Verification: A user can move from drawing to pricing review without leaving the editor context or hunting across multiple cards/pages for quote-level settings.

### Finding: Generated Pricing Exists, But Step 6 Lacks Moraware's Area-Centric Review Rhythm

- Moraware behavior: Price Details shows generated lines grouped by area/room, with the room context still visually tied to the drawing workflow.
- CRM behavior: `PricingCard` already groups generated lines by area and supports overrides, which is a strong foundation, but it presents them as standard tables in a lower card and not as part of the six-step editor rhythm.
- Gap: The underlying data capability is closer here than in earlier steps, but the delivery still feels like a back-office table rather than CounterGo's final quote-building stage.
- Fix requirement: Reuse the existing generated-pricing model, but redesign presentation and flow so area pricing review feels like Step 6 of CounterGo instead of a detached reporting card.
- Verification: Office staff can review area-generated lines, missing-price warnings, and overrides in a mode that feels continuous with the drawing steps they just completed.

### Finding: Quote Detail Page Still Competes With The Editor Instead Of Handing Off To It

- Moraware behavior: The quote editor is the dominant workspace for quote-building tasks. Detail-level actions support it rather than competing with it.
- CRM behavior: In [page.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/page.tsx>), the quote page exposes `Areas`, `Measurements`, `Drawing`, `Generated Pricing`, `Line Items`, and `Notes` all as peer sections in one long page.
- Gap: This creates parallel quote-authoring models instead of one primary model. Users can enter overlapping data through several surfaces, which weakens Moraware-style muscle memory.
- Fix requirement: Decide that the drawing editor is the primary authoring surface for countertop quote work, then demote overlapping long-form sections to fallback, diagnostics, or admin views.
- Verification: A new countertop quote can be built start-to-finish through one dominant editor workflow without requiring users to bounce between multiple equal-weight sections.

### Finding: Toolbar Action Parity Is Incomplete

- Moraware behavior: The top editor bar prominently exposes `Help`, `Undo`, `Redo`, `Revisions`, `Save`, and `Exit` as first-class drawing-session actions.
- CRM behavior: [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>) exposes `Save Layout` and `Reset Layout`, but there is no editor-level `Help`, `Undo`, `Redo`, `Revisions`, or `Exit` model. Quote-level actions in [page.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/page.tsx>) live elsewhere and do not feel like one drawing session toolbar.
- Gap: The CRM lacks the session-control affordances that help users feel they are inside a controlled editor rather than a generic page card.
- Fix requirement: Add a true editor command bar with undo/redo stack support, revision entry point, explicit exit/back behavior, and contextual help.
- Verification: Users can recover mistakes and navigate the editor with the same confidence they have in CounterGo's session toolbar.

### Finding: Revision Model Is Missing From The User Experience

- Moraware behavior: Revisions are visible and top-level in the editor and quote flow. Emailing and printing are tied to the latest quote revision.
- CRM behavior: The API stores drawing revisions, and tests cover save/load revision history, but the web UI does not expose revision browsing or compare/history affordances in the quote editor.
- Gap: Revision data exists in part, but users cannot work with revisions as an everyday part of quote editing the way they can in Moraware.
- Fix requirement: Surface drawing revision history in the editor and connect quote communication flows to explicit latest-revision behavior.
- Verification: A user can see prior drawing revisions, understand which one is current, and print/email the correct revision from the quote workflow.

### Finding: Keyboard Hint Language Is Missing

- Moraware behavior: Tool buttons visibly include key hints like `N`, `Y`, `E`, `Z`, `J`, `K`, `L`, and `M`, reinforcing repeat-use speed.
- CRM behavior: The right rail in [DrawingCanvasInner.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx>) shows tool labels only, plus a small `Tool:` status line, but no user-facing shortcut language.
- Gap: The CRM misses part of the repeated-use rhythm that experienced users rely on to move quickly.
- Fix requirement: Add visible shortcut hints and, when appropriate, actual keyboard bindings for the main editor tools.
- Verification: The tool rail communicates both action name and shortcut identity in a way that feels familiar to CounterGo users.

### Finding: Quote-Level Communication Actions Are Still Simpler Than Moraware

- Moraware behavior: Quote workflows include print-template choice, email template choice, revision-aware emailing, preview paths, and drawing-aware output formats like `Drawing & Layout (no prices)`.
- CRM behavior: [page.tsx](</C:/Users/Lenovo 02/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/[id]/quotes/[quoteId]/page.tsx>) exposes `Download PDF`, `Email to Customer`, `Edit`, and `Send`, but not the richer print/email template and revision selection flow described in Moraware.
- Gap: CRM can communicate a quote, but the office workflow depth and output-choice behavior are still much shallower.
- Fix requirement: Expand print/email flows to include revision-aware output selection, drawing/no-drawing variants, and template-driven communication options closer to Moraware.
- Verification: Staff can choose the right quote output format and send path without leaving the quote workflow or using one generic PDF/email action for every case.

### Finding: Save Semantics Differ From CounterGo

- Moraware behavior: `Save` is part of the persistent top command set and belongs to the editor session as a whole.
- CRM behavior: The drawing card uses `Save Layout` while measurement edits, pricing generation, line items, and quote metadata each save in separate forms/cards.
- Gap: Users are managing many local save concepts instead of one coherent quote-editing session.
- Fix requirement: Move toward a clearer session model where editor work feels like one saved quote state, even if implementation remains incremental underneath.
- Verification: Users do not have to reason about whether they are saving the layout, a form row, or a different card; the workflow communicates one coherent editing state.

### Finding: Exit Behavior Is Not Yet Explicit

- Moraware behavior: `Exit` is a named editor command, which makes it clear that the user is leaving a dedicated editing mode.
- CRM behavior: The quote page has no dedicated editor exit control because the drawing is embedded within the larger detail page.
- Gap: Without an explicit editor boundary, the user never fully enters or exits a drawing mode comparable to CounterGo.
- Fix requirement: Introduce a dedicated quote editor route or mode with explicit exit/back semantics, rather than only embedding the drawing surface inside the quote detail page.
- Verification: A user can intentionally enter the quote editor, work inside it, and exit back to quote detail without ambiguity about mode changes.

## Executive Summary

Our CRM has the skeleton: customers, projects, quotes, line items, orders, payments, scheduled events, price lists, slabs, auth, dashboard, and portal quote responses.

Moraware has the operating model: countertop drawing, room/area breakdown, sink/cooktop/cutout placement, edge/splash rules, price generation from measurements, quote revisions, email/view tracking, job production templates, dispatch calendar, job forms, reports, saved views, exports, and admin configuration.

Main product gap:

- We can store a quote line like "Quartz, 42 sqft".
- Moraware can describe a kitchen: physical counter pieces, edge lengths, splash runs, sinks, faucet holes, material/color/edge by area, generated price lines, printable drawings, and downstream production activities.

## Current Stoneboyz CRM Baseline

Implemented or partially implemented:

- Customers, contacts, addresses, notes.
- Projects as lightweight work scopes.
- Quote header, status transitions, line items, basic quote areas, totals, PDF, email send path, public quote portal.
- Orders converted from accepted quotes, payment tracking, payment status.
- Scheduled events for appointments and shop jobs.
- Price lists and price list items.
- Slab inventory, project slab attachment, cut/remnant flow.
- Dashboard summary.
- Admin user roles.

Not implemented or too shallow:

- Countertop drawing or measure sheet.
- Physical kitchen pieces.
- Drawing revisions.
- Sink/cooktop placement and centerline.
- Edge-by-segment and splash-by-segment.
- Corner treatments: radius, clip, bump out, notch.
- Drawing-derived pricing.
- Quote email/view history and template system.
- File attachments by type.
- Full production jobs with job activities, checklists, forms, and issues.
- Dispatch calendar with role views, map, batch update, print packets, daily capacity totals.
- Saved/custom views, column chooser, exports.
- Global multi-entity search.
- Operational reports.
- Deep admin configuration.

## Moraware Navigation Model

CounterGo side:

- Quotes.
- Orders.
- Price Lists.
- Settings.
- Help.
- Systemize link.

Systemize side:

- Jobs.
- Calendar.
- Reports.
- Settings.
- Help.
- CounterGo link.

Shared patterns:

- Global search scoped to All, Accounts, Jobs, Leads, Quotes, Orders.
- Table views with Views, Customize, Save View, Export.
- Change Log on core objects.
- Create actions from list pages.

Our gap:

- We have static navigation and basic search/filter per page.
- We do not have global search, saved views, customizable table columns, or exports.

## Quotes And Drawing

Moraware quote detail includes:

- Quote info: name, status, expiration, price list, account, job, salesperson, custom fields, notes, payment terms.
- Quote address.
- Drawing revision with See All revisions.
- Quote summary: price list revision, total square footage, total price.
- Details breakdown by area/room.
- Files.
- Email history.
- Print, Email, Change Log.
- Create Job and Create Order actions.

Our gap:

- We have quote header and line items, but no revision history, no quote address, no salesperson field, no files, no email history table, no view tracking, no print template picker, no drawing revision.

## Moraware Drawing Editor

Moraware drawing editor has six steps:

1. Counter Dimensions.
2. Curves & Bumpouts.
3. Splash & Edge.
4. Sink & Cooktop.
5. Color & Edge.
6. Price Details.

Common toolbar:

- Help.
- Undo.
- Redo.
- Revisions.
- Save.
- Exit.
- Text.
- Page Break.
- Other Counter.
- Round To Nearest 1/16 inch.
- Zoom In.
- Zoom Out.
- Reset Zoom.
- Pan.

Step 1 - Counter Dimensions:

- Visual counter outlines.
- Dimension labels in inches.
- Multiple counters.
- Rotate, duplicate, delete counter.
- Edge length editing.
- Fast "save and next edge" workflow.
- New blank quote opens into this editor immediately after Save.
- `Other Counter` opens a structured `Add Counter` modal.
- `Add Counter` has a counter name, size entry rows, and a default counter size mode:
  - By sq ft.
  - By Measurement.
- The same modal contains additional counter details before the visual canvas is fully populated:
  - Splash height.
  - Splash length with unit inches or linear feet.
  - Edge #1 length with unit inches or linear feet.
- The modal has shortcuts for:
  - Add Curves & Bumpouts.
  - Add Splash & Edge.
  - Add Sinks & Cutouts.
  - Done.

Step 2 - Curves & Bumpouts:

- Corner and edge treatments.
- Radius.
- Clip.
- Bump out.
- Notch.
- None/standard.

Step 3 - Splash & Edge:

- Segment-level splash and edge state.
- 3 inch, 4 inch, 5 inch, other splash.
- Mitered edge.
- Waterfall.
- Finished edge.
- Appliance edge.
- Unfinished edge.
- Additional finished edge.

Step 4 - Sink & Cooktop:

- Sink/cooktop objects placed on counter.
- Sink model.
- Sink type: undermount, drop-in, farm.
- Shape: rectangle, oval, double, 60/40, 40/60, 70/30, 30/70.
- Cutout dimensions.
- Faucet hole count.
- Centerline: none, left, right.
- Rotate, duplicate, delete sink.
- In a blank test quote, `Add Sinks & Cutouts` opens a menu:
  - Sink Model.
  - Sink Cutout.
  - Cooktop Cutout.
  - Outlet Cutout.
- `Sink Model` submenu includes:
  - Custom Sink.
  - 1813.
  - 3018.
- `Custom Sink` form fields:
  - Quantity.
  - Name/model name.
  - Price.
  - Allow Discount.
  - Sink Type: Undermount, Drop-In, Farmer.
  - Shape: Rectangle, Oval, Double, 60/40, 40/60, 70/30, 30/70.
  - Cutout Dimensions: length x width.
  - Faucet Hole Count: 0 through 5.

Step 5 - Color & Edge:

- Areas/rooms.
- Product, color, edge per area.
- Slabs and layout per area.
- Add/reorder color options.
- Add/reorder areas.

Step 6 - Price Details:

- Price list revision.
- Tax.
- Discount.
- Expiration.
- Area-level generated price lines.
- Edit area.
- Add item.
- Manual miscellaneous item.
- Manual text item.
- Inline price override.

Our gap:

- We need a drawing/measure domain model before a canvas.
- The first useful version can be structured measurement entry plus generated preview.
- Full visual editing can come after data model, calculations, and pricing are stable.

## Quote Pricing Model

Moraware generates lines from drawing and price list:

- Material/slabs: quantity, material, color, slab count, unit price.
- Countertop square footage.
- Splash square footage.
- Fabrication square footage.
- Finished edge linear footage.
- Sink cutout count.
- Sink item count/model.
- Faucet hole count.
- Area subtotal.
- Quote total.

Our gap:

- Current quote line item is manually entered.
- No deterministic pricing engine links a measurement object to generated lines.
- No generated line metadata explains source object, price rule, quantity, unit, or price list revision.
- No override audit.

## Physical Pieces And Kitchen Field Measurement

Moraware can represent kitchen work as rooms/areas and counter shapes.

Required entities for us:

- Quote revision.
- Area/room.
- Counter piece.
- Edge segment.
- Corner treatment.
- Splash segment.
- Sink/cooktop cutout.
- Faucet hole group.
- Material/color selection.
- Slab layout/reservation link.
- Generated pricing line.

Field workflow we need:

1. User logs in on tablet/phone at house.
2. Opens customer/project/quote.
3. Adds area: Kitchen.
4. Adds piece/run: 100 in x 25.5 in.
5. Sets sink centered on the run, or offset from left/right.
6. Adds faucet holes.
7. Marks finished edge/splash.
8. Saves drawing revision.
9. Office sees generated sq ft, linear ft, cutout count, price lines, and printable drawing.

Our current answer to "how many pieces are in the kitchen":

- Unknown unless manually encoded as line items.
- We need explicit counter pieces to answer that.

## Orders

Moraware order list includes:

- Order name.
- Job name.
- Account.
- Sale date.
- Payment status.
- Total price.
- Square footage.
- Price list.

Moraware order detail includes:

- Order info and address.
- Payments.
- Drawing revision.
- Order summary/details.
- Files.
- Email history.
- Print, Email, Change Log.
- QuickBooks/export status.

Our gap:

- We have orders/payments, but no drawing revision, file/email history, QuickBooks/export status, print templates, or order area details.

## Production Jobs

Moraware jobs include:

- Job number.
- Job name.
- Account.
- Address and contacts.
- Salesperson.
- Creation date.
- Notes.
- Related quotes/orders.
- Files.
- Job activities.
- Forms.
- Phases.
- Issues.
- External users with access.

Job activities include:

- Template.
- Deposit.
- Material.
- Fabrication.
- Install.
- Invoice.
- Repair.
- Phone call.
- Email.
- Customer Pick-up.

Activity fields:

- Activity type.
- Status.
- Start date.
- Scheduled time.
- Duration.
- Assigned to.
- Notes.

Activity statuses:

- Auto-Schedule.
- Tentative.
- Confirmed.
- In Progress.
- Complete.
- Canceled.

Our gap:

- Projects are not production jobs yet.
- Scheduled events are generic and isolated.
- We lack job templates, activity dependencies, job forms, job issues, and production-specific pages.

## Calendar And Dispatch

Moraware calendar includes:

- Calendar views: standard, template, fabrication, install, customer pick-up.
- Filters by activity type and assignee.
- Color activities by activity type.
- Map.
- Multiple/batch update.
- Print.
- Appointment create.
- Date range controls.
- Daily total hours.
- Daily square footage totals by activity type.
- Calendar cards with job/account/address/activity/status context.

Our gap:

- We have scheduled events but no operational dispatch board.
- No fabrication/install/template views.
- No batch update.
- No map/route view.
- No print packets.
- No daily capacity totals.

## Reports

Moraware shared reports include:

- Installed sq ft by month.
- Jobs by salesperson.
- Month install square footage by week.
- Total sales by month.

Report builder supports:

- Time selection.
- Reporting date.
- Measure.
- Filters.
- Display fields.
- Table/bar chart.
- Export.

Our gap:

- We only have dashboard summary.
- We need fixed operational reports before custom report builder.

## Price Lists

Moraware price lists include:

- Revisions.
- Active/inactive status.
- Accounts with access.
- Units.
- Tax/payment defaults.
- Expiration days.
- Rounding.
- Duplicate.
- Change log.

Categories:

- Settings.
- Materials.
- Splash.
- Fabrication & Installation.
- Mitered Edges & Waterfalls.
- Finished Edges.
- Appliance Edges.
- Curves & Bumpouts.
- Cutouts.
- Sinks.
- Other Items.

Our gap:

- We have price lists and items, but need revisioned price rules per category with drawing/pricing semantics.
- Need customer/account price-list access.
- Need category-specific units and pricing behavior.

## Settings And Configuration

Moraware CounterGo settings:

- Account.
- Billing.
- QuickBooks Integration.
- Quote & Order.
- System.
- Users & Roles.

Moraware Systemize settings:

- Account.
- Billing.
- Calendar.
- Job.
- Shop.
- System.
- Users & Roles.

Important settings to copy conceptually:

- Measurement defaults: inches, round to nearest 1/16 inch, default counter depth 25.5 inches.
- Email templates.
- Quote/order forms.
- Payment terms.
- Payment methods.
- Tax codes and tax rates.
- Activity types/statuses.
- Assignees.
- Job templates.
- Job forms.
- Activity forms.
- Order area forms.
- Issue categories/forms.
- File fields/types.

Our gap:

- Admin area only covers users.
- Operational configuration is hardcoded or missing.

## Build Plan

### Phase 1 - Measure Sheet MVP

Goal: answer "how many kitchen pieces, dimensions, sink centerline, edge/splash" without full CAD.

Add:

- Quote revision table.
- Quote area/room enhancements.
- Counter pieces table.
- Edge segments table.
- Sink/cutout table.
- Faucet holes.
- Splash segments.
- Measurement defaults.
- Square-foot and linear-foot calculators.
- Quote UI tab: Measurements.
- Generated drawing preview from structured data.

Acceptance:

- Add Kitchen area.
- Add piece 100 x 25.5.
- Mark sink centered.
- Mark one finished front edge.
- Mark 4 inch back splash.
- See piece count, sq ft, edge linear ft, splash sq ft, sink/cutout count.

### Phase 2 - Pricing Generator

Goal: drawing data creates quote prices.

Add:

- Price rule categories.
- Price list revision snapshots.
- Generated quote lines.
- Source metadata per generated line.
- Manual misc/text lines.
- Price override with reason and audit.

Acceptance:

- Measurement creates material, fabrication, edge, splash, cutout, sink, faucet lines.
- Quote total is deterministic.
- User can explain every line from source measurement or manual item.

### Phase 3 - Visual Drawing Editor

Goal: tablet-friendly drawing after structured model works.

Add:

- Canvas/SVG drawing view.
- Edit edge length by clicking label.
- Add/duplicate/rotate/delete piece.
- Add/drag/rotate sink.
- Corner treatments.
- Undo/redo.
- Revision history.
- Print drawing layout.

Acceptance:

- User can field-measure a kitchen on tablet and save a revision without office cleanup.

### Phase 4 - Production Jobs

Goal: accepted quote becomes production job.

Add:

- Jobs module or promote Projects into Jobs.
- Job number.
- Job activities with type/status/date/time/duration/assignee.
- Activity dependencies.
- Job templates.
- Job checklist and order-area forms.
- Job issues.
- Files.

Acceptance:

- Accepted quote creates job with Template, Material, Fabrication, Install, Invoice.
- Fabrication can be tentative, confirmed, in progress, complete.
- Job page shows quote/order/areas/forms/schedule.

### Phase 5 - Dispatch Calendar

Goal: operate shop/install schedule.

Add:

- Calendar views by activity type.
- Filters by assignee/status.
- Batch update.
- Daily hours and sq ft totals.
- Map/route planning.
- Print packets.

Acceptance:

- Fabrication view shows daily workload by hours and square feet.
- Install view shows address, customer, status, crew, notes.

### Phase 6 - Admin, Reports, Views

Goal: manage business configuration and reporting.

Add:

- Operational settings.
- Email templates and PDF forms.
- File types.
- Payment/tax settings.
- Global search.
- Saved views/custom columns/export.
- Fixed reports first.
- Custom report builder later.

## Immediate Next Ticket

Build "Quote Measurements MVP":

- Domain calculators for rounding, sq ft, linear ft, splash sq ft, cutout counts.
- DB migrations for quote revisions, counter pieces, edge segments, sinks/cutouts, faucet holes, splash segments.
- API endpoints under quote detail.
- Web UI on quote detail: Measurements tab.
- Seed/demo quote with Kitchen area, two pieces, centered sink, faucet holes, finished edge, 4 inch splash.
- Browser verification on desktop and tablet-size viewport.

Started in code:

- `packages/domain/src/quotes/quote-measurements.types.ts`
- `packages/domain/src/quotes/quote-measurements.schemas.ts`
- `packages/domain/src/quotes/quote-measurements.ts`
- Unit tests for rounding, sq ft, linear ft, splash sq ft, sink/cutout/faucet counts, and invalid dimensions.

### Finding: Right rail is a mode-aware command palette, not just a button list

- Moraware behavior: The right rail changes by step, exposes single-key mnemonics on every command (`N`, `Y`, `E`, `Z`, `J`, `K`, `L`, `M` in Step 1; `I`, `F`, `H`, `G` in Step 5), and shows engaged states such as `Cancel Adding Text` when a tool is active. The rail is also collapsible from the workspace edge.
- CRM behavior: The drawing toolbar is a fixed list of React buttons in [`DrawingCanvasInner.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCanvasInner.tsx) with no keyboard hint language, no collapsed/expanded rail behavior, and only partial active-state wording.
- Gap: Our tool rail is functionally similar in spots, but it does not feel like CounterGo's mode system.
- Fix requirement: Rebuild the quote editor tool rail as a step-aware command palette with visible mnemonic badges, engaged/cancel states, and collapsible behavior so users see the same command language they expect from Moraware.
- Verification: In each matching step, the CRM rail must expose the same command set in the same location, show the same active/cancel wording, and preserve a compact collapsed state.

### Finding: Step 5 is an area/color authoring workflow, not a placeholder step

- Moraware behavior: `Color & Edge` is a real workflow page. It exposes `Add color option`, `Re-order color options`, `Add area`, and `Re-order areas` commands; each area has expandable `Color & Edge` and `Slabs & Layout` sections with inline edit/delete actions plus Product, Color, and Edge pickers.
- CRM behavior: Step 5 in the canvas currently does not open an equivalent area/color authoring workflow; pricing inputs and measurement data are still fragmented across lower cards and separate quote detail sections.
- Gap: Moraware treats Step 5 as the place where users structure area-level product/color/edge choices before pricing. Our CRM still treats this as missing or displaced functionality.
- Fix requirement: Implement a real Step 5 workspace with area accordions, color-option management, reorder flows, and embedded Product/Color/Edge selectors in the editor itself.
- Verification: A Moraware user should be able to open Step 5 in the CRM and manage areas/color options without leaving the editor or dropping into unrelated quote forms.

### Finding: Price Details is an inline pricing worksheet with diagnostics

- Moraware behavior: Step 6 shows `Price Settings` at the top with Price List revision, Tax, Discount, and Expires values, followed by area-level pricing rows and line-item math. Missing pricing is called out inline with specific messages like `No Price found for the material`, `No Price found for Fabrication`, and `No Price found for the "Eased" finished edge.` Totals and missing-price warnings remain in the same workspace.
- CRM behavior: Our CRM has generated pricing and line items, but they live as separate sections/cards rather than as a dedicated Step 6 worksheet anchored to the drawing editor. Missing-price diagnostics are not presented in the same guided CounterGo-style step.
- Gap: Moraware's pricing step is both a calculator and a debugging surface. Our pricing UI is more fragmented and less explanatory at the moment the user is finishing the quote.
- Fix requirement: Turn Step 6 into a full editor-native pricing worksheet with price settings, grouped area rows, inline missing-price diagnostics, subtotal/total presentation, and manual-item support in the same flow.
- Verification: Users should be able to finish a quote in the CRM's Step 6 and understand every missing or generated price without leaving the editor.

### Finding: Area structure remains visible during pricing and color selection

- Moraware behavior: In Step 5 and Step 6, the editor keeps `Area #1` style grouping visible and editable while the user assigns colors or reviews pricing. Area grouping is not hidden behind another page; it is part of the quote-building flow.
- CRM behavior: Area data exists, but our editor does not yet keep area grouping as the organizing spine for every downstream step inside the drawing workflow.
- Gap: Moraware continuously reinforces area-based mental models while our CRM still splits that model between cards, tabs, and editor state.
- Fix requirement: Make area grouping persistent across editor steps so drawing, color assignment, slab/layout, and price review all stay anchored to the same room/area structure.
- Verification: A user should see the same area names and nested content flow through the editor from dimensions to pricing without reorienting to another screen section.

### Finding: Moraware uses editor-step transitions as workflow gates

- Moraware behavior: Clicking the numbered step tabs changes the active tool set and the content region for that phase of quote authoring. The editor feels like a single wizardized workspace where each step owns a specific portion of the job.
- CRM behavior: We show the six numbered steps, but several steps are shallow placeholders and the rest of the functionality spills into cards below the canvas.
- Gap: Our stepper currently labels the intended workflow more than it enforces or delivers it.
- Fix requirement: Promote the stepper from visual navigation to the actual workflow container, with each step owning its controls, data entry, and validation surface.
- Verification: The CRM stepper should be sufficient for end-to-end quote authoring, with lower supporting forms becoming secondary rather than primary.

### Finding: Step 2 exposes corner-by-corner treatment markers on the canvas

- Moraware behavior: In `Curves & Bumpouts`, the drawing overlays `-Std-` markers directly at each editable corner/transition. The user can work from the shape itself and treat corners individually without leaving the canvas. The same dimensioned geometry remains visible while special corner logic is added.
- CRM behavior: In [`DrawingCanvasInner.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCanvasInner.tsx), Step 2 only swaps the label text to `-Std-` on the rendered piece. There are no per-corner hit targets, no treatment menus, and no step-specific editing flow behind those markers.
- Gap: Our CRM copies the visual hint but not the actual interaction model.
- Fix requirement: Add true corner-level affordances in Step 2 so each corner marker is selectable and opens the corresponding treatment flow (`Radius`, `Clip`, `Bump Out`, `Notch`, `None`) from the canvas.
- Verification: A user should be able to move around the piece corner by corner in the CRM and assign treatments from on-canvas markers exactly as they do in Moraware.

### Finding: Step 2 keeps dimensional context while editing corner treatments

- Moraware behavior: The full shape remains dimensioned while corner markers are displayed, so the user edits bumpouts/curves with the surrounding measurements still in view.
- CRM behavior: Step 2 still shows a dimensioned shape, but because treatment editing is missing, the dimensions are passive decoration rather than context for a live geometry-editing workflow.
- Gap: Visual parity exists in part, but workflow parity is missing; the measurements do not support any actual corner-edit action.
- Fix requirement: Preserve dimension lines during Step 2 editing and connect them to live corner-treatment updates so special geometry changes remain readable while being authored.
- Verification: Applying a corner treatment in the CRM should leave the user inside the same dimensioned editing context rather than kicking them into a separate form flow.

### Finding: Step 3 uses edge-level treatment markers, not generic piece labels

- Moraware behavior: In `Splash & Edge`, the canvas replaces corner markers with per-edge treatment labels such as `F`, repeated along each relevant segment. This tells the user edge treatment is assigned segment by segment from the drawing.
- CRM behavior: The CRM currently flips the piece label text to `F` when `activeStep === 3` in [`DrawingCanvasInner.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCanvasInner.tsx), but it does not create real segment-level interactive markers or a Moraware-style edge editing path.
- Gap: We simulate the visual shorthand but not the segment-specific editing model Moraware teaches users to expect.
- Fix requirement: Render true edge markers/segments in Step 3 and attach splash/finished-edge actions to those segments directly on the canvas.
- Verification: A user should be able to identify and edit each edge treatment from the drawing surface itself, with the same marker logic Moraware shows.

### Finding: Step 3 must be canvas-first even if forms still exist underneath

- Moraware behavior: `Splash & Edge` remains a drawing task. The right rail stays focused on drawing/navigation tools while the real work happens by interacting with the countertop edges in the canvas.
- CRM behavior: Edge and splash data entry is still centered in [`MeasurementsCard.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/MeasurementsCard.tsx) through `EdgeSegmentForm`, `Save Edge`, and `Add Edge` forms.
- Gap: Our primary workflow is still form-first, while Moraware's is drawing-first.
- Fix requirement: Demote edge/splash forms to support or audit roles and make Step 3 canvas interaction the primary authoring path.
- Verification: Most users should be able to finish edge/splash authoring from the drawing without scrolling into the Measurements card.

### Finding: Step 4 preserves drawing context and turns sinks into a placement task

- Moraware behavior: `Sink & Cooktop` keeps the dimensioned counter layout visible and uses the same editor shell while sink/cooktop placement becomes the active task. The user stays inside the drawing rather than switching to a separate records list.
- CRM behavior: The CRM can render sink overlays on selected pieces in [`DrawingCanvasInner.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCanvasInner.tsx), but sink creation and editing are still driven primarily by `SinkCutoutForm`, `Save Sink`, and `Add Sink` in [`MeasurementsCard.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/MeasurementsCard.tsx).
- Gap: We display sinks, but the task model is still CRUD-form-based instead of canvas-placement-based.
- Fix requirement: Build a real Step 4 sink/cooktop placement workflow where cutouts are created, positioned, and edited from the drawing surface, with forms becoming secondary detail editors if needed.
- Verification: A Moraware user should be able to enter Step 4 in the CRM and place/edit sinks and cooktops without relying on the lower measurements forms.

### Finding: The same tool rail carries through Steps 2-4 while the canvas semantics change

- Moraware behavior: Steps 2, 3, and 4 keep nearly the same surrounding shell and right-rail navigation tools, but the meaning of clicking on the canvas changes by step: corners in Step 2, edge treatments in Step 3, sink/cooktop placement in Step 4.
- CRM behavior: Our editor changes labels by step, but the underlying canvas interaction model does not yet transform deeply enough between these phases.
- Gap: Moraware teaches users that the numbered step changes what the drawing itself is editable for. Our CRM still has one mostly-shared interaction model with light cosmetic step changes.
- Fix requirement: Make each editor step switch the active canvas grammar, not just the captions, so clicks and selections do different work depending on the step.
- Verification: Users should feel that Step 2, Step 3, and Step 4 are distinct editing modes in the same workspace, just as they do in CounterGo.

### Finding: Corner treatment menu is a lightweight on-canvas picker, not a detached form

- Moraware behavior: Clicking a `-Std-` corner marker opens a compact floating menu beside that exact corner with `Radius...`, `Clip...`, `Bump Out...`, `Notch...`, and `None`. The menu appears directly over the drawing, keeping the user's attention on the corner they are editing.
- CRM behavior: Step 2 in [`DrawingCanvasInner.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCanvasInner.tsx) does not expose any comparable context menu from corner markers.
- Gap: Moraware's first interaction is immediate, local, and lightweight; ours has no equivalent on-canvas picker.
- Fix requirement: Implement a floating corner menu anchored to the clicked marker with the same treatment choices and a direct `None` option.
- Verification: Clicking a corner marker in the CRM should open the treatment picker at the marker location without sending the user to a lower form.

### Finding: Radius editing uses a modal with one field and a live corner preview

- Moraware behavior: Choosing `Radius...` opens `Edit Corner - Radius`, a focused modal with a single `Radius` field, inch units, a default value of `4`, and a miniature shape preview highlighting the active corner. `Save` confirms the change.
- CRM behavior: No radius dialog exists in the editor today.
- Gap: Moraware teaches the corner edit with a compact, visual, single-purpose dialog; our CRM has nothing parallel yet.
- Fix requirement: Add a radius dialog for Step 2 with one numeric field, inch units, preview artwork that highlights the edited corner, and a simple save action.
- Verification: The CRM radius dialog should open from the corner menu, default sensibly, preview the active corner, and save without leaving the editor workspace.

### Finding: Edge Length dialog is the primary dimension editor, not a form section

- Moraware behavior: Clicking a displayed measurement opens an `Edge Length` modal directly from the drawing. The modal has a single `Length` field, inch units, and a miniature shape preview with the active segment highlighted.
- CRM behavior: Piece and edge dimensions are still edited mainly through saved forms in [`MeasurementsCard.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/MeasurementsCard.tsx), while the canvas itself lacks this Moraware-style edge modal flow.
- Gap: Moraware uses the drawing label as the entry point for dimension edits; our CRM still relies on below-the-fold forms for most edits.
- Fix requirement: Make edge labels clickable in the drawing and open an `Edge Length` modal with a single length field plus visual preview.
- Verification: Users should be able to change a dimension from the on-canvas label without touching the Measurements card.

### Finding: Save and Next Edge truly walks the user around the shape

- Moraware behavior: `Save & Next Edge` does not just save the number; it advances the highlighted segment in the miniature preview to the next edge and updates the field value to that next edge's length. In the observed flow, the dialog advanced from `85 9/16` on the top edge to `25` on the adjacent vertical edge.
- CRM behavior: No equivalent guided edge-walk interaction exists today. Users edit pieces and edges independently through forms or resize handles.
- Gap: This is a major muscle-memory feature. Moraware turns dimension entry into a guided sequence around the counter, while our CRM makes it a scattered editing task.
- Fix requirement: Recreate `Save & Next Edge` as a true sequential edge-entry workflow that advances focus, preview highlight, and field value around the selected piece.
- Verification: Starting from one edge in the CRM, repeated `Save & Next Edge` actions should walk the user around the same piece in a predictable order with updated highlights and values.

### Finding: Angle feedback remains visible during dimension editing

- Moraware behavior: While the `Edge Length` dialog is open, the underlying drawing still shows angle annotations such as `90°` at the interior turns of the piece. This reinforces the geometric context while the user edits one edge at a time.
- CRM behavior: The CRM drawing does not yet surface Moraware-style angle annotations during chained shape editing or dimension entry.
- Gap: Moraware combines linear measurements and turn-angle awareness in the same editing context; our CRM currently lacks the angle side of that guidance.
- Fix requirement: Add turn-angle annotations to the drawing/editor for non-rectangular shapes and preserve them during edge-edit workflows.
- Verification: L- and Z-shaped counters in the CRM should show turn angles in the canvas while edge dimensions are being reviewed or edited.

### Finding: Revisions are browseable and revertable from the editor shell

- Moraware behavior: `Revisions` opens a `Revert to Quote Revision` modal inside the editor. The modal lists revision number, created timestamp, created by, notes, and exposes a `Revert to Revision` action from the same surface.
- CRM behavior: The CRM API and tests support drawing revisions, but the web editor only loads the latest revision in [`DrawingCard.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCard.tsx) and saves via [`saveDrawingAction`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/_actions.ts). No revision browser or revert UI is exposed.
- Gap: Moraware makes revision history part of the drawing workflow; our CRM keeps revision capability hidden behind the API.
- Fix requirement: Add an editor-visible revision browser with revision metadata and revert/restore actions anchored to the top toolbar.
- Verification: Users should be able to inspect prior revisions and restore one without leaving the quote editor.

### Finding: Save creates a named quote revision, not just a layout persistence event

- Moraware behavior: `Save` opens `Save Quote`, prompts for `Notes about this revision`, and offers both `Save & Continue` and `Save`. Saving is framed as creating a revision, not merely persisting a canvas position.
- CRM behavior: The editor currently exposes `Save Layout` in [`DrawingCanvasInner.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCanvasInner.tsx), which posts layout data but does not ask for revision notes or present Moraware-style dual save actions.
- Gap: Our save semantics are too technical and too narrow. Moraware saves quote revisions with human context.
- Fix requirement: Replace `Save Layout` with revision-oriented save UI that captures optional notes and supports staying in the editor after saving.
- Verification: Saving in the CRM should feel like saving a quote revision, with note capture and post-save behavior matching CounterGo.

### Finding: Exit is guarded by an unsaved-changes dialog

- Moraware behavior: `Exit` triggers an `Unsaved Changes` modal when the editor is dirty. The message explicitly warns that changes will be lost and offers `Discard Changes & Continue`.
- CRM behavior: The CRM drawing is embedded in the quote detail page and exposes no equivalent explicit exit guard from the editor shell.
- Gap: Moraware protects the user from accidentally leaving the editor, while our CRM currently lacks that workspace-level safety behavior.
- Fix requirement: Introduce a true editor exit action with dirty-state tracking and an unsaved-changes confirmation dialog.
- Verification: Attempting to leave the CRM editor with unsaved changes should show a confirmation modal before navigation/reset occurs.

### Finding: Step 3 edge menu combines splash presets and edge-finish choices in one local menu

- Moraware behavior: Clicking an `F` marker in `Splash & Edge` opens one local menu containing splash presets (`3" Splash`, `4" Splash`, `5" Splash`, `Other Splash...`) and edge-treatment options (`Mitered Edge`, `Waterfall`, `Finished Edge (Eased)`, `Appliance Edge`, `Unfinished Edge`, `Additional Finished Edge...`). The current treatment is checkmarked in the same menu.
- CRM behavior: Edge treatment and splash height are entered separately in `EdgeSegmentForm` inside [`MeasurementsCard.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/MeasurementsCard.tsx); Step 3 in the canvas does not expose a unified local menu at all.
- Gap: Moraware compresses a whole edge-treatment decision tree into one contextual menu. Our CRM splits that work into form rows and fields.
- Fix requirement: Implement a segment-level contextual menu in Step 3 that combines splash presets and edge-finish choices, including checkmarks for the active state.
- Verification: Clicking an edge marker in the CRM should open one menu with splash and finish options together, mirroring Moraware's menu structure.

### Finding: Other Splash opens a dedicated height dialog with preview

- Moraware behavior: Choosing `Other Splash...` opens a `Splash Height` modal with a single `Height` field, inch units, a default value of `4`, and a miniature preview of the selected segment.
- CRM behavior: The CRM stores `splashHeightIn` on edges, but editing happens through generic form controls in [`MeasurementsCard.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/MeasurementsCard.tsx) rather than from a canvas-anchored modal.
- Gap: Moraware makes custom splash entry a focused branch of the edge menu; our CRM keeps it as a plain field in a broader form.
- Fix requirement: Add a `Splash Height` modal in Step 3 that opens from the edge menu and previews the selected segment.
- Verification: Selecting `Other Splash` in the CRM should open a dedicated height dialog with the same one-field workflow.

### Finding: Additional Finished Edge mutates edge labels on the canvas immediately

- Moraware behavior: Choosing `Additional Finished Edge...` updates the edge markers from generic `F` labels to differentiated labels such as `F1` and `F2`, showing that multiple finished-edge assignments are now being tracked visually on the same piece.
- CRM behavior: Step 3 in [`DrawingCanvasInner.tsx`](C:/Users/Lenovo%2002/Documents/ESP/Programing/stoneboyz_crm/stoneboyz_crm/apps/web/src/app/customers/%5Bid%5D/quotes/%5BquoteId%5D/DrawingCanvasInner.tsx) renders only a single generic `F` label and has no visual numbering or multi-edge assignment model.
- Gap: Moraware visually escalates edge-label complexity as the treatment model becomes more complex; our CRM cannot represent that state yet.
- Fix requirement: Support multiple finished-edge groups/assignments and reflect them directly in the canvas labels (for example `F1`, `F2`) as users add more edge treatments.
- Verification: Adding additional finished-edge assignments in the CRM should update the canvas labels immediately and distinctly.

### Finding: Moraware surfaces drawing auto-correction warnings at the quote-detail level

- Moraware behavior: After leaving the editor with a problematic drawing state, the quote detail page can show a `Drawing Auto-Corrected` modal stating that errors were detected and automatically corrected in the drawing, and instructing the user to edit the drawing and save a new revision to make the fixes permanent.
- CRM behavior: The CRM does not currently expose any comparable drawing-integrity warning or auto-correction feedback on the quote detail page or in the editor shell.
- Gap: Moraware has a defensive layer for malformed drawing states and communicates the recovery workflow to the user. Our CRM has no visible equivalent yet.
- Fix requirement: Add drawing validation/recovery feedback and expose a clear warning when the system repairs or rejects inconsistent geometry, along with guidance to save a clean revision.
- Verification: If the CRM detects or repairs invalid drawing geometry, the user should see a clear, non-silent warning and know how to persist the corrected state.

### Finding: Quote detail can surface pricing-calculation failure independently of editor state

- Moraware behavior: The quote detail page can show a top-level alert such as `There was an error calculating the Quote amount. Please contact Moraware support.` while still showing quote info, drawing revision, and summary sections.
- CRM behavior: The CRM pricing flow shows generated tables and missing-price gaps, but it does not yet expose a comparable quote-level hard-failure banner for pricing-calculation integrity issues.
- Gap: Moraware distinguishes between missing prices, drawing corrections, and outright quote-calculation errors with explicit messages. Our CRM currently has less differentiated failure communication.
- Fix requirement: Add a quote-level pricing error state distinct from normal missing-price diagnostics, with clear user-facing messaging and operator next steps.
- Verification: Fatal pricing-calculation failures in the CRM should display a durable banner or status panel separate from ordinary line-item warnings.

### Audit note: Step 4 live object parity remains sample-dependent

- Observation: The current Moraware sample quote did not include a live sink/cooktop object with an exposed on-canvas interaction menu to manipulate during this session.
- What we still know: Step 4 is clearly intended as a canvas-placement workflow, and the CRM remains form-first in this area based on code inspection and prior Moraware notes.
- What remains desirable: A future audit pass against a sink/cooktop-rich Moraware sample would tighten the last object-specific micro-interactions such as move/rotate/delete or model-selection branches.

## Live Notes - 2026-05-18 (User-Guided Drawing Parity)

Context:

- Live paired session comparing Stoneboyz CRM drawing workspace with Moraware CounterGo.
- Stoneboyz URL: `http://localhost:3000/customers/363cb212-d857-4b88-abce-e08d1a095363/quotes/5bffdf65-1a7b-4d8d-ba0c-7d680b4146df/drawing`.
- Moraware URL: `https://stoneboyz.moraware.net/go/editquote/1570`.

### Finding: Chained Lower Run Extends Wrong Direction

- Moraware behavior: In Counter Dimensions, the user can draw a chained counter path that goes right, turns down, then continues further right to create the lower run.
- CRM behavior: The Stoneboyz drawing created the top run and down leg, but did not extend the lower run to the right in the same way. Code inspection showed `buildPreview` measured the lower run as a return from the farthest X position instead of a continuation from the vertical turn point.
- Gap: CRM breaks the user's CounterGo muscle memory for L/Z-style chained drawing because the lower segment does not follow the same directional continuation.
- Fix requirement: Anchor the lower-run tail at the first vertical turn and measure it in the same horizontal direction as the initial run.
- Verification: Draw right, down, right in Step 1. The preview and saved shape should include a top run, vertical leg, and lower right extension.

### Finding: Multi-Turn Chained Counter Should Stay One Piece

- Moraware behavior: CounterGo draws a single continuous counter surface. It does not show internal orange seams between runs, and after the drag passes the 25 1/2 inch counter depth, the user can turn again into the next right/left or up/down run.
- CRM behavior: Stoneboyz preview rendered each run as a separate stroked rectangle, creating visible orange split lines. The draw model only persisted L/Z-style shapes, so it stopped after one lower run instead of supporting repeated stair-step turns.
- Gap: The CRM still looked like multiple joined blocks and could not keep walking the path through repeated depth-threshold turns the way Moraware does.
- Fix requirement: Render the preview/saved surface as one union outline and persist a generic chained segment shape for multi-turn paths.
- Verification: Draw a path that goes right, down, right, down, right. The CRM should show one filled counter outline with no internal orange seams and all repeated turns preserved.

## Live Notes - 2026-05-20 (User Recording Review)

Source:

- User-recorded Moraware CounterGo videos saved under `output/moraware-recordings`.
- Contact sheet generated at `output/moraware-recordings/frames/contact-sheet.jpg`.

### Finding: Finished Drawing Uses Perimeter Segment Dimensions

- Moraware behavior: Finished project drawings show dimension labels directly on the perimeter of each visible segment, including chained turns and complex connected runs.
- CRM behavior: The canvas had labels for simple rectangular pieces and partial labels for chained shapes, but compound outlines did not consistently label every visible perimeter segment.
- Gap: Complex drawings looked less like the recorded CounterGo output, especially on multi-turn shapes.
- Fix requirement: Render dimension labels for every boundary segment on L, Z, and chained counter shapes, with labels placed outside the piece perimeter and clickable from the drawing surface.
- Verification: Complex compound counters show repeated perimeter labels across all visible segments, not only one length/depth pair.

### Finding: Tool Rail Shortcut Rhythm

- Moraware behavior: The right tool rail shows repeated-use shortcut hints beside tools such as text, page break, other counter, rounding, zoom, reset, and pan.
- CRM behavior: The right rail had matching tool names but no shortcut hints and no keyboard handling for those hints.
- Gap: Experienced users lose part of CounterGo's fast repeat-use rhythm.
- Fix requirement: Show shortcut hints on the right rail and wire matching keyboard shortcuts when focus is not inside a form field.
- Verification: Right rail displays shortcuts, and pressing `N`, `Y`, `E`, `Z`, `J`, `K`, `L`, or `M` triggers the matching tool action.

### Finding: Chained Resize Must Preserve Connected Runs

- Moraware behavior: In the user recording from 2026-05-20, editing a chained/L-shaped counter dimension keeps the drawing as one connected counter surface; the downstream leg slides with the changed edge and does not separate from the shared corner.
- CRM behavior: The chain segment resize logic updated the edited segment size, but its downstream-shift threshold could miss the attached perpendicular segment at the overlap-depth corner, leaving connected runs visually separated.
- Gap: Resizing a chained counter could break the one-piece CounterGo feel and make a continuous run look like disconnected pieces.
- Fix requirement: When a chain segment dimension changes, detect whether the neighboring segment is attached to the edited segment's start or end and move the downstream connected segments from that shared corner.
- Verification: Draw a right/down/right chained counter, click a perimeter dimension, enter a new length, and save. The vertical/downstream run should remain connected to the edited segment with no gap.
