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

export interface ProjectStageChangedData {
  projectId: string;
  actorUserId: string;
  fromStage: string;
  toStage: string;
  source: 'manual' | 'auto';
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

export interface QuoteAreaEventData {
  quoteId: string;
  areaId: string;
  customerId: string;
  actorUserId: string;
}

export interface QuoteAreaUpdatedData {
  quoteId: string;
  areaId: string;
  customerId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface QuoteMeasurementEventData {
  quoteId: string;
  areaId: string;
  measurementId: string;
  customerId: string;
  actorUserId: string;
}

export interface QuoteMeasurementUpdatedData extends QuoteMeasurementEventData {
  changedFields: string[];
}

export interface ScheduledEventEventData {
  scheduledEventId: string;
  customerId: string;
  actorUserId: string;
}

export interface ScheduledEventUpdatedData {
  scheduledEventId: string;
  customerId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface ScheduledEventRescheduledData {
  scheduledEventId: string;
  customerId: string;
  actorUserId: string;
  previousScheduledAt: string;
  newScheduledAt: string;
}

export interface SlabEventData {
  slabId: string;
  actorUserId: string;
}

export interface SlabUpdatedData {
  slabId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface SlabReservedData {
  slabId: string;
  actorUserId: string;
  quoteId?: string;
  projectId?: string;
}

export interface SlabCutData {
  slabId: string;
  actorUserId: string;
  remnantSlabIds: string[];
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
  | 'project.status_changed'
  | 'project.stage_changed';

export type QuoteEventName =
  | 'quote.created'
  | 'quote.updated'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'quote.archived'
  | 'quote.line_item_added'
  | 'quote.line_item_updated'
  | 'quote.line_item_removed'
  | 'quote.area_added'
  | 'quote.area_updated'
  | 'quote.area_removed'
  | 'quote.counter_piece_added'
  | 'quote.counter_piece_updated'
  | 'quote.counter_piece_removed'
  | 'quote.edge_segment_added'
  | 'quote.edge_segment_updated'
  | 'quote.edge_segment_removed'
  | 'quote.sink_cutout_added'
  | 'quote.sink_cutout_updated'
  | 'quote.sink_cutout_removed';

export type ScheduledEventEventName =
  | 'scheduled_event.created'
  | 'scheduled_event.updated'
  | 'scheduled_event.confirmed'
  | 'scheduled_event.started'
  | 'scheduled_event.completed'
  | 'scheduled_event.cancelled'
  | 'scheduled_event.rescheduled'
  | 'scheduled_event.archived';

export type SlabEventName =
  | 'slab.created'
  | 'slab.updated'
  | 'slab.reserved'
  | 'slab.released'
  | 'slab.cut'
  | 'slab.archived';

export interface PriceListEventData {
  priceListId: string;
  actorUserId: string;
}

export interface PriceListUpdatedData {
  priceListId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface PriceListItemEventData {
  priceListId: string;
  itemId: string;
  actorUserId: string;
}

export interface PriceListItemUpdatedData {
  priceListId: string;
  itemId: string;
  actorUserId: string;
  changedFields: string[];
}

export type PriceListEventName =
  | 'price_list.created'
  | 'price_list.updated'
  | 'price_list.activated'
  | 'price_list.archived'
  | 'price_list.item_created'
  | 'price_list.item_updated'
  | 'price_list.item_deleted';

export interface OrderEventData {
  orderId: string;
  customerId: string;
  actorUserId: string;
}

export interface OrderPaymentEventData {
  orderId: string;
  paymentId: string;
  customerId: string;
  actorUserId: string;
}

export type OrderEventName =
  | 'order.created'
  | 'order.archived'
  | 'order.deposit_requested'
  | 'order.payment_added'
  | 'order.payment_voided';

export type AppEventName =
  | CustomerEventName
  | ProjectEventName
  | QuoteEventName
  | ScheduledEventEventName
  | SlabEventName
  | PriceListEventName
  | OrderEventName;
