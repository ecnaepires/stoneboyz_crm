# Group-First Price List Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the all-in-one price list item editing page with separate group pages for Materials, Fabrication, Edges, Sinks, Faucet Holes, Splash, and Admin Items.

**Architecture:** Keep the existing `price_lists` and `price_list_items` APIs. Extract shared group config and item-editing UI from `apps/web/src/app/price-lists/[id]/page.tsx`, make `[id]/page.tsx` a hub, and add one dynamic group route at `apps/web/src/app/price-lists/[id]/[group]/page.tsx`.

**Tech Stack:** Next.js App Router server components/actions, existing UI primitives, Vitest for route/config behavior, TypeScript.

---

## Task 1: Add Group Routing Config Test

**Files:**
- Create: `apps/web/src/app/price-lists/pricing-groups.test.ts`
- Create: `apps/web/src/app/price-lists/pricing-groups.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/price-lists/pricing-groups.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GROUPS, getGroupBySegment, groupHref } from './pricing-groups';

describe('pricing group routes', () => {
  it('uses one page segment per pricing group', () => {
    expect(GROUPS.map((group) => [group.value, group.segment])).toEqual([
      ['material', 'materials'],
      ['fabrication', 'fabrication'],
      ['edge', 'edges'],
      ['sink', 'sinks'],
      ['faucet_hole', 'faucet-holes'],
      ['splash', 'splash'],
      ['admin', 'admin-items'],
    ]);
  });

  it('builds price-list group URLs', () => {
    expect(groupHref('price-list-1', 'edge')).toBe('/price-lists/price-list-1/edges');
  });

  it('finds groups by URL segment', () => {
    expect(getGroupBySegment('materials')?.value).toBe('material');
    expect(getGroupBySegment('bad')).toBeNull();
  });
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vitest run apps/web/src/app/price-lists/pricing-groups.test.ts --configLoader runner
```

Expected: fail because `pricing-groups.ts` does not exist.

### Task 2: Extract Shared Pricing Group Config

**Files:**
- Create: `apps/web/src/app/price-lists/pricing-groups.ts`

- [ ] **Step 1: Implement config**

Create `apps/web/src/app/price-lists/pricing-groups.ts` with group values, route segments, labels, categories, charge methods, measurement bases, and helper functions:

```ts
export type PriceListItemGroup = 'material' | 'fabrication' | 'edge' | 'sink' | 'faucet_hole' | 'splash' | 'admin';
export type ChargeMethod = 'square_foot' | 'linear_foot' | 'each';
export type MeasurementBasis = 'countertop_sqft' | 'backsplash_sqft' | 'combined_sqft' | 'finished_edge_linft' | 'splash_sqft' | 'sink_count' | 'faucet_hole_count' | 'each';
```

Then move the existing group definitions into this file, adding `segment`.

- [ ] **Step 2: Verify green**

Run:

```bash
pnpm exec vitest run apps/web/src/app/price-lists/pricing-groups.test.ts --configLoader runner
```

Expected: 3 tests pass.

### Task 3: Create Shared Group Editor Component

**Files:**
- Create: `apps/web/src/app/price-lists/[id]/PriceGroupItems.tsx`
- Modify: `apps/web/src/app/price-lists/[id]/page.tsx`

- [ ] **Step 1: Extract item table/editing UI**

Create `PriceGroupItems.tsx` containing:

- `PriceListItemView`
- `PresetCreateForm`
- `AdminCreateForm`
- `ItemEditForm`
- `PriceGroupItems`

`PriceGroupItems` receives:

```ts
{
  priceListId: string;
  group: GroupConfig;
  items: PriceListItemView[];
  canEdit: boolean;
}
```

- [ ] **Step 2: Remove item editing from `[id]/page.tsx`**

Change `[id]/page.tsx` to show price-list info and a grid of links to each group page. No add forms or item tables remain on this hub.

### Task 4: Add Dynamic Group Page

**Files:**
- Create: `apps/web/src/app/price-lists/[id]/[group]/page.tsx`

- [ ] **Step 1: Implement page**

The dynamic route:

1. Reads `id` and `group`.
2. Finds group config with `getGroupBySegment`.
3. Calls `notFound()` for invalid group segments.
4. Fetches the price list.
5. Filters items to the selected group only.
6. Renders a back link, price list name, group heading, and `PriceGroupItems`.

### Task 5: Verify And Commit

**Files:**
- All files above.

- [ ] **Step 1: Run checks**

Run:

```bash
pnpm exec vitest run apps/web/src/app/price-lists/pricing-groups.test.ts --configLoader runner
pnpm -C apps/web typecheck
pnpm -C apps/api typecheck
pnpm -C packages/domain typecheck
pnpm -C packages/api-client typecheck
```

- [ ] **Step 2: Commit**

Run:

```bash
git add apps/web/src/app/price-lists docs/superpowers/plans/2026-06-04-group-first-price-list-pages.md
git commit -m "Split price list items into group pages"
```
