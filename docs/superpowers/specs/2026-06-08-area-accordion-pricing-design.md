# Area-Accordion Pricing Design (2026-06-08)

## Question this answers

How can an office worker price a quote without the current pile of steps
(Save Setup + per-area Generate + Generate Final Price + per-line overrides)?

A throwaway prototype (`apps/web/src/app/prototype/pricing`, four layouts) was
built to feel out the experience. The chosen layout is **v4 — Area accordion**.

## Verdict (chosen design)

Pricing happens **one area at a time, in an accordion**:

1. The quote shows a list of areas (Sheets), each collapsed.
2. The user opens one area. It expands into a single panel with every pricing
   choice for that area, sourced from the Pricing Catalog: **Material, Edge,
   Fabrication, Splash, Sink, Faucet Holes**.
3. A **live estimate** updates as the user picks (rate x drawing-derived
   quantity), so the money is visible before committing.
4. The user presses **Save area**. This persists that area's selections **and**
   generates that area's frozen price lines in one action. The row collapses to a
   summary (area total + done check), and the next unsaved area opens.
5. A sticky footer shows "X of N areas saved" and the running Grand Total.

This replaces three scattered actions (Save Setup, per-area Generate, Generate
Final Price) with **one per-area action**. Per-line price overrides remain as an
optional advanced control, not part of the main flow.

## Key decision: Sink + Faucet move per-area

Today the data model keeps Sink and Faucet Holes at the **whole-quote** level
(`quote_pricing_selections.sink_item_id`, `faucet_hole_item_id`). The accordion
puts them **inside each area**, because a kitchen and a bath have different sinks
and faucet counts. So Sink and Faucet Hole selection becomes **per-area**.

This is the reason the build is more than a UI change: it touches the database,
the API, and the domain types, not just the screen.

## Data model change

Add two nullable columns to the existing per-area selection table:

```
quote_area_pricing_selections
  + sink_item_id        uuid NULL REFERENCES price_list_items(id) ON DELETE SET NULL
  + faucet_hole_item_id uuid NULL REFERENCES price_list_items(id) ON DELETE SET NULL
```

- New migration file (append-only; never edit an existing migration).
- The quote-level `sink_item_id` / `faucet_hole_item_id` columns are left in place
  but become **legacy/unused** for new pricing. Dropping them is a separate,
  later change — not part of this PR.

## Generation rule (per area)

When an area is saved, its frozen price lines are produced as
`selected item rate x drawing-derived quantity` for that area:

| Selection      | Quantity source (per area)        |
| -------------- | --------------------------------- |
| Material       | combined square footage           |
| Fabrication    | combined square footage           |
| Edge           | finished-edge linear footage      |
| Splash         | splash square footage             |
| Sink           | sink count                        |
| Faucet Holes   | faucet-hole count                 |

Lines with a zero rate or zero quantity are skipped. Generated lines stay frozen
until the area is saved again (consistent with the 2026-06-04 pricing design).

## Approach

Reuse the existing generation engine; do not rewrite the money math. The work is:
move sink/faucet to per-area storage, teach generation to read sink/faucet from
the per-area selection, and replace the `PricingCard` UI with the accordion whose
per-area Save calls one combined action (save this area's selections + generate
this area).

## Non-goals

- No change to the drawing workspace or measurement math.
- No automatic repricing of sent/accepted quotes.
- No dropping of the legacy quote-level sink/faucet columns in this PR.
- No new catalog item types (tear-out, delivery, etc.) — Admin Item already
  covers special charges and is out of scope here.

## Testing focus

- A saved area generates a sink line from the **area's** sink selection and the
  area's drawing sink count (not the quote-level value).
- A saved area generates a faucet line from the area's faucet selection + count.
- Material/Edge/Fabrication/Splash lines still generate per area as before.
- Saving one area does not change another area's frozen lines.
- Zero rate or zero quantity produces no line.

## Prototype disposition

`apps/web/src/app/prototype/pricing` is throwaway. Delete it once the real
accordion `PricingCard` lands.
