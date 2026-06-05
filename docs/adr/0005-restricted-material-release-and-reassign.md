# Restricted Material Release And Reassignment

Material Ownership controls whether leftover stone can be reused. Two ownerships are restricted — `job_purchased` and `customer_supplied` — versus `shop_owned`, which is free shop stock. This decision fixes what attach, detach, reassign, and release-to-shop-stock do for each ownership, so customer and job material cannot leak into other jobs by accident.

## Decision

**Detach (plain unlink from a Job):**

- `shop_owned`: returns to `available`.
- `job_purchased` / `customer_supplied`: **blocked**. The material stays reserved/held to its Job. The only way to free it is an explicit Release to Shop Stock.

**Release to Shop Stock** (Inventory Manager / Admin only, requires a reason):

- Flips `ownership` to `shop_owned` and `availability` to `available`.
- Records a Slab Audit Event with the reason.

**Reassignment** (Inventory Manager / Admin only, requires a reason, atomic — old Job released and new Job reserved in one transaction):

- `shop_owned` and `job_purchased`: may move to any Job.
- `customer_supplied`: may move only to another Job of the **same customer**; moving to a different customer is hard-blocked.

**Owning Customer anchor.** A `customer_supplied` Slab stores its owning Customer in `slabs.owner_customer_id` (nullable; required whenever `ownership = customer_supplied`, null otherwise). Ownership cannot be inferred from a live Job link alone, because a customer-supplied Slab can sit loose in inventory at intake or as a returned remnant with no link to compare against. The stored anchor lets the same-customer rule hold whether or not the Slab is currently linked.

**Attach (link a loose Slab to a Job).** The cross-customer block applies on first attach, not only on reassign: attaching a `customer_supplied` Slab to a Job whose Customer is not its `owner_customer_id` is hard-blocked (`409 INVALID_TRANSITION`). Release to Shop Stock clears `owner_customer_id` when it flips ownership to `shop_owned`.

**Audit:** every reserve, release, reassign, release-to-shop, and cut writes a `slab_audit_events` row in the same transaction as the state change. The in-memory event bus continues to emit alongside it.

## Considered Options

- **Let detach return restricted material to `available`** (treat all ownership the same): simplest, but defeats the core goal — customer-supplied stone could be grabbed by another customer's job. Rejected.
- **Detach parks restricted material on `hold`**: safer than `available`, but leaves material in an ambiguous loose state off its job without an explicit decision, and still needs a separate release action to become usable. Rejected in favour of keeping it bound to the Job until released.
- **Reassign anything anywhere with just a reason**: trusts the manager fully, but allows customer-supplied material to cross customers. Rejected; the cross-customer block is cheap insurance.
- **Persist audit via a generic event-log table fed by the event bus**: reusable and event-sourcing-friendly, but larger scope than the spec asks and couples audit to bus delivery. Deferred; a focused `slab_audit_events` side table matches the existing inventory side-table architecture.

## Consequences

- Detach gains ownership-aware branching and can now reject (`409/422`) for restricted material — callers must offer Release to Shop Stock instead.
- Reassign and release-to-shop are new Inventory-Manager-gated endpoints carrying a mandatory reason.
- A new append-only migration adds `slab_audit_events`; slab detail and job panels can render a real history.
- Releasing customer-supplied material is intentionally heavy (manager role + reason + audit) because it reassigns ownership of someone else's property.
