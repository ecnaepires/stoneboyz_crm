# Customers Module

## Purpose

Customers module owns company records in Stoneboyz CRM.

A customer is a business account Stoneboyz may sell to, currently sells to, or has sold to before. Customer records are the anchor for contacts, deals, notes, activity history, billing details, and future integrations.

This module answers:
- Who is this company?
- How do we contact them?
- What lifecycle stage are they in?
- Who owns the relationship?
- What important CRM history must remain visible?

## Entities (what data exists)

### Customer

Primary CRM record for either company or person.

Fields:
- `id`: UUID
- `customerKind`: one of `company`, `person`
- `name`: required display name used in lists and search
- `companyName`: required when `customerKind=company`
- `firstName`: required when `customerKind=person`
- `lastName`: optional, used mainly when `customerKind=person`
- `displayName`: optional shorter name for UI
- `status`: one of `lead`, `qualified`, `active`, `inactive`, `churned`
- `type`: one of `prospect`, `customer`, `partner`, `vendor`
- `ownerUserId`: UUID of user responsible for relationship
- `primaryContactId`: UUID of primary contact, nullable until first contact exists
- `billingContactId`: UUID of primary billing contact, nullable
- `billingAddressId`: UUID of primary billing address, nullable
- `taxId`: optional company tax identifier
- `website`: optional company website URL
- `industry`: optional industry label
- `companySize`: optional range or label
- `source`: optional acquisition source, such as referral, outbound, website, event
- `tags`: optional list of labels for segmentation
- `notesSummary`: optional short internal summary
- `phone`: optional primary phone number
- `whatsappPhone`: optional primary WhatsApp number
- `billingEmail`: optional billing email address
- `archiveReason`: nullable internal reason for archive
- `archivedAt`: nullable ISO 8601 UTC timestamp exposed by API; stored as `deleted_at` in DB
- `archivedByUserId`: nullable UUID
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp

### CustomerContact

Person associated with a customer.

Fields:
- `id`: UUID
- `customerId`: UUID
- `firstName`: required
- `lastName`: optional
- `jobTitle`: optional
- `email`: optional
- `phone`: optional
- `whatsappPhone`: optional
- `isPrimary`: boolean
- `isBilling`: boolean
- `preferredChannel`: one of `email`, `phone`, `whatsapp`, `none`
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp
- `archivedAt`: nullable ISO 8601 UTC timestamp

### CustomerAddress

Physical or billing address for a customer.

Fields:
- `id`: UUID
- `customerId`: UUID
- `type`: one of `billing`, `shipping`, `office`, `other`
- `line1`: required
- `line2`: optional
- `city`: required
- `region`: optional state/province/region
- `postalCode`: optional
- `country`: required ISO country code
- `isPrimary`: boolean
- `isBilling`: boolean
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp
- `archivedAt`: nullable ISO 8601 UTC timestamp

### CustomerNote

Internal note attached to customer timeline.

Fields:
- `id`: UUID
- `customerId`: UUID
- `authorUserId`: UUID
- `body`: required plain text
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp
- `archivedAt`: nullable ISO 8601 UTC timestamp

## Business Rules (what must always be true)

- Customer `customerKind` must be either `company` or `person`.
- Customer `name` is required and must be unique among non-archived customers, case-insensitive.
- When `customerKind=company`, `companyName` is required.
- When `customerKind=person`, `firstName` is required.
- Customer records are archived by default, not hard deleted. Normal reads exclude archived records.
- API and UI use archive language. Database tables store this as `deleted_at` for standard soft-delete behavior.
- `status` transitions are:
  - `lead` -> `qualified`
  - `qualified` -> `active`
  - `active` -> `inactive` or `churned`
  - `inactive` -> `active` or `churned`
  - `churned` -> `active`
- `active` customers must have at least one non-archived contact.
- Only one primary contact may exist per customer.
- Only one billing contact may exist per customer.
- `primaryContactId`, when set, must point to a non-archived contact for the same customer.
- `billingContactId`, when set, must point to a non-archived contact for the same customer.
- Each customer may have many addresses, but only one billing address may exist at a time.
- `billingAddressId`, when set, must point to a non-archived address for the same customer.
- Only one primary address per address `type` may exist per customer.
- Contact `email`, when present, must be valid email syntax.
- Customer `billingEmail`, when present, must be valid email syntax.
- Customer `website`, when present, must be a valid URL.
- Customer `taxId`, when present, must be unique among non-archived customers.
- `phone` and `whatsappPhone`, when present, must be stored in normalized phone format.
- Archiving a customer also archives its contacts, addresses, and notes.
- Archived customers cannot receive new jobs, quotes, or invoices until restored.
- Multiple CRM users may view or manage same customer, but one `ownerUserId` is primary accountable owner.
- Events must be emitted after successful transaction commit only.

## API Endpoints (what operations exist)

Base path: `/customers`

- `actorUserId` (string UUID) is required on mutating customer, contact, address, and note requests. It identifies the user performing the operation and is used for event emission.
- `GET /customers`: List customers with cursor pagination, filtering, sorting, and search.
- `POST /customers`: Create customer.
- `GET /customers/{customerId}`: Get customer detail.
- `PATCH /customers/{customerId}`: Update customer fields.
- `POST /customers/{customerId}/archive`: Archive customer.
- `POST /customers/{customerId}/restore`: Restore archived customer when no uniqueness conflict exists.
- `GET /customers/{customerId}/contacts`: List customer contacts.
- `POST /customers/{customerId}/contacts`: Create customer contact.
- `PATCH /customers/{customerId}/contacts/{contactId}`: Update customer contact.
- `DELETE /customers/{customerId}/contacts/{contactId}`: Archive customer contact.
- `POST /customers/{customerId}/contacts/{contactId}/make-primary`: Set primary customer contact.
- `POST /customers/{customerId}/contacts/{contactId}/make-billing`: Set billing customer contact.
- `GET /customers/{customerId}/addresses`: List customer addresses.
- `POST /customers/{customerId}/addresses`: Create customer address.
- `PATCH /customers/{customerId}/addresses/{addressId}`: Update customer address.
- `DELETE /customers/{customerId}/addresses/{addressId}`: Archive customer address.
- `POST /customers/{customerId}/addresses/{addressId}/make-billing`: Set billing customer address.
- `GET /customers/{customerId}/notes`: List customer notes.
- `POST /customers/{customerId}/notes`: Create customer note.
- `PATCH /customers/{customerId}/notes/{noteId}`: Update note body.
- `DELETE /customers/{customerId}/notes/{noteId}`: Archive customer note.

List filters:
- `status`
- `type`
- `ownerUserId`
- `tag`
- `industry`
- `source`
- `customerKind`
- `createdAtFrom`
- `createdAtTo`
- `updatedAtFrom`
- `updatedAtTo`
- `archivedAtFrom`
- `archivedAtTo`

List sorting:
- `name`
- `createdAt`
- `updatedAt`
- `status`

Default sort: `updatedAt` descending.

## Events (what this module emits)

Event names follow `entity.action` format from `docs/specs/events/catalog.v1.yaml`.

- `customer.created`: Customer record created.
- `customer.updated`: Customer core fields changed.
- `customer.status_changed`: Customer lifecycle status changed.
- `customer.archived`: Customer archived.
- `customer.restored`: Customer restored.
- `customer.contact_created`: Contact created for customer.
- `customer.contact_updated`: Contact changed.
- `customer.contact_archived`: Contact archived.
- `customer.primary_contact_changed`: Primary contact changed.
- `customer.billing_contact_changed`: Billing contact changed.
- `customer.address_created`: Address created for customer.
- `customer.address_updated`: Address changed.
- `customer.address_archived`: Address archived.
- `customer.billing_address_changed`: Billing address changed.
- `customer.note_created`: Note created for customer.
- `customer.note_updated`: Note body changed.
- `customer.note_archived`: Note archived.

Minimum event payload fields:
- `eventId`: UUID
- `occurredAt`: ISO 8601 UTC timestamp
- `version`: integer
- `data.customerId`: UUID
- `data.actorUserId`: UUID

Events involving child records also include relevant child ID:
- `data.contactId`
- `data.addressId`
- `data.noteId`

## Open Questions

- Should `taxId` be required for active customers?
- Which country-specific tax ID formats must be validated first?
- Should notes support rich text/attachments, or plain text only for v1?
- Should customer restore be available in UI, API-only, or admin-only?
- Which roles can delete, restore, or reassign customer ownership?
- Should `source`, `industry`, and `tags` be free text first, or controlled lists from admin settings?
- Should archived child records be restorable individually, or only through customer restore?
- Do person-type customers also need company linkage later, like homeowner linked to builder/designer account?
