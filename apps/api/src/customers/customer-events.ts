import type { Customer } from '@stoneboyz/domain';
import type {
  CustomerArchivedData,
  CustomerAddressEventData,
  CustomerAddressUpdatedData,
  CustomerContactEventData,
  CustomerContactUpdatedData,
  CustomerCreatedData,
  CustomerNoteEventData,
  CustomerNoteUpdatedData,
  CustomerRestoredData,
  CustomerStatusChangedData,
  CustomerUpdatedData,
  ProjectArchivedData
} from '../events/event-types.js';

export const buildCustomerCreatedPayload = (
  customer: Customer,
  actorUserId: string
): CustomerCreatedData => ({
  customerId: customer.id,
  actorUserId,
  name: customer.name,
  customerKind: customer.customerKind
});

export const buildCustomerUpdatedPayload = (
  customerId: string,
  actorUserId: string,
  changedFields: string[]
): CustomerUpdatedData => ({
  customerId,
  actorUserId,
  changedFields
});

export const buildCustomerStatusChangedPayload = (
  customerId: string,
  actorUserId: string,
  fromStatus: string,
  toStatus: string
): CustomerStatusChangedData => ({
  customerId,
  actorUserId,
  fromStatus,
  toStatus
});

export const buildCustomerArchivedPayload = (
  customerId: string,
  actorUserId: string,
  archiveReason?: string
): CustomerArchivedData => ({
  customerId,
  actorUserId,
  ...(archiveReason !== undefined ? { archiveReason } : {})
});

export const buildCustomerRestoredPayload = (
  customerId: string,
  actorUserId: string
): CustomerRestoredData => ({
  customerId,
  actorUserId
});

export const buildCustomerContactCreatedPayload = (
  customerId: string,
  contactId: string,
  actorUserId: string
): CustomerContactEventData => ({
  customerId,
  contactId,
  actorUserId
});

export const buildCustomerContactUpdatedPayload = (
  customerId: string,
  contactId: string,
  actorUserId: string,
  changedFields: string[]
): CustomerContactUpdatedData => ({
  customerId,
  contactId,
  actorUserId,
  changedFields
});

export const buildCustomerContactArchivedPayload = (
  customerId: string,
  contactId: string,
  actorUserId: string
): CustomerContactEventData => ({
  customerId,
  contactId,
  actorUserId
});

export const buildCustomerPrimaryContactChangedPayload = (
  customerId: string,
  contactId: string,
  actorUserId: string
): CustomerContactEventData => ({
  customerId,
  contactId,
  actorUserId
});

export const buildCustomerBillingContactChangedPayload = (
  customerId: string,
  contactId: string,
  actorUserId: string
): CustomerContactEventData => ({
  customerId,
  contactId,
  actorUserId
});

export const buildCustomerAddressCreatedPayload = (
  customerId: string,
  addressId: string,
  actorUserId: string
): CustomerAddressEventData => ({
  customerId,
  addressId,
  actorUserId
});

export const buildCustomerAddressUpdatedPayload = (
  customerId: string,
  addressId: string,
  actorUserId: string,
  changedFields: string[]
): CustomerAddressUpdatedData => ({
  customerId,
  addressId,
  actorUserId,
  changedFields
});

export const buildCustomerAddressArchivedPayload = (
  customerId: string,
  addressId: string,
  actorUserId: string
): CustomerAddressEventData => ({
  customerId,
  addressId,
  actorUserId
});

export const buildCustomerBillingAddressChangedPayload = (
  customerId: string,
  addressId: string,
  actorUserId: string
): CustomerAddressEventData => ({
  customerId,
  addressId,
  actorUserId
});

export const buildCustomerNoteCreatedPayload = (
  customerId: string,
  noteId: string,
  actorUserId: string
): CustomerNoteEventData => ({
  customerId,
  noteId,
  actorUserId
});

export const buildCustomerNoteUpdatedPayload = (
  customerId: string,
  noteId: string,
  actorUserId: string,
  changedFields: string[]
): CustomerNoteUpdatedData => ({
  customerId,
  noteId,
  actorUserId,
  changedFields
});

export const buildCustomerNoteArchivedPayload = (
  customerId: string,
  noteId: string,
  actorUserId: string
): CustomerNoteEventData => ({
  customerId,
  noteId,
  actorUserId
});

export const buildProjectArchivedByCustomerPayload = (
  customerId: string,
  projectId: string,
  actorUserId: string
): ProjectArchivedData => ({
  customerId,
  projectId,
  actorUserId
});
