# Split Slab Kind From Availability

Inventory will model full slabs and remnants as the same Slab record, with `kind` describing identity and `availability` describing whether the material can be used. This replaces the earlier status model where `remnant` was itself a status, because a remnant still needs to be available, reserved, held, cut, or archived without losing its remnant identity.

**Considered Options**

- Keep `remnant` as a status: simpler migration, but it cannot express a reserved remnant cleanly.
- Create a separate Remnant model: clear naming, but duplicates search, reservation, photo, location, and cut logic.
- Use one Slab model with separate `kind` and `availability`: one inventory source while preserving physical identity and lifecycle state.

**Consequences**

The DB and API need a deliberate migration from `status` to `kind` plus `availability`. Inventory search, job links, and cut/remnant flows become simpler because full slabs and remnants share the same lifecycle rules.
