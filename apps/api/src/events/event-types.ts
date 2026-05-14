export interface EventEnvelope<TData> {
  eventId: string;
  occurredAt: string;
  version: number;
  data: TData;
}

export interface CustomerCreatedData {
  customerId: string;
  actorUserId: string;
  name: string;
  customerKind: string;
}

export interface CustomerUpdatedData {
  customerId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface CustomerStatusChangedData {
  customerId: string;
  actorUserId: string;
  fromStatus: string;
  toStatus: string;
}

export interface CustomerArchivedData {
  customerId: string;
  actorUserId: string;
  archiveReason?: string;
}

export interface CustomerRestoredData {
  customerId: string;
  actorUserId: string;
}

export interface CustomerContactEventData {
  customerId: string;
  contactId: string;
  actorUserId: string;
}

export interface CustomerContactUpdatedData {
  customerId: string;
  contactId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface CustomerAddressEventData {
  customerId: string;
  addressId: string;
  actorUserId: string;
}

export interface CustomerAddressUpdatedData {
  customerId: string;
  addressId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface CustomerNoteEventData {
  customerId: string;
  noteId: string;
  actorUserId: string;
}

export interface CustomerNoteUpdatedData {
  customerId: string;
  noteId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface ProjectCreatedData {
  projectId: string;
  customerId: string;
  actorUserId: string;
  title: string;
}

export interface ProjectUpdatedData {
  projectId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface ProjectArchivedData {
  projectId: string;
  customerId: string;
  actorUserId: string;
}

export interface ProjectStatusChangedData {
  projectId: string;
  actorUserId: string;
  fromStatus: string;
  toStatus: string;
}

export interface QuoteEventData {
  quoteId: string;
  customerId: string;
  actorUserId: string;
}

export interface QuoteUpdatedData {
  quoteId: string;
  customerId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface QuoteLineItemEventData {
  quoteId: string;
  lineItemId: string;
  customerId: string;
  actorUserId: string;
}

export interface QuoteLineItemUpdatedData {
  quoteId: string;
  lineItemId: string;
  customerId: string;
  actorUserId: string;
  changedFields: string[];
}

export type CustomerEventName =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.status_changed'
  | 'customer.archived'
  | 'customer.restored'
  | 'customer.contact_created'
  | 'customer.contact_updated'
  | 'customer.contact_archived'
  | 'customer.primary_contact_changed'
  | 'customer.billing_contact_changed'
  | 'customer.address_created'
  | 'customer.address_updated'
  | 'customer.address_archived'
  | 'customer.billing_address_changed'
  | 'customer.note_created'
  | 'customer.note_updated'
  | 'customer.note_archived';

export type ProjectEventName =
  | 'project.created'
  | 'project.updated'
  | 'project.archived'
  | 'project.status_changed';

export type QuoteEventName =
  | 'quote.created'
  | 'quote.updated'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'quote.archived'
  | 'quote.line_item_added'
  | 'quote.line_item_updated'
  | 'quote.line_item_removed';

export type AppEventName = CustomerEventName | ProjectEventName | QuoteEventName;
