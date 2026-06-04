# Price Catalog And Quote Pricing Selections Design

## Context

Applying one full Price List to a quote pushes the team toward creating a custom Price List for every customer or job. That is not the intended countertop workflow. The company should maintain reusable pricing choices by group, then each quote should select the right items while drawing-derived measurements supply the quantities.

Drawings and measurements stay separate from pricing. The drawing produces square footage, finished-edge linear footage, sink count, faucet-hole count, and related totals. Salespeople choose which reusable Price Items apply to the quote or Sheet.

## Goals

- Maintain reusable pricing by Price Group: Material, Fabrication, Edge, Sink, Faucet Hole, Splash, and future groups.
- Let a quote select Price Items from those groups instead of selecting one whole Price List.
- Let each Sheet choose its own Material and Edge items.
- Let quote-level Fabrication apply by default, with Sheet overrides when needed.
- Let Sink and Faucet Hole pricing use drawing-derived counts, with manual quantities only when drawing data is missing or intentionally overridden.
- Generate quote price lines from `selected Price Item rate * drawing-derived quantity`.

## Non-Goals

- Full inventory management.
- Drawing workspace changes.
- Automatic repricing of sent or accepted quotes.
- Multiple Material or Edge selections on the same Sheet.

## Domain Model

### Pricing Catalog

The company-wide collection of reusable pricing choices. It is organized by Price Group so the team can maintain materials, edges, fabrication, sinks, and other prices independently.

### Price Group

A family of pricing choices:

- Material
- Fabrication
- Edge
- Sink
- Faucet Hole
- Splash

Each group defines quote-selection behavior.

### Price List

A reusable list inside one Price Group, such as a Material Price List, Edge Price List, or Sink Price List. A quote does not apply one full Price List; it selects Price Items from the relevant groups.

### Price Item

A selectable charge inside a Price Group. Examples:

- Material -> Uba Tuba
- Edge -> Bullnose
- Fabrication -> Retail Fabrication
- Sink -> 70/30 Sink

Each item has:

- group
- name
- charge method
- measurement basis
- rate
- active/hidden status
- optional sort order

### Quote Pricing Selection

The selected Price Items for a quote.

Sheet-level selections:

- one Material item per Sheet
- one Edge item per Sheet
- optional Fabrication override per Sheet

Quote-level selections:

- one default Fabrication item
- zero or more Sink items
- Faucet Hole item when applicable
- optional Splash item when charged separately

## Quantity Source

Pricing quantity comes from drawing-derived measurements whenever possible.

| Price Group | Typical Measurement Basis | Quantity Source |
| --- | --- | --- |
| Material | combined square footage or countertop square footage | Sheet measurement totals |
| Fabrication | combined square footage or countertop square footage | Quote total or Sheet total |
| Edge | finished-edge linear footage | Sheet edge measurements |
| Sink | sink count | Drawing sink count or selected quantity |
| Faucet Hole | faucet-hole count | Drawing faucet-hole count |
| Splash | splash square footage or backsplash square footage | Sheet measurement totals |

Generated line formula:

```text
selected item rate * drawing-derived quantity = line total
```

## Quote UI

The quote pricing screen should show a pricing setup panel before generation.

For each Sheet:

- Material selector
- Edge selector
- optional Fabrication override
- read-only measurement preview: square footage and finished-edge linear footage

For the quote:

- default Fabrication selector
- Sink item selector with count from drawing
- Faucet Hole selector with count from drawing
- Generate Pricing button

The user should see where the quantity came from, for example:

```text
Kitchen / Uba Tuba / 42.5 sq ft * $18 = $765
Kitchen / Bullnose / 18.0 LF * $14 = $252
70/30 Sink / 2 each * $150 = $300
```

## Pricing Generation

Generated price lines remain frozen after creation. If a Price Item rate changes later, existing generated lines do not change until the Salesperson regenerates pricing on a draft quote.

Generation steps:

1. Read quote pricing selections.
2. Read drawing-derived measurement totals for each Sheet.
3. Resolve selected Price Items.
4. Multiply each selected item's rate by its matching measurement basis.
5. Replace draft generated price lines for that quote/Sheet.

## Migration From Current Implementation

Current implementation already added item groups, charge methods, measurement bases, and catalog IDs to `price_list_items`. Keep those fields, but stop treating `quote.priceListId` as the whole pricing answer.

Next implementation slice:

- Add quote pricing selection persistence.
- Add quote pricing setup UI.
- Generate price lines from selections, not first item found by category.
- Keep current `priceListId` temporarily for compatibility, but treat it as legacy until replaced.

## Validation

- Material selection is required per Sheet before material pricing can generate.
- Edge selection is required per Sheet before edge pricing can generate.
- Edge items must use linear-foot charge method.
- Sink items can use drawing sink count or explicit selected quantity.
- Measurement basis must match charge method.
- Generated pricing requires drawing-derived quantities greater than zero.

## Testing

Cover these behaviors:

- Quote can select different Material items on different Sheets.
- Quote can select different Edge items on different Sheets.
- Fabrication default applies to all Sheets unless a Sheet override exists.
- Material line uses selected Sheet square footage.
- Edge line uses selected Sheet finished-edge linear footage.
- Sink line uses drawing sink count.
- Existing generated lines stay unchanged after catalog item rate edits until regeneration.
