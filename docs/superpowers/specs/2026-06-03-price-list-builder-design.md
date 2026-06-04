# Price List Builder Design

> **Superseded:** Quote pricing no longer applies one whole Price List to a quote. See [Price Catalog And Quote Pricing Selections](./2026-06-04-price-catalog-and-quote-selections-design.md).

## Context

The current price-list dashboard exposes system-shaped fields (`category`, `type`, `unit`, `sort`) and makes active price lists read-only. Countertop salespeople need a simpler pricing surface: choose what is being sold, choose how it is measured, enter the rate, and let quote pricing multiply rate by measured quantity.

This design keeps pricing separate from drawing. Drawings produce measurements; Salespeople use those measurements to price the quote.

## Goals

- Make Price Lists editable from a salesperson-friendly builder.
- Let Salespeople create and reuse company-wide pricing items.
- Support material, fabrication, edge, sink, and faucet-hole pricing.
- Support square-foot, linear-foot, and each/unit charges.
- Let each Price List Item choose the measurement basis used as its quantity.
- Keep existing generated quote price lines unchanged until the Salesperson regenerates pricing.

## Non-Goals

- Full inventory management.
- Drawing workspace changes.
- Automatic repricing of existing quotes when a Price List changes.
- Multiple materials or edge profiles on the same Sheet.

## Domain Model

### Price List

A reusable set of charges a Salesperson applies to quotes. Active Price Lists remain editable. Existing generated quote price lines keep their current amounts unless pricing is regenerated for that quote.

### Price List Group

A user-facing group of sellable items:

- Material
- Fabrication
- Edge
- Sink
- Faucet Hole

Groups organize the builder and define quote-selection behavior.

### Price List Item

A selectable charge inside a group. Examples:

- Material -> Uba Tuba
- Fabrication -> Retail Fabrication
- Edge -> Bullnose
- Sink -> 70/30 Sink

Each item has:

- group
- name
- charge method
- measurement basis
- rate
- taxable/discount/editable/hidden flags
- sort order

### Item Catalog

The company-wide set of reusable groups and items. When a Salesperson creates a new item inside a Price List, it is saved to the current Price List and to the Item Catalog for future use by other Salespeople.

### Charge Method

How the item charges:

- square foot
- linear foot
- each/unit

### Measurement Basis

The quote measurement used as quantity:

- countertop square footage
- backsplash square footage
- combined square footage
- finished-edge linear footage
- sink count
- faucet-hole count

Salespeople can choose the measurement basis so different Price Lists can support retail jobs, fabrication-only jobs, and custom pricing scenarios.

## Price List Builder UI

The Price List detail page becomes the main editing surface. It includes:

- Price List header: name, description, tax/payment terms, status.
- Grouped item sections for Material, Fabrication, Edge, Sink, and Faucet Hole.
- Item rows showing item name, charge method, measurement basis, rate, and visibility/edit flags.
- `Add item` action inside each group.

The builder removes the raw `Category`, `Type`, `Unit`, and `Sort` add form from the primary flow.

### Add Item Flow

`Add item` opens a focused modal:

1. Select group.
2. Search existing catalog item or create a new item.
3. Choose charge method.
4. Choose measurement basis.
5. Enter rate.
6. Save.

Saving adds the item to the current Price List. If the item is new, it also becomes available in the company-wide Item Catalog.

### Defaults

- Material defaults to square foot.
- Fabrication defaults to square foot.
- Edge defaults to linear foot and finished-edge linear footage.
- Sink defaults to each and sink count.
- Faucet Hole defaults to each and faucet-hole count.

Defaults are visible and editable where the group allows it.

### Zero-Price Items

Price List Items can have a zero rate. This allows a Salesperson to include selectable options, such as Eased Edge or Bullnose, without necessarily charging extra for them.

## Quote Pricing Selection

The quote pricing screen uses the selected Price List to offer choices.

### Sheet-Level Selections

Each Sheet can select:

- one Material item
- one Edge item
- optional Fabrication override

Material and Edge groups may contain many catalog items, but only one Material and one Edge can be selected per Sheet.

### Quote-Level Selections

The quote can select:

- one default Fabrication item
- one or more Sink items with quantities
- Faucet Hole pricing when applicable

Fabrication applies as a quote-level default with optional Sheet overrides.

## Pricing Generation

Generated price lines are calculated as:

```text
rate * quantity = line total
```

The quantity comes from the item's measurement basis.

Examples:

- Uba Tuba at `$18 / square foot` uses the selected Sheet square footage.
- Bullnose at `$14 / linear foot` uses finished-edge linear footage for Sheets using Bullnose.
- 70/30 Sink at `$150 / each` uses selected sink quantity or sink count.

Generated lines remain frozen once created. If a Price List is edited later, existing generated quote lines do not change until the Salesperson explicitly regenerates pricing for a draft quote.

## Validation

- Rate cannot be negative.
- Edge items always charge by linear foot.
- Material allows one selected item per Sheet.
- Edge allows one selected item per Sheet.
- Sink allows one or more selected items with quantities.
- Fabrication has one quote-level default with optional Sheet overrides.
- Measurement basis must match the charge method.

## Implementation Notes

The current system already has `price_lists`, `price_list_items`, and `generated_price_lines`. The design should evolve those concepts rather than replacing the whole pricing subsystem.

Likely changes:

- Add item catalog persistence.
- Replace raw item form with grouped builder UI.
- Allow active Price List edits.
- Preserve generated price line freezing behavior.
- Expand quote pricing selections so groups/items are chosen before generating lines.
- Update pricing generation to use item charge method and measurement basis instead of hard-coded category behavior.

## Testing

Cover these behaviors:

- Active Price Lists can be edited.
- Creating a new item in one Price List adds it to the company-wide catalog.
- Future Price Lists can reuse catalog items.
- Material item rate multiplies by selected square footage basis.
- Edge item rate multiplies by Sheet finished-edge linear footage only for Sheets using that edge item.
- Sink item rate multiplies by sink quantity.
- Existing generated lines stay unchanged after Price List edits.
- Regenerating pricing on a draft quote pulls current Price List item rates.

## Open Decisions

None for this design slice.
