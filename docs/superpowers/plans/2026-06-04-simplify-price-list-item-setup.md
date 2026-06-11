# Simplify Price List Item Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make known countertop price item creation simple while preserving an Admin Item path for unusual pricing items.

**Architecture:** Keep existing `price_list_items` storage. Add `admin` to the shared item group contract, then make the price list detail page render simple preset forms and one advanced Admin Item form. Existing server actions continue to submit the full API payload, with hidden defaults for presets.

**Tech Stack:** Next.js server components/actions, Nest API, Zod domain schemas, OpenAPI-generated TypeScript client, Vitest integration tests.

---

## Task 1: Add Admin Item API Coverage

**Files:**
- Modify: `tests/integration/price-lists.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test near the existing price-list item tests:

```ts
it('creates admin price list items for unusual charges', async () => {
  const priceList = await createPriceList();
  const item = await createItem(priceList.body.id as string, {
    category: 'admin_item',
    itemGroup: 'admin',
    itemType: 'admin',
    name: 'Delivery Fee',
    unit: 'ea',
    chargeMethod: 'each',
    measurementBasis: 'each',
    priceCents: 25000
  });

  expect(item.response.status).toBe(201);
  expect(item.body).toMatchObject({
    category: 'admin_item',
    itemGroup: 'admin',
    itemType: 'admin',
    name: 'Delivery Fee',
    unit: 'ea',
    chargeMethod: 'each',
    measurementBasis: 'each',
    priceCents: 25000
  });
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vitest run tests/integration/price-lists.test.ts -t "creates admin price list items" --configLoader runner
```

Expected: fail with a validation error because `admin` is not yet in the allowed item groups.

### Task 2: Add Admin Group To Shared Contract

**Files:**
- Modify: `packages/domain/src/price-lists/price-list.constants.ts`
- Modify: `docs/specs/api/openapi.yaml`
- Regenerate: `packages/api-client/src/schema.ts`

- [ ] **Step 1: Add `admin` to the domain item group values**

Update:

```ts
export const PRICE_LIST_ITEM_GROUP_VALUES = ['material', 'fabrication', 'edge', 'sink', 'faucet_hole', 'splash', 'admin'] as const;
```

- [ ] **Step 2: Add `admin` to OpenAPI itemGroup enums**

Update all `itemGroup` enum lists to:

```yaml
enum: [material, fabrication, edge, sink, faucet_hole, splash, admin]
```

- [ ] **Step 3: Regenerate API client**

Run:

```bash
pnpm -C packages/api-client generate
```

- [ ] **Step 4: Verify green**

Run:

```bash
pnpm -C packages/domain build
pnpm exec vitest run tests/integration/price-lists.test.ts -t "creates admin price list items" --configLoader runner
```

Expected: focused test passes.

### Task 3: Simplify Price List Item Forms

**Files:**
- Modify: `apps/web/src/app/price-lists/_actions.ts`
- Modify: `apps/web/src/app/price-lists/[id]/page.tsx`
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/PricingCard.tsx`

- [ ] **Step 1: Update action types and boolean defaults**

Add `admin` to the local `ItemGroup` and `ITEM_GROUPS`. Keep preset forms safe by defaulting omitted booleans to the API defaults: taxable true, allow discount true, editable on quote true, hidden false.

- [ ] **Step 2: Render preset groups with simple fields**

For Material, Fabrication, Edge, Sink, Faucet Hole, and Splash:

```tsx
<input type="hidden" name="itemGroup" value={group.value} />
<input type="hidden" name="category" value={group.category} />
<input type="hidden" name="chargeMethod" value={group.chargeMethod} />
<input type="hidden" name="measurementBasis" value={group.measurementBasis} />
<input type="hidden" name="unit" value={group.unit} />
<Input name="name" required placeholder={`${group.label} item`} />
<Input name="price" required type="number" step="0.01" min="0" placeholder={group.ratePlaceholder} />
<Button type="submit">Add</Button>
```

- [ ] **Step 3: Render Admin Item with advanced fields**

Admin Item form shows name, category, charge method, measurement basis, price, sort order, and hide-on-quote.

- [ ] **Step 4: Keep edit rows simple for presets and advanced for Admin Item**

Preset edit rows preserve hidden charge defaults and show only name, price, sort order, hide, save, delete. Admin edit rows show charge method and measurement basis controls.

- [ ] **Step 5: Include `admin` in quote catalog item type**

Update the local quote pricing catalog type so loading price lists with Admin Items does not type-drift, while quote selectors still only show known quote pricing groups.

### Task 4: Verify And Commit

**Files:**
- All changed files from Tasks 1-3

- [ ] **Step 1: Run focused and package checks**

Run:

```bash
pnpm exec vitest run tests/integration/price-lists.test.ts -t "creates admin price list items" --configLoader runner
pnpm -C packages/domain typecheck
pnpm -C apps/api typecheck
pnpm -C apps/web typecheck
pnpm -C packages/api-client typecheck
pnpm spec:check
```

- [ ] **Step 2: Run related integration tests**

Run:

```bash
pnpm exec vitest run tests/integration/price-lists.test.ts --configLoader runner
```

- [ ] **Step 3: Commit scoped files**

Run:

```bash
git add tests/integration/price-lists.test.ts packages/domain/src/price-lists/price-list.constants.ts docs/specs/api/openapi.yaml packages/api-client/src/schema.ts apps/web/src/app/price-lists/_actions.ts apps/web/src/app/price-lists/[id]/page.tsx apps/web/src/app/customers/[id]/quotes/[quoteId]/PricingCard.tsx docs/superpowers/plans/2026-06-04-simplify-price-list-item-setup.md
git commit -m "Simplify price list item setup"
```
