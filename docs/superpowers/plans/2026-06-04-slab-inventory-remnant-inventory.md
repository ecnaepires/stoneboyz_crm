# Slab Inventory And Remnant Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 slab/remnant inventory foundation: receipts, material colors, structured locations, split slab kind/availability/ownership, damage marks, reservation rules, remnant finder, and usable inventory UI surfaces.

**Architecture:** Evolve the existing inventory module instead of adding a separate remnant module. Keep full slabs and remnants in `slabs`, add focused side tables for receipts, material colors, locations, photos, and damage marks, then expose narrow API endpoints and web screens using existing NestJS, Zod, PostgreSQL, and Next.js patterns.

**Tech Stack:** TypeScript, NestJS, PostgreSQL migrations, Zod domain schemas, Vitest integration tests, Next.js App Router server components/actions.

---

## File Structure

- Modify `db/migrations/007_create_slabs.sql`: add new slab lifecycle, ownership, tag, material, location, receipt, and condition columns.
- Add `db/migrations/057_create_inventory_foundation.sql`: create inventory receipts, material colors, aliases, storage locations, slab photos, damage marks, and role migration.
- Modify `packages/domain/src/inventory/slab.constants.ts`: define kind, availability, ownership, condition, damage mark type values.
- Modify `packages/domain/src/inventory/slab.types.ts`: expand Slab and add input/output types for receipts, material colors, locations, damage marks, and finder.
- Modify `packages/domain/src/inventory/slab.schemas.ts`: validate new fields and API payloads.
- Modify `apps/api/src/inventory/slab.mapper.ts`: map expanded rows.
- Modify `apps/api/src/inventory/slabs.repository.ts`: persist new slab fields, filters, cut/remnant behavior, finder queries.
- Modify `apps/api/src/inventory/slabs.service.ts`: enforce lifecycle, location, ownership, damage condition rules.
- Modify `apps/api/src/inventory/slabs.controller.ts`: expose list filters, finder, location/receipt/material helper endpoints, damage mark endpoints.
- Add `apps/api/src/inventory/inventory-support.repository.ts`: CRUD helpers for receipts, material colors, locations, photos, damage marks.
- Add `apps/api/src/inventory/inventory-support.service.ts`: business rules for support entities and damage marks.
- Add `apps/api/src/inventory/inventory-support.controller.ts`: support endpoints.
- Modify `apps/api/src/inventory/inventory.module.ts`: register new providers/controllers.
- Modify `apps/api/src/auth/roles.decorator.ts`: add `inventory_manager`.
- Modify `db/migrations/032_expand_role_enum.sql`: include `inventory_manager` for fresh DBs.
- Modify `tests/integration/slabs.test.ts`: cover new slab lifecycle, ownership, damage, receipts, and finder behavior.
- Modify `apps/web/src/app/slabs/page.tsx`: inventory list with saved view filters.
- Modify `apps/web/src/app/slabs/[id]/page.tsx`: expanded slab detail, damage marks, source/remnant info.
- Modify `apps/web/src/app/slabs/new/page.tsx`: basic receive screen with new fields.
- Modify `apps/web/src/app/slabs/_actions.ts`: submit new fields and support actions.
- Add `apps/web/src/app/inventory/page.tsx`: redirect/landing to slabs.
- Add `apps/web/src/app/inventory/receipts/page.tsx`: receipt list/create starter.
- Add `apps/web/src/app/inventory/locations/page.tsx`: location list/create starter.
- Add `apps/web/src/app/inventory/find-material/page.tsx`: material finder.

## Task 1: DB And Domain Lifecycle Split

**Files:**
- Modify: `db/migrations/007_create_slabs.sql`
- Add: `db/migrations/057_create_inventory_foundation.sql`
- Modify: `packages/domain/src/inventory/slab.constants.ts`
- Modify: `packages/domain/src/inventory/slab.types.ts`
- Modify: `packages/domain/src/inventory/slab.schemas.ts`
- Modify: `apps/api/src/auth/roles.decorator.ts`
- Modify: `db/migrations/032_expand_role_enum.sql`
- Test: `tests/integration/slabs.test.ts`

- [ ] **Step 1: Write failing integration assertions for new slab shape**

Add this assertion block to `tests/integration/slabs.test.ts` in `creates and lists slabs with cursor pagination shape`:

```ts
expect(created.body).toMatchObject({
  kind: 'full_slab',
  availability: 'available',
  ownership: 'shop_owned',
  condition: 'good'
});
expect(typeof created.body.tagCode).toBe('string');
expect((created.body.tagCode as string).startsWith('S-')).toBe(true);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: fail because `kind`, `availability`, `ownership`, `condition`, and `tagCode` are missing.

- [ ] **Step 3: Add DB columns and support tables**

Update `db/migrations/007_create_slabs.sql` so the `slabs` table includes:

```sql
  material_color_id uuid,
  storage_location_id uuid,
  inventory_receipt_id uuid,
  tag_code text,
  kind text NOT NULL DEFAULT 'full_slab',
  availability text NOT NULL DEFAULT 'available',
  ownership text NOT NULL DEFAULT 'shop_owned',
  condition text NOT NULL DEFAULT 'good',
  hold_reason text,
```

Add constraints:

```sql
  CONSTRAINT slabs_kind_check CHECK (kind IN ('full_slab', 'remnant')),
  CONSTRAINT slabs_availability_check CHECK (availability IN ('available', 'reserved', 'cut', 'hold', 'archived')),
  CONSTRAINT slabs_ownership_check CHECK (ownership IN ('shop_owned', 'job_purchased', 'customer_supplied')),
  CONSTRAINT slabs_condition_check CHECK (condition IN ('good', 'minor_damage', 'major_damage')),
  CONSTRAINT slabs_tag_code_not_empty CHECK (tag_code IS NULL OR length(trim(tag_code)) > 0),
```

Keep the old `status` column for compatibility during this slice.

Create `db/migrations/057_create_inventory_foundation.sql` with:

```sql
CREATE TABLE IF NOT EXISTS material_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_colors_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT material_colors_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS material_color_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_color_id uuid NOT NULL REFERENCES material_colors(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_color_aliases_alias_not_empty CHECK (length(trim(alias)) > 0),
  CONSTRAINT material_color_aliases_alias_unique UNIQUE (alias)
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  rack text NOT NULL,
  bin text,
  slot text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storage_locations_zone_not_empty CHECK (length(trim(zone)) > 0),
  CONSTRAINT storage_locations_rack_not_empty CHECK (length(trim(rack)) > 0)
);

CREATE TABLE IF NOT EXISTS inventory_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text,
  received_at timestamptz NOT NULL DEFAULT now(),
  default_material_color_id uuid REFERENCES material_colors(id) ON DELETE SET NULL,
  default_finish text,
  default_thickness_cm numeric(4,1),
  default_bundle_number text,
  default_storage_location_id uuid REFERENCES storage_locations(id) ON DELETE SET NULL,
  notes text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slab_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slab_id uuid NOT NULL REFERENCES slabs(id) ON DELETE CASCADE,
  url text NOT NULL,
  uploaded_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slab_photos_url_not_empty CHECK (length(trim(url)) > 0)
);

CREATE TABLE IF NOT EXISTS damage_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slab_id uuid NOT NULL REFERENCES slabs(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES slab_photos(id) ON DELETE SET NULL,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'minor',
  shape jsonb NOT NULL,
  note text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT damage_marks_type_check CHECK (type IN ('scratch', 'chip', 'crack', 'stain', 'other')),
  CONSTRAINT damage_marks_severity_check CHECK (severity IN ('minor', 'major')),
  CONSTRAINT damage_marks_shape_object CHECK (jsonb_typeof(shape) = 'object')
);

ALTER TABLE slabs
  ADD CONSTRAINT slabs_material_color_fk FOREIGN KEY (material_color_id) REFERENCES material_colors(id) ON DELETE SET NULL,
  ADD CONSTRAINT slabs_storage_location_fk FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) ON DELETE SET NULL,
  ADD CONSTRAINT slabs_inventory_receipt_fk FOREIGN KEY (inventory_receipt_id) REFERENCES inventory_receipts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS slabs_tag_code_unique_idx
  ON slabs (tag_code)
  WHERE tag_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS slabs_kind_availability_idx
  ON slabs (kind, availability, updated_at DESC)
  WHERE deleted_at IS NULL;
```

Add `inventory_manager` to `db/migrations/032_expand_role_enum.sql` and `apps/api/src/auth/roles.decorator.ts`.

- [ ] **Step 4: Update domain constants, types, schemas**

Add constants:

```ts
export const SLAB_KIND_VALUES = ['full_slab', 'remnant'] as const;
export const SLAB_AVAILABILITY_VALUES = ['available', 'reserved', 'cut', 'hold', 'archived'] as const;
export const SLAB_OWNERSHIP_VALUES = ['shop_owned', 'job_purchased', 'customer_supplied'] as const;
export const SLAB_CONDITION_VALUES = ['good', 'minor_damage', 'major_damage'] as const;
export const DAMAGE_MARK_TYPE_VALUES = ['scratch', 'chip', 'crack', 'stain', 'other'] as const;
export const DAMAGE_MARK_SEVERITY_VALUES = ['minor', 'major'] as const;
```

Extend `Slab` with:

```ts
kind: SlabKind;
availability: SlabAvailability;
ownership: SlabOwnership;
condition: SlabCondition;
tagCode: string | null;
materialColorId: string | null;
storageLocationId: string | null;
inventoryReceiptId: string | null;
holdReason: string | null;
```

Extend create/update/list schemas with optional `ownership`, `condition`, `materialColorId`, `storageLocationId`, `inventoryReceiptId`, `holdReason`, `kind`, `availability`, and `tagCode` where appropriate.

- [ ] **Step 5: Run test to verify domain compiles enough to fail at mapper/repository**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: fail from missing DB mapper/repository fields or API response fields.

## Task 2: API Mapping, Create/List, Tag Codes

**Files:**
- Modify: `apps/api/src/inventory/slab.mapper.ts`
- Modify: `apps/api/src/inventory/slabs.repository.ts`
- Modify: `apps/api/src/inventory/slabs.service.ts`
- Test: `tests/integration/slabs.test.ts`

- [ ] **Step 1: Verify failing test from Task 1**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: current new shape test fails.

- [ ] **Step 2: Map new columns**

Extend `SlabRow` and `mapSlabRow` for:

```ts
material_color_id: string | null;
storage_location_id: string | null;
inventory_receipt_id: string | null;
tag_code: string | null;
kind: Slab['kind'];
availability: Slab['availability'];
ownership: Slab['ownership'];
condition: Slab['condition'];
hold_reason: string | null;
```

Map to camelCase properties.

- [ ] **Step 3: Persist new create/list fields**

Update `SlabsRepository.create` insert columns and values. Use `kind = parentSlabId === null ? 'full_slab' : 'remnant'`; default `availability = input.availability ?? (input.storageLocationId === undefined ? 'hold' : 'available')`; default `ownership = input.ownership ?? 'shop_owned'`; default `condition = input.condition ?? 'good'`.

Create a dedicated PostgreSQL sequence for generated slab tags:

```sql
CREATE SEQUENCE IF NOT EXISTS slab_tag_sequence;
```

Keep `tag_code` unique for active slabs:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS slabs_tag_code_unique_idx
  ON slabs (tag_code)
  WHERE tag_code IS NOT NULL AND deleted_at IS NULL;
```

Generate tag code in `SlabsService.create` before repository create:

```ts
const tagCode = input.tagCode ?? await this.slabsRepository.nextTagCode();
```

Add `nextTagCode()` in repository using the sequence, not `count(*) + 1`:

```ts
const result = await this.pool.query<{ next: string }>(
  "SELECT 'S-' || lpad(nextval('slab_tag_sequence')::text, 4, '0') AS next"
);
```

Wrap `SlabsService.create` in limited retry-on-conflict logic: on a `tag_code`
unique violation for an auto-generated tag, fetch a fresh `nextTagCode()` and retry
the repository create. Do not retry indefinitely.

For remnants, use `${parentTagCode}-R${n}` in `cut`.

- [ ] **Step 4: Run integration test**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: new shape assertion passes; older tests may still fail where they expect `status=remnant`.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/007_create_slabs.sql db/migrations/057_create_inventory_foundation.sql db/migrations/032_expand_role_enum.sql packages/domain/src/inventory apps/api/src/auth/roles.decorator.ts apps/api/src/inventory/slab.mapper.ts apps/api/src/inventory/slabs.repository.ts apps/api/src/inventory/slabs.service.ts tests/integration/slabs.test.ts
git commit -m "feat(inventory): split slab lifecycle fields"
```

## Task 3: Reservation And Cut Rules With Ownership

**Files:**
- Modify: `tests/integration/slabs.test.ts`
- Modify: `apps/api/src/inventory/slabs.repository.ts`
- Modify: `apps/api/src/inventory/slabs.service.ts`
- Modify: `apps/api/src/inventory/project-slabs.repository.ts`
- Modify: `apps/api/src/inventory/project-slabs.service.ts`

- [ ] **Step 1: Add failing tests for remnant identity and ownership inheritance**

In `cuts a slab and creates remnants`, change expectations:

```ts
expect((body.slab as Record<string, unknown>).availability).toBe('cut');
expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).kind).toBe('remnant');
expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).availability).toBe('hold');
expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).ownership).toBe('shop_owned');
```

Add a new test:

```ts
it('keeps customer supplied remnants held for the job after cut', async () => {
  const slab = await createSlab({ ownership: 'customer_supplied' });
  const projectResponse = await fetch(projectsUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerId: SEEDED_CUSTOMER_ID,
      title: 'Customer material job',
      ownerUserId: ACTOR_USER_ID
    })
  });
  const project = await projectResponse.json() as Record<string, unknown>;

  await fetch(projectSlabsUrl(project.id as string), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, slabId: slab.body.id })
  });

  const response = await fetch(`${projectSlabsUrl(project.id as string)}/${slab.body.id}/cut`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      remnants: [{
        stoneType: 'Granite Black Galaxy',
        finish: 'polished',
        qualityGrade: 'B',
        lengthIn: 24,
        widthIn: 24,
        thicknessCm: 3
      }]
    })
  });
  const body = await response.json() as Record<string, unknown>;
  const remnant = (body.remnants as Array<Record<string, unknown>>)[0]!;

  expect(remnant).toMatchObject({
    kind: 'remnant',
    ownership: 'customer_supplied',
    availability: 'reserved'
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: fail on remnant ownership/availability.

- [ ] **Step 3: Implement reservation availability**

Change reserve/release/cut repository updates to write `availability`, keeping legacy `status` synchronized:

```sql
SET availability = 'reserved', status = 'reserved'
```

Release uses:

```sql
SET availability = 'available', status = 'available'
```

Cut uses:

```sql
SET availability = 'cut', status = 'cut'
```

Allowed reserve availability: `available`, `hold` only when hold reason is `needs_location` and a location is supplied before reserve. For this slice, keep reserve allowed for `available` only.

- [ ] **Step 4: Implement remnant inheritance**

In `SlabsService.cutWithClient`, load parent slab, then pass parent ownership into remnant creation. For project cut, pass current project id so non-shop remnants become reserved and get attached to the same project.

In `ProjectSlabsService.cut`, after remnants are created, attach non-shop remnants to the same project in the same transaction.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/inventory tests/integration/slabs.test.ts
git commit -m "feat(inventory): preserve remnant ownership rules"
```

## Task 4: Receipts, Material Colors, Locations, Damage Marks

**Files:**
- Add: `apps/api/src/inventory/inventory-support.repository.ts`
- Add: `apps/api/src/inventory/inventory-support.service.ts`
- Add: `apps/api/src/inventory/inventory-support.controller.ts`
- Modify: `apps/api/src/inventory/inventory.module.ts`
- Modify: `packages/domain/src/inventory/slab.types.ts`
- Modify: `packages/domain/src/inventory/slab.schemas.ts`
- Modify: `tests/integration/slabs.test.ts`

- [ ] **Step 1: Add failing integration test**

Add test:

```ts
it('records damage marks and promotes condition to minor damage', async () => {
  const slab = await createSlab({ storageLocationId: null });

  const response = await fetch(`${slabsUrl()}/${slab.body.id}/damage-marks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'scratch',
      severity: 'minor',
      shape: { kind: 'circle', x: 10, y: 20, radius: 12 },
      note: 'top right scratch'
    })
  });
  const mark = await response.json() as Record<string, unknown>;

  expect(response.status).toBe(201);
  expect(mark).toMatchObject({ type: 'scratch', severity: 'minor' });

  const slabResponse = await fetch(`${slabsUrl()}/${slab.body.id}`);
  const updated = await slabResponse.json() as Record<string, unknown>;
  expect(updated.condition).toBe('minor_damage');
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: `404` for missing damage mark endpoint.

- [ ] **Step 3: Add support types/schemas**

Add `DamageMark`, `CreateDamageMarkInput`, `MaterialColor`, `StorageLocation`, `InventoryReceipt` types and Zod schemas. Use shape schema:

```ts
export const damageMarkShapeSchema = z.object({
  kind: z.enum(['circle', 'polygon', 'freehand']),
  x: z.number().optional(),
  y: z.number().optional(),
  radius: z.number().positive().optional(),
  points: z.array(z.tuple([z.number(), z.number()])).optional()
});
```

- [ ] **Step 4: Add support repository/service/controller**

Implement endpoints:

```text
POST /inventory/slabs/:slabId/damage-marks
GET /inventory/slabs/:slabId/damage-marks
GET /inventory/material-colors
POST /inventory/material-colors
GET /inventory/locations
POST /inventory/locations
GET /inventory/receipts
POST /inventory/receipts
```

On create damage mark, insert row and update slab condition:

```sql
UPDATE slabs
SET condition = CASE WHEN condition = 'good' THEN 'minor_damage' ELSE condition END,
    updated_at = now()
WHERE id = $1 AND deleted_at IS NULL
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/inventory apps/api/src/inventory tests/integration/slabs.test.ts
git commit -m "feat(inventory): add receipts locations and damage marks"
```

## Task 5: Remnant Finder API

**Files:**
- Modify: `packages/domain/src/inventory/slab.schemas.ts`
- Modify: `packages/domain/src/inventory/slab.types.ts`
- Modify: `apps/api/src/inventory/slabs.repository.ts`
- Modify: `apps/api/src/inventory/slabs.service.ts`
- Modify: `apps/api/src/inventory/slabs.controller.ts`
- Modify: `tests/integration/slabs.test.ts`

- [ ] **Step 1: Add failing finder test**

Add test:

```ts
it('finds available remnants that fit needed dimensions when rotated', async () => {
  await createSlab({
    kind: 'remnant',
    availability: 'available',
    lengthIn: 30,
    widthIn: 50,
    storageLocationId: null
  });

  const response = await fetch(`${slabsUrl()}/find-material?minLengthIn=48&minWidthIn=24&kind=remnant`);
  const body = await response.json() as Record<string, unknown>;

  expect(response.status).toBe(200);
  expect(body.data).toHaveLength(1);
  expect((body.data as Array<Record<string, unknown>>)[0]).toMatchObject({ fitsRotated: true });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: `404` for missing finder endpoint.

- [ ] **Step 3: Add finder schema/type**

Add query schema with `minLengthIn`, `minWidthIn`, optional `kind`, `materialColorId`, `thicknessCm`, `finish`, `includeHeld`, `includeDamaged`.

- [ ] **Step 4: Implement finder**

Query `slabs` where deleted null, availability available unless include held, kind filter optional. Fit condition:

```sql
(
  (length_in >= $minLength AND width_in >= $minWidth)
  OR
  (length_in >= $minWidth AND width_in >= $minLength)
)
```

Return `fitsRotated` computed in mapper/service and sort by waste area ascending.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/inventory apps/api/src/inventory tests/integration/slabs.test.ts
git commit -m "feat(inventory): add material finder"
```

## Task 6: Web Inventory Surfaces

**Files:**
- Modify: `apps/web/src/app/slabs/page.tsx`
- Modify: `apps/web/src/app/slabs/new/page.tsx`
- Modify: `apps/web/src/app/slabs/[id]/page.tsx`
- Modify: `apps/web/src/app/slabs/_actions.ts`
- Add: `apps/web/src/app/inventory/page.tsx`
- Add: `apps/web/src/app/inventory/find-material/page.tsx`
- Add: `apps/web/src/app/inventory/locations/page.tsx`
- Add: `apps/web/src/app/inventory/receipts/page.tsx`

- [ ] **Step 1: Run web typecheck baseline**

Run:

```bash
pnpm typecheck:web
```

Expected: PASS or existing unrelated failures. If unrelated failures appear in currently dirty user files, note them and continue only if inventory files typecheck locally.

- [ ] **Step 2: Update slab list**

Show columns: tag, material/stone type, kind, availability, ownership, condition, size, sq ft, location, linked job if available. Add links for `/slabs?kind=remnant`, `/slabs?kind=full_slab`, and `/inventory/find-material`.

- [ ] **Step 3: Update new slab form**

Add fields for ownership, kind hidden full slab default, condition, location id text fallback, material color id text fallback, receipt id text fallback. Keep current `stoneType` text so existing workflow remains usable.

- [ ] **Step 4: Update slab detail**

Show tag code, kind, availability, ownership, condition, source/remnant parent, photo section, and damage mark list from `/damage-marks`.

- [ ] **Step 5: Add inventory pages**

`/inventory/page.tsx` redirects to `/slabs`. `find-material/page.tsx` has simple GET form for min length/width and renders finder results. `locations/page.tsx` and `receipts/page.tsx` show current support lists and simple create forms.

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm typecheck:web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/slabs apps/web/src/app/inventory
git commit -m "feat(web): add inventory slab surfaces"
```

## Task 7: Full Verification And Spec Sync

**Files:**
- Modify only if verification exposes small issues.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm test:integration tests/integration/slabs.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run domain typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run web typecheck**

Run:

```bash
pnpm typecheck:web
```

Expected: PASS.

- [ ] **Step 4: Run spec check**

Run:

```bash
pnpm spec:check
```

Expected: PASS.

- [ ] **Step 5: Commit fixes if needed**

```bash
git add <fixed-files>
git commit -m "fix(inventory): complete verification fixes"
```

Skip commit if no files changed.

## Self-Review

- Spec coverage: Phase 1 DB/domain/API covered by Tasks 1-5; UI surfaces covered by Task 6; verification covered by Task 7.
- Deferred by spec: photo-assisted dimensions, slab layout/template nesting, direct printer SDK, valuation reports, automatic damage avoidance.
- TDD coverage: each API behavior starts with integration failure before implementation.
- Risk: Web UI tests are typecheck-only in this plan because the repo does not currently show Playwright test scripts for these pages. Manual browser verification should be added during execution if a dev server is started.
