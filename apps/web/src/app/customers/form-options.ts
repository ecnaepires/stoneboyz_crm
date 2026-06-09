import {
  CUSTOMER_SOURCE_VALUES,
  CUSTOMER_STATUS_VALUES,
  CUSTOMER_TYPE_VALUES,
  type CustomerSource,
  type CustomerStatus,
  type CustomerType,
} from '@stoneboyz/domain';

export const customerStatusOptions: Array<{ value: CustomerStatus; label: string }> =
  CUSTOMER_STATUS_VALUES.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }));

export const customerTypeOptions: Array<{ value: CustomerType; label: string }> = [
  { value: 'customer', label: 'Customer' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
];

const customerSourceLabels: Record<CustomerSource, string> = {
  referral_contractor: 'Referral - Contractor',
  referral_customer: 'Referral - Customer',
  web_search: 'Web Search',
  walk_in: 'Walk-In',
  review_site: 'Review Site',
  social_media: 'Social Media',
  home_show: 'Home Show',
  other: 'Other',
};

export const customerSourceOptions: Array<{ value: CustomerSource; label: string }> =
  CUSTOMER_SOURCE_VALUES.map((value) => ({
    value,
    label: customerSourceLabels[value],
  }));
