# Slab Reassign / Release-to-Shop / Audit Implementation Plan

**Goal:** Close the Phase-1 ownership-protection gap: ownership-aware detach, Inventory-Manager reassign and release-to-shop, and a persisted `slab_audit_events` trail. Semantics fixed in [ADR 0005](../../adr/0005-restricted-material-release-and-reassign.md).

**Approach:** TDD — integration test first in `tests/integration/slabs.test.ts` (and project-slab paths), then implement. Append-only migration `058`. Evolve existing inventory services; no new module.

**Out of scope this pass:** web surfaces (job Slabs panel, release/reassign buttons, audit history rendering). API engine + tests only.

---

## Task 1: Audit table + domain
- Add `db/migrations/058_create_slab_audit_events.sql`: `id, slab_id (fk, cascade), actor_user_id (fk user, set null), action (check: reserved|released|reassigned|released_to_shop|cut), from_project_id, to_project_id, reason text, created_at`. Index `(slab_id, created_at)`.
- Domain `slab.constants.ts`: `SLAB_AUDIT_ACTION_VALUES`.
- Domain `slab.types.ts` + `slab.schemas.ts`: `SlabAuditEvent`, `ReassignSlabInput { targetCustomerId, targetProjectId, reason }`, `ReleaseToShopInput { reason }`. `reason` non-empty.
- **Verify:** `pnpm typecheck`.

## Task 2: Audit persistence + reserve/cut/release write trail
- Add `inventory-audit.repository.ts` (or method on existing repo): `insert(event, client)` — written in-txn.
- Wire existing `reserveForProject`, `releaseForProject`, `cutWithClient` to write an audit row in their transaction.
- **Test first:** reserving/cutting writes a `slab_audit_events` row; `GET /inventory/slabs/:id/audit` returns it. **Verify:** integration red→green.

## Task 3: Ownership-aware detach
- **Test first:** detaching a `shop_owned` slab → `available` + `released` audit row; detaching `job_purchased`/`customer_supplied` → `409 INVALID_TRANSITION` (code conveys "release to shop stock required"), slab stays reserved, no release audit.
- Implement branch in `ProjectSlabsService.detach` / `releaseForProject`.
- **Verify:** integration green.

## Task 4: Release to shop stock
- Endpoint `POST /inventory/slabs/:slabId/release-to-shop` `{ reason }`, `@Roles('admin','inventory_manager')`.
- **Test first:** restricted slab → ownership `shop_owned`, availability `available`, `released_to_shop` audit row with reason; missing reason → `422`; non-manager role → `403`; already shop_owned → `409`/no-op decision (default: `409 INVALID_TRANSITION`).
- Implement service + controller. **Verify:** integration green.

## Task 5: Reassign
- Endpoint `POST /customers/:customerId/projects/:projectId/slabs/:slabId/reassign` `{ targetCustomerId, targetProjectId, reason }`, `@Roles('admin','inventory_manager')`.
- **Test first:** atomic release-from-A + reserve-to-B in one txn (failure rolls back both); `shop_owned`/`job_purchased` move to any customer's job; `customer_supplied` to same-customer job OK; `customer_supplied` to different customer → `409`; missing reason → `422`; non-manager → `403`; one `reassigned` audit row (from/to project).
- Implement `ProjectSlabsService.reassign`. **Verify:** integration green.

## Task 6: Full verification
- `pnpm typecheck && pnpm -C apps/api typecheck && pnpm test:integration` all green.
- `pnpm spec:check` (update OpenAPI paths for the 3 new endpoints if spec:check requires).

## Self-Review
- TDD: every behavior starts red.
- Migration append-only (rule #4): new `058`, never edit `007`/`057`.
- Roles reuse existing `RolesGuard` + `@Roles`; actor from `@CurrentUser()`.
- Risk: OpenAPI spec sync — new endpoints may need `openapi.yaml` + regenerated `api-client`; handle in Task 6.
