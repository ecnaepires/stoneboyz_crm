export const CUSTOMER_KIND_VALUES = ['company', 'person'] as const;
export type CustomerKind = (typeof CUSTOMER_KIND_VALUES)[number];

export const CUSTOMER_STATUS_VALUES = [
  'lead',
  'qualified',
  'active',
  'inactive',
  'churned'
] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUS_VALUES)[number];

export const CUSTOMER_TYPE_VALUES = [
  'prospect',
  'customer',
  'partner',
  'vendor'
] as const;
export type CustomerType = (typeof CUSTOMER_TYPE_VALUES)[number];

export const CONTACT_CHANNEL_VALUES = [
  'email',
  'phone',
  'whatsapp',
  'none'
] as const;
export type ContactChannel = (typeof CONTACT_CHANNEL_VALUES)[number];

export const CUSTOMER_ADDRESS_TYPE_VALUES = [
  'billing',
  'shipping',
  'office',
  'other'
] as const;
export type CustomerAddressType = (typeof CUSTOMER_ADDRESS_TYPE_VALUES)[number];

export const CUSTOMER_SORT_BY_VALUES = [
  'name',
  'createdAt',
  'updatedAt',
  'status'
] as const;
export type CustomerSortBy = (typeof CUSTOMER_SORT_BY_VALUES)[number];

export const SORT_DIRECTION_VALUES = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTION_VALUES)[number];
