# Price Catalog And Quote Pricing Selections Design

## Context

Applying one full Price List to a quote pushes the team toward creating a custom Price List for every customer or job. That is not the intended countertop workflow. The company should maintain reusable pricing choices by group, then each quote should select the right items while drawing-derived measurements supply the quantities.

Drawings and measurements stay separate from pricing. The drawing produces square footage, finished-edge linear footage, sink count, faucet-hole count, and related totals. Salespeople choose which reusable Price Items apply to the quote or Sheet.

## Goals

- Maintain reusable pricing by Price Group: Material, Fabrication, Edge, Sink, Faucet Hole, Splash, and future groups.
- Keep normal Price Item creation simple: name and price only for known countertop groups.
- Put unusual pricing behavior behind an Admin Item path instead of exposing advanced math to every salesperson.
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

### Preset Price Item Creation

Known countertop groups use fixed pricing rules. A Salesperson should not choose measurement basis, charge method, item type, or backend category when creating these items.

Preset create forms:

| Price Group | Visible Fields | Hidden Rule |
| --- | --- | --- |
| Material | name, price | combined square footage at dollars per square foot |
| Fabrication | name, price | combined square footage at dollars per square foot |
| Edge | name, price | finished-edge linear footage at dollars per linear foot |
| Sink | name, price | sink count at dollars each |
| Faucet Hole | name, price | faucet-hole count at dollars each |
| Splash | name, price | splash square footage at dollars per square foot |

Backsplash square footage is part of normal Material square footage. It should not appear as a separate material creation option. Splash stays available because the business may charge special splash work, such as full backsplash, as its own selected item.

### Admin Item

Admin Item is the escape hatch for unusual charges. It can expose advanced fields because the system cannot infer the math from a known group.

Admin Item can include:

- name
- group or custom category
- charge method: square foot, linear foot, or each. Flat price is future work until the Admin Item charge-method enum supports `flat_price`.
- measurement basis when relevant
- price
- quote visibility

Normal Salesperson setup should use preset groups first. Admin Item is for special work such as demolition, delivery, brackets, sealer, special finish, or other charges that do not fit the known countertop groups.

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
| Material | combined square footage | Sheet measurement totals |
| Fabrication | combined square footage | Quote total or Sheet total |
| Edge | finished-edge linear footage | Sheet edge measurements |
| Sink | sink count | Drawing sink count or selected quantity |
| Faucet Hole | faucet-hole count | Drawing faucet-hole count |
| Splash | splash square footage | Sheet measurement totals |

Default preset behavior:

- Material and Fabrication use combined square footage, including backsplash square footage.
- Edge uses finished-edge linear footage.
- Sink uses sink count.
- Faucet Hole uses faucet-hole count.
- Splash uses splash square footage only when a Splash item is selected.

Generated line formula:

```text
selected item rate * drawing-derived quantity = line total
```

## Quote UI

The quote pricing screen should show a pricing setup panel before generation.

For each Sheet:

- Material selector
- Edge selector
- optional Splash selector
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

- Preset Material creation only asks for name and dollars per square foot.
- Preset Fabrication creation only asks for name and dollars per square foot.
- Preset Edge creation only asks for name and dollars per linear foot.
- Preset Sink creation only asks for name and dollars each.
- Preset Faucet Hole creation only asks for name and dollars each.
- Preset Splash creation only asks for name and dollars per square foot.
- Advanced charge method and measurement basis fields are only shown for Admin Item.
- Edge items must use linear-foot charge method.
- Sink items can use drawing sink count or explicit selected quantity.
- Admin Item measurement basis must match charge method.
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
