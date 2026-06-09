# Inventory / Slabs Module

## Purpose

Inventory owns shop-owned stone slabs used by quotes and projects. Slabs are global inventory records, not customer-owned data.

This module answers:

- What stone slabs are available in the shop?
- Which slabs are reserved for quote or project work?
- Which slabs have been cut, and what remnants were produced?

## Entities

### Slab

Fields:

- `id`: UUID
- `parentSlabId`: nullable UUID FK to slabs; set for remnants
- `stoneType`: required string
- `finish`: one of `polished`, `honed`, `brushed`, `leathered`, `sandblasted`
- `qualityGrade`: one of `A`, `B`, `C`
- `lengthIn`, `widthIn`: positive numbers in inches; `lengthIn` must be <= 144 and `widthIn` must be <= 60
- `thicknessCm`: one of `2` or `3`, in centimeters
- `lotNumber`, `bundleNumber`, `warehouseLocation`: optional strings
- `costCents`: integer cents, default 0; on slab create/edit the UI calculates this total from slab square footage and value per square foot
- `imageUrls`: array of URL strings, max 20
- `notes`: optional text
- `status`: one of `available`, `negotiating`, `reserved`, `cut`, `remnant`
- `archivedAt`: nullable ISO timestamp stored as `deleted_at`
- `archivedByUserId`: nullable UUID stored as `deleted_by_user_id`
- `createdAt`, `updatedAt`: ISO timestamps

Slabs MUST NOT have `customerId`; inventory is global to the shop.

### ProjectSlab

Fields:

- `id`: UUID
- `projectId`: UUID FK to projects
- `slabId`: UUID FK to slabs
- `consumedByUserId`: nullable UUID
- `consumedAt`: nullable ISO timestamp
- `notes`: optional text
- `createdAt`: ISO timestamp

## Business Rules

- Slabs can be edited only when `status` is `available` or `remnant`.
- Slabs can be archived only when `status` is `available` or `remnant`.
- Negotiating a slab requires `status` to be `available` or `remnant`, unless the same quote already negotiates it; otherwise return `409` with code `SLAB_NOT_AVAILABLE`.
- Reserving a slab for accepted work promotes it from `negotiating` to `reserved`; quote acceptance must promote all candidate slabs atomically.
- Releasing a slab is a no-op unless the current status is `negotiating` or `reserved`.
- Quote Area Pricing Selections may reference `materialSlabId`. Saving an inventory material source moves that Slab to `negotiating` atomically with the pricing selection write.
- Quote line items may optionally reference `slabId`. Creating or updating a line item with a slab reserves it atomically with the line-item write.
- Cutting a slab marks it `cut` and creates remnant slab rows in the same transaction.
- Remnant rows use `status = remnant` and `parentSlabId` set to the cut slab id.
- Removing a line item, rejecting a quote, or archiving a quote releases reserved slabs referenced by its line items.
- Project slab attach reserves an available/remnant slab or validates that it is already reserved.
- Monetary values are stored in integer cents.
- Length and width are stored as inches; thickness is stored as centimeters.
- All list endpoints use cursor pagination.

## API Endpoints

### Global Inventory

- `GET /inventory/slabs`: List slabs. Filters: `status`, `stoneType`, `finish`. Cursor pagination.
- `POST /inventory/slabs`: Create a slab.
- `GET /inventory/slabs/{slabId}`: Get slab detail.
- `PATCH /inventory/slabs/{slabId}`: Update an available or remnant slab.
- `DELETE /inventory/slabs/{slabId}`: Archive an available or remnant slab.
- `POST /inventory/slabs/{slabId}/cut`: Mark a slab cut and optionally create remnants.

### Project Slabs

- `GET /customers/{customerId}/projects/{projectId}/slabs`: List slabs attached to a project.
- `POST /customers/{customerId}/projects/{projectId}/slabs`: Attach a slab to a project.
- `DELETE /customers/{customerId}/projects/{projectId}/slabs/{slabId}`: Detach a slab from a project.
- `POST /customers/{customerId}/projects/{projectId}/slabs/{slabId}/cut`: Cut a project slab and optionally create remnants.

## Events

- `slab.created`: Payload `slabId`, `actorUserId`
- `slab.updated`: Payload `slabId`, `actorUserId`, `changedFields[]`
- `slab.reserved`: Payload `slabId`, optional `quoteId`, optional `projectId`, `actorUserId`
- `slab.released`: Payload `slabId`, optional `quoteId`, optional `projectId`, `actorUserId`
- `slab.cut`: Payload `slabId`, `actorUserId`, `remnantSlabIds[]`
- `slab.archived`: Payload `slabId`, `actorUserId`
