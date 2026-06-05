# Phase 2: Job–Slab Loop (web) + Owner-Customer Anchor

**Goal:** Make the slab audit/reassign/release engine usable from the Job, and close the cross-customer attach leak. A user opens a Job, sees the customer's material (linked or not), links shop stock or the customer's own slabs, and a manager can reassign or release with a reason and audit trail. Customer-supplied stone can never be linked to the wrong customer's Job.

**Semantics:** [ADR 0005](../../adr/0005-restricted-material-release-and-reassign.md) (extended this pass: owner-customer anchor + attach cross-customer block). Field rule (ADR 0004): UI gates on `availability` / `kind` / `ownership`, **never** `status`.

**Approach:** TDD — integration/unit test red first, then implement. Append-only migration `059`. Evolve existing inventory services; no new module. Sliced into reviewable commits.

**Out of scope:** dropping the vestigial `status` column (ADR-0004 cleanup) — logged as tech debt, not this pass. Tag-code/QR scan attach. Job-piece-aware fit.

---

## Slice 1: Owner-customer anchor (engine)
- Migration `059_add_owner_customer_id_to_slabs.sql`: `owner_customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT`, nullable. Partial index `(owner_customer_id)`.
- Domain: `Slab.ownerCustomerId: string | null`; `CreateSlabInput` / `UpdateSlabInput` accept it. Schema rule: required when `ownership = customer_supplied`, else null.
- Mapper + repository read/write the column; `ListSlabsInput` gains `ownerCustomerId?` filter.
- **Test first:** creating `customer_supplied` without `ownerCustomerId` → `422`; with it → persisted and returned. **Verify:** `pnpm typecheck` + integration red→green.

## Slice 2: Attach cross-customer guard (engine)
- `ProjectSlabsService.attach`: if `slab.ownership === 'customer_supplied'` and `slab.ownerCustomerId !== customerId` → `409 INVALID_TRANSITION` ("customer-supplied material belongs to another customer").
- Release-to-shop clears `owner_customer_id` when flipping to `shop_owned`.
- **Test first:** attach customer_supplied to its own customer's Job → OK; to a different customer's Job → `409`; release-to-shop nulls `owner_customer_id`. **Verify:** integration green.

## Slice 3: Customer-material query (engine)
- Endpoint to list a customer's owned, not-yet-linked-to-this-Job slabs. Reuse `GET /inventory/slabs?ownerCustomerId=&availability=available` from the web, filtering out ids already in the Job's `project_slabs`. (No new endpoint unless the filter proves insufficient.)
- **Test first:** filter returns only that customer's available material. **Verify:** integration green.

## Slice 4: Intake — set owner at creation (web)
- `slabs/new` form: when ownership = `customer_supplied`, show a required **Customer** picker; pass `ownerCustomerId` to the create action. Hide/clear it for other ownerships.
- **Verify:** create customer_supplied slab from UI → persists owner; typecheck.

## Slice 5: Job Slabs panel (web)
- New "Job Slabs" section on `apps/web/src/app/projects/[id]/page.tsx` (user-facing "Slabs"). Fetch `/users/me` for role.
- **Group 1 — Linked to this Job:** `project_slabs` rows. Per row: tag code, color, dims, location, `kind`/`availability`/`ownership`; **Detach** (shop_owned only; restricted shows disabled + "Release to shop stock to free"); **Reassign** (manager); link to slab detail.
- **Group 2 — This customer's material, not yet linked:** slabs where `ownerCustomerId = job.customerId`, unlinked → **Link** button (same-customer, always allowed).
- **Add material:** inline find-material search (color + min dims) over available shop stock → **Attach** per result, with a **confirmation step** showing slab identity + target Job + Customer before commit.
- **Verify:** panel renders all three; attach/detach/link round-trip; typecheck.

## Slice 6: Reassign + Release UI (web)
- **Reassign** (manager): target **Customer** select → target **Job** select → required **reason**; for `customer_supplied`, lock Customer to current (read-only). Posts to reassign endpoint; surfaces `409`.
- **Release to shop stock:** finalize the drafted form on `slabs/[id]/page.tsx` (reason required, manager-gated). Already drafted — keep.
- **Fix `canEdit`** on `slabs/[id]/page.tsx`: gate on `availability === 'available'` (+ `kind` for remnant identity), drop the `status === 'remnant'` read.
- **Verify:** manager reassign same-customer OK, cross-customer blocked with clear error; release flips ownership + writes audit; estimator sees no manager buttons.

## Slice 7: Full verification
- `pnpm typecheck && pnpm -C apps/api typecheck && pnpm test:integration` green.
- `pnpm spec:check` — update `openapi.yaml` + regenerate `api-client` if the `ownerCustomerId` filter / any payload changed. Never hand-edit `packages/api-client`.

## Self-Review
- TDD: every engine behavior starts red.
- Migration append-only (rule #4): new `059`, never edit `007`/`058`.
- UI gates on `availability`/`kind`/`ownership`, never `status` (ADR 0004).
- Security boundary = API roles/guards; UI role-gating is UX only.
- Risk: `customer_supplied` remnants today land `reserved` with no link and no way back except release — out of scope here, flag as follow-up (returned-customer-remnant handling).
- Tech debt logged: drop vestigial `status` column (ADR-0004 cleanup).
