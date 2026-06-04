# Slab Inventory And Remnant Inventory Design

## Context

Shop owners need inventory they can trust during receiving, job reservation, cutting, and remnant reuse. A slab may enter the yard as open shop stock or as material intended for a job, but it still needs to be visible in inventory while it is stored, reserved, cut, or kept as a remnant.

The current system already has `Slab`, `parentSlabId`, project slab links, image URLs, and a cut/remnant flow. This design evolves that model instead of creating a separate remnant system.

## Goals

- Let staff receive slabs quickly during truck unload.
- Keep full slabs and remnants searchable from one inventory source.
- Link slabs and remnants to jobs as reservations/claims.
- Preserve ownership rules so customer/job material is not reused accidentally.
- Track physical tags, photos, locations, condition, and damage marks.
- Make remnants easy to find by material and needed piece size.
- Prepare for future slab layout/template fitting without building nesting in phase 1.

## Non-Goals

- Full inventory valuation reports.
- Automatic AI measurement as the source of truth.
- Direct printer SDK integration.
- Slab layout/template nesting.
- Automatic damage avoidance during nesting.
- Tracking every finished countertop piece as inventory.

## Domain Model

### Slab

One physical inventory record. A Slab can be a full slab or a remnant.

Key fields:

- `kind`: `full_slab` or `remnant`
- `availability`: `available`, `reserved`, `cut`, `hold`, `archived`
- `ownership`: `shop_owned`, `job_purchased`, or `customer_supplied`
- `parentSlabId`: source slab for remnants
- `tagCode`: readable physical tag code, such as `S-1042` or `S-1042-R1`
- `materialColorId`: controlled material/color reference
- `storageLocationId`: structured yard/rack/bin/slot reference
- `receiptId`: optional unload batch reference
- `condition`: `good`, `minor_damage`, or `major_damage`
- dimensions, finish, thickness, bundle, lot, cost, notes, timestamps

`kind` is identity. `availability` is whether the material can be used. A remnant can be available, reserved, held, or archived.

### Inventory Receipt

A batch of slabs received from one delivery/unload event. It stores shared intake fields such as vendor/source, delivery date, optional PO/invoice, default material, finish, thickness, bundle, and default location.

### Material Color

A controlled material identity used across inventory, quote selections, and remnant search. It supports aliases so users can find the same material even if it is commonly called by multiple names.

### Storage Location

A structured place where material can be found, such as zone, rack, bin, and slot. Free-text notes can supplement the structured fields, but availability requires a usable location.

### Slab Photo

An uploaded photo tied to a slab. The original photo remains untouched.

### Damage Mark

An overlay on a slab photo. Each mark stores photo id, type, shape points, optional note, and severity. Supported types are `scratch`, `chip`, `crack`, `stain`, and `other`.

### Job Link / Reservation

A slab linked to a job is reserved/claimed. Linking can happen from receipt intake, slab detail, or the job page.

## Business Rules

- Receiving a job-intended slab still creates an inventory slab first, then links it to the job.
- Linking a slab/remnant to a job makes it unavailable to other jobs.
- Releasing a job link returns shop-owned material to available if no other restriction exists.
- Reassigning reserved material from one job to another requires inventory manager or admin permission and a reason note.
- A remnant inherits the source slab's ownership.
- Shop-owned remnants return to available inventory after cutting if they have a location.
- Job-purchased and customer-supplied remnants stay reserved or held for the job until an inventory manager releases them to shop stock.
- Releasing job-purchased or customer-supplied material to shop stock requires explicit confirmation, reason note, and audit history.
- A slab/remnant with no storage location must not appear as normally available.
- Any saved damage mark auto-promotes `good` condition to `minor_damage` unless the user selected `major_damage`.
- Damaged material appears in search but is flagged and ranked lower.
- Held material is hidden from normal search unless the user includes holds.
- Cutting a source slab sets it to `cut` even when no remnants are entered.
- Inventory managers can add a missed remnant from a cut slab later, with an audit note.

## Workflows

### Truck Unload

1. Create an Inventory Receipt.
2. Enter shared load fields once.
3. Generate and print a tag.
4. Stick the tag on the slab.
5. Take a photo with the tag visible.
6. Enter or confirm dimensions.
7. Choose condition.
8. If damaged, add one or more Damage Marks: choose type, circle the area, save mark.
9. Save slab and continue to the next slab.

The intake screen should carry forward common values and increment location slots so the next slab needs fewer taps.

### Damage Marking

The user takes or uploads a photo first. Then they can repeat this loop:

1. Choose `scratch`, `chip`, `crack`, `stain`, or `other`.
2. Draw/circle the damage area with pen or finger.
3. Save that mark.
4. Repeat for more damage.

The user can save without damage marks when condition is good.

### Job Reservation

Users can reserve material from receipt intake, slab detail, or job detail. The system records the job link and updates availability to reserved.

### Cutting And Remnants

The cutter opens the job/material, cuts the source slab, and records any remnants. Each remnant gets dimensions, tag, location, optional photo, optional damage marks, and inherited ownership.

The system does not track finished countertop pieces as inventory in phase 1. Finished pieces belong to production/job flow.

## UI Surfaces

### Inventory Navigation

Top-level `Inventory` should include:

- `Slabs`
- `Remnants`
- `Receipts`
- `Locations`
- `Find Material`

Slabs and remnants should use one unified inventory backend with separate saved views.

### Tablet Intake

The intake screen should optimize for truck unload speed:

- large camera/photo area
- obvious tag/QR area
- one-tap condition controls
- quick damage mark mode
- carried-forward receipt defaults
- carried-forward and incremented location
- `Save + Next`
- local draft queue if network drops before save

### Slab Detail

Slab detail should show:

- tag/QR print action
- material, dimensions, finish, thickness, ownership, availability, condition
- storage location
- linked job, when reserved
- photos with damage overlays
- remnant/source family tree
- cut/remnant history
- audit history

### Job Page

The job page should include a Slabs panel showing linked material, reservation status, ownership, cut/remnant history, and a Find Remnant action.

## Search And Fit

Inventory search should support:

- material/color
- minimum length and width
- automatic rotation check
- thickness
- finish
- condition
- ownership
- availability
- job link
- storage location
- include/exclude damaged
- include/exclude holds

Find Material should rank results by smallest usable waste first, then condition, then location. Restricted material should be hidden unless it belongs to the same job or the user explicitly includes restricted results.

## Roles

Existing roles need one addition:

- `inventory_manager`

Permissions:

- `admin` and `inventory_manager`: receive, edit, link, release, reassign, hold, archive, manage locations, release job/customer material to shop stock.
- `cutter`: cut slabs, add remnants, add photos, record condition, add damage marks, set locations during cut/remnant intake.
- `salesperson`: view/search inventory and use job material finder; reservation permissions can be added by shop policy later.

## Phase 1 Scope

Phase 1 includes:

- inventory receipts
- controlled material colors
- structured storage locations
- slab `kind` / `availability` / `ownership` split
- tag code and printable QR label
- slab photos
- damage marks
- reservation, release, and reassign rules
- cut/remnant flow
- remnant finder
- tablet-first intake with local draft safety
- role updates for inventory manager

## Phase 2 Scope

Phase 2 includes:

- photo-assisted dimension suggestions that users must confirm
- slab layout/template nesting
- damage overlay warnings during slab layout
- direct thermal/Zebra printer integration
- inventory valuation reports
- automatic damage avoidance during nesting

Slab Layout should use confirmed slab/remnant dimensions, drawing/template pieces, and damage marks. Damage should warn at first, not auto-block placement.

## Validation

- A slab can be received into inventory and optionally linked to a job.
- A linked slab is not offered as available to other jobs.
- A full slab and a remnant can both be searched from the same inventory source.
- A remnant can be available, reserved, held, or archived without losing remnant identity.
- A remnant created from a job-purchased or customer-supplied slab is not returned to shop stock automatically.
- An inventory manager can release a job/customer-owned remnant to shop stock only with confirmation and reason.
- A slab without a location is not normal available inventory.
- Damage marks can be added repeatedly to one photo with different types.
- The original photo is preserved when damage marks are edited.
- Find Material suggests matching slabs/remnants by needed dimensions and rotation.
- Held material is hidden by default.

## Testing

Cover:

- receipt creates multiple slabs with carried-forward defaults
- tag codes are unique and human-readable
- material color aliases resolve to the same material
- structured location is required before normal availability
- project/job attach reserves a slab/remnant
- reassign releases old job and reserves new job atomically
- cut source slab creates child remnants with inherited ownership
- shop-owned remnant returns available when location exists
- job/customer-owned remnant remains reserved or held for the job
- damage mark creation updates condition from good to minor damage
- remnant search checks rotated dimensions
- held material is excluded unless requested
