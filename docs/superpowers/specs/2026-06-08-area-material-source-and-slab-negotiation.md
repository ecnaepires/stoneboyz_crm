# Area Material Source And Slab Negotiation

## Question This Answers

How should Generated Pricing connect a selected Area material to shop inventory, while still allowing external material and preventing two quotes from silently claiming the same Slab?

## Decision

Each Quote Area may choose one Material Source:

- `inventory`: the Area references one candidate Slab from inventory.
- `external`: the Area uses material coming from outside current inventory.

An inventory Slab selected during draft pricing enters `negotiating` status. `negotiating` is an exclusive soft tag: another quote cannot negotiate or reserve the same Slab.

When the quote is accepted, all negotiating Slabs for that quote are promoted to `reserved` atomically. If any Slab cannot be promoted, quote acceptance fails and no Slab is reserved.

## Terms

- **Material Price Item**: the selected catalog item that controls material pricing.
- **Material Source**: whether the Area material comes from inventory or outside inventory.
- **Candidate Slab**: the inventory Slab selected for an Area before quote acceptance.
- **Negotiating Slab**: a Slab soft-tagged to an active quote while the customer is deciding.
- **Reserved Slab**: a Slab hard-held for an accepted quote or job.
- **External Material Note**: optional note describing non-inventory material source.

## Lifecycle Rules

### Save Area Pricing With Inventory Source

When a Salesperson saves Area pricing with `materialSource = inventory`:

1. Area must have a Material Price Item.
2. Area must have a Candidate Slab.
3. Candidate Slab must be `available`, `remnant`, or already `negotiating` for the same Quote.
4. Candidate Slab becomes `negotiating`.
5. Area pricing selections are saved.
6. Generated price lines are generated from the selected Material Price Item and drawing-derived quantities.

If Candidate Slab is `negotiating` for another Quote, `reserved`, or `cut`, saving fails.

### Save Area Pricing With External Source

When a Salesperson saves Area pricing with `materialSource = external`:

1. Area may have a Material Price Item for pricing.
2. Area must not reference a Candidate Slab.
3. Area may include an External Material Note.
4. Any previous Candidate Slab for that Area is released if no other Area on the same Quote still uses it.

### Change Candidate Slab

When an Area changes from Slab A to Slab B:

1. Slab B is validated and moved to `negotiating`.
2. Slab A is released to `available` only if no other Area on the same Quote still references Slab A.
3. The change is atomic: if Slab B cannot be negotiated, Slab A remains unchanged.

### Quote Acceptance

When a Quote is accepted:

1. All Candidate Slabs for all Areas on the Quote are promoted from `negotiating` to `reserved` in one transaction.
2. If any Candidate Slab cannot be promoted, quote acceptance fails and no Slab status changes.
3. Accepted quote totals and generated price lines remain governed by quote approval rules.

### Quote Rejection, Expiration, Or Archive

When a Quote is rejected, expired, or archived:

1. Any `negotiating` Slabs referenced by the Quote return to `available`.
2. `reserved`, `cut`, and `remnant` Slabs are not silently changed except by existing inventory lifecycle rules.

## Data Model

### Slab Status

Add `negotiating` to the Slab status set.

```txt
available | negotiating | reserved | cut | remnant
```

`negotiating` means a Slab is soft-tagged to an active quote before quote acceptance.

### Quote Area Pricing Selection

Add material source fields to `quote_area_pricing_selections`:

```txt
material_source text NOT NULL DEFAULT 'external'
material_slab_id uuid NULL REFERENCES slabs(id) ON DELETE SET NULL
external_material_note text NULL
```

Validation rules:

```txt
material_source must be one of: inventory, external

if material_source = inventory:
  material_item_id is required
  material_slab_id is required
  external_material_note may be null

if material_source = external:
  material_slab_id must be null
  external_material_note may be present
```

### Ownership

The Area pricing selection owns the Candidate Slab reference. The Slab record owns only its inventory status.

The system derives “which Quote is negotiating this Slab” by joining:

```txt
slabs
-> quote_area_pricing_selections.material_slab_id
-> quote_areas
-> quotes
```

No `customerId` is added to Slab. Inventory remains global shop inventory.

## UI Behavior

Generated Pricing shows Material Source controls only when an Area has a Material Price Item selected.

For each Area:

- Material selector chooses the Material Price Item used for pricing.
- Material Source selector chooses `inventory` or `external`.
- Inventory source shows available/remnant Slabs and Slabs already negotiating for the same Quote.
- External source shows External Material Note.
- Saving Area pricing applies the material source rules and regenerates that Area's price lines.

### Same Slab Across Multiple Areas

A Quote may use the same Candidate Slab on multiple Areas.

When multiple Areas on the same Quote use the same Candidate Slab, show a non-blocking warning:

```txt
Multiple Areas use this Slab. Confirm layout fit before approval.
```

This warning does not prove the Slab fits. Fit still requires layout confirmation because square footage alone does not prove cut-fit.

### Error Copy

If another Quote is already negotiating the Slab:

```txt
This Slab is already being negotiated on another quote. Pick another inventory Slab or use external material.
```

If the Slab is reserved or cut:

```txt
This Slab is no longer available. Pick another inventory Slab or use external material.
```

If quote acceptance fails because a Candidate Slab cannot be promoted:

```txt
Cannot approve quote yet. One or more inventory Slabs are no longer available. Pick another inventory Slab or use external material.
```

## Non-Goals

This slice does not implement slab cut-fit or nesting.

This slice does not prove selected Areas fit on a Slab. It only records candidate material source and warns when multiple Areas use the same Slab.

This slice does not add hold expiration, manager override, or hold history. Those require a future `slab_holds` design if the shop needs timed holds or audit-heavy negotiation history.

This slice does not change drawing measurement math or Generated Pricing money formulas.

## Required Tests

### Integration Tests

- Saving Area pricing with inventory source moves an available Slab to `negotiating`.
- Saving Area pricing with external source does not tag a Slab.
- Changing from Slab A to Slab B releases Slab A only when no other Area on the same Quote still uses it.
- Another Quote cannot negotiate a Slab already negotiating on a different Quote.
- Same Quote can use one Slab across multiple Areas.
- Accepting a Quote promotes all Candidate Slabs from `negotiating` to `reserved` atomically.
- Rejecting, expiring, or archiving a Quote releases its negotiating Slabs.
- Generated material pricing still uses the selected Material Price Item and drawing-derived quantity.

### UI Tests Or Component Tests

- Material Source controls appear only after Material is selected.
- Inventory source shows Slab selector.
- External source shows External Material Note.
- Multiple Areas using one Slab show the fit warning.
- Slab conflict errors show actionable copy.

## Implementation Order

1. Update the spec and context language.
2. Add database migration for Slab `negotiating` status and Area material source fields.
3. Update domain types and schemas.
4. Add failing integration tests for Slab negotiation lifecycle.
5. Implement backend transaction rules.
6. Update API client schema.
7. Update Generated Pricing UI.
8. Add UI/component tests for Material Source controls and warning.
